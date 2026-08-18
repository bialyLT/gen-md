import {
  streamText,
  tool,
  generateText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  isStepCount,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { consumeQuota } from "@/lib/quota";
import { getModel, isLlmConfigured } from "@/lib/llm";
import {
  generatePdfBuffer,
  generatePptxBuffer,
  sanitizeFilename,
} from "@/lib/exports";

const chatRequestSchema = z.object({
  chatId: z.string().min(1),
  messages: z.array(
    z.object({
      id: z.string().optional(),
      role: z.enum(["user", "assistant"]),
      parts: z
        .array(
          z.object({
            type: z.string(),
            text: z.string().optional(),
          })
        )
        .optional(),
      text: z.string().optional(),
    })
  ),
});

function getLastUserText(
  messages: z.infer<typeof chatRequestSchema>["messages"]
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const textPart = m.parts?.find((p) => p.type === "text")?.text;
    if (textPart) return textPart;
    if (m.text) return m.text;
  }
  return "";
}

const SYSTEM_PROMPT = `Eres un asistente experto en pedagogía que ayuda a maestros y profesores a crear material didáctico de alta calidad.

Tu trabajo es:
1. Ayudar al docente a diseñar y redactar material didáctico (guías, planes de clase, ejercicios, evaluaciones, actividades).
2. Adaptar el contenido al nivel, materia y contexto que indique el docente.
3. Usar lenguaje claro, estructurado y apropiado para el público objetivo (alumnos).
4. Ofrecer formatos: texto estructurado listo para convertir a PDF, PPT o imagen.

REGLAS SOBRE GENERACIÓN DE ARCHIVOS (PDF / PPT):
- Cuando el docente pida material como ARCHIVO (ej: "guion", "prueba", "evaluación", "plan de clase en pdf", "presentación en ppt", "apunte"), llamá a la herramienta "generar_archivo" pasándole TODO el contenido completo del material.
- En tu mensaje de chat NO vuelques el contenido completo: escribí solo una confirmación breve (ej: "Listo, descargá tu PDF con el guion completo: incluye 12 escenas y diálogos") y un resumen de una línea de lo que contiene.
- Estructurá el contenido del archivo según el formato:
  - pptx: diapositivas separadas por una línea "---"; cada una con título "# Título" y viñetas "- ..." (máximo 5-6 ideas por slide). Si corresponde, agregá al final "## Notas para el docente".
  - pdf: markdown claro con títulos "#"/"##", listas con "- " y secciones numeradas. Si el docente pide que cada parte/prueba/tema vaya en su propia página, separá las secciones con una línea que contenga solo "===" para forzar salto de página.
- Si el docente NO pide un archivo, respondé el material directamente en el chat (encabezados y listas).

REGLAS SOBRE PREGUNTAS DE CLARIFICACIÓN:
- Si el pedido del docente es ambiguo o le falta contexto clave, NO generes el material directamente: primero hacé preguntas para precisar.
- Preguntá SOLO lo que realmente falta y sea relevante. Contexto clave típico: materia/tema, nivel educativo (grado y edad de los alumnos), formato deseado (guía, plan de clase, ejercicios, evaluación, PPT), extensión/duración, y cantidad de alumnos si afecta el diseño.
- Hacé máximo 3 preguntas a la vez, numeradas y en formato conciso.
- Cuando el docente ya haya respondido, generá el material completo sin volver a preguntar.
- No hagas preguntas innecesarias: si el pedido ya es claro y completo, generá el material directamente.

Sé didáctico, específico y profesional.`;

const DEFAULT_CHAT_TITLE = "Nuevo proyecto";

/** Genera un título corto con el tema del pedido, sin repetir el prompt. */
async function generateChatTitle(userText: string): Promise<string> {
  const fallback = () => {
    const clean = userText.trim().slice(0, 60);
    return clean || "Proyecto";
  };

  if (!isLlmConfigured()) return fallback();

  try {
    const { text } = await generateText({
      model: getModel(),
      system:
        "Sos un asistente que nombra proyectos de material didáctico. Generás títulos cortos (máximo 6 palabras, en español) que resuman el TEMA del pedido, sin repetir el texto literal.",
      prompt: `Generá un título corto que resuma el tema de este pedido de material didáctico. Respondé solo con el título, sin comillas ni puntos:\n\n"${userText.slice(
        0,
        500
      )}"`,
    });
    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 60);
    return title || fallback();
  } catch (err) {
    console.error("Error generando título:", err);
    return fallback();
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  if (!isLlmConfigured()) {
    return NextResponse.json(
      { error: "LLM_API_KEY no configurada. Define el proveedor de chat en .env" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { chatId, messages } = parsed.data;

  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== auth.data.userId) {
    return NextResponse.json(
      { error: "Chat no encontrado o no autorizado" },
      { status: 404 }
    );
  }

  const quota = await consumeQuota(auth.data.userId, auth.data.plan, "CHAT_MESSAGE");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "Alcanzaste el límite de mensajes de tu plan.",
        quota,
      },
      { status: 429 }
    );
  }

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages as UIMessage[]),
    tools: {
      generar_archivo: tool({
        description:
          "Genera un archivo PDF o PPTX con el material didáctico completo. Usala cuando el docente pida un material como archivo (guion, prueba, evaluación, plan de clase, presentación, apunte).",
        inputSchema: z.object({
          format: z.enum(["pdf", "pptx"]).describe("Formato del archivo"),
          title: z
            .string()
            .min(1)
            .max(120)
            .describe("Título del material (ej: 'Guion de teatro - 5to grado')"),
          content: z
            .string()
            .min(1)
            .describe(
              "Contenido COMPLETO del material. Para pdf: markdown con títulos #/##, listas - y secciones numeradas. Para pptx: diapositivas separadas por '---', cada una con título '# ...' y viñetas '- ...'."
            ),
        }),
        execute: async ({ format, title, content }) => {
          const buffer =
            format === "pdf"
              ? await generatePdfBuffer(content, title)
              : await generatePptxBuffer(content, title);
          const filename = `${sanitizeFilename(title)}.${format === "pdf" ? "pdf" : "pptx"}`;
          const contentType =
            format === "pdf"
              ? "application/pdf"
              : "application/vnd.openxmlformats-officedocument.presentationml.presentation";

          const file = await prisma.generatedFile.create({
            data: {
              userId: auth.data.userId,
              chatId,
              format,
              filename,
              contentType,
              data: Uint8Array.from(buffer),
            },
          });

          return { fileId: file.id, filename };
        },
      }),
    },
    stopWhen: isStepCount(5),
    onFinish: async ({ text }) => {
      if (!text) return;
      const userText = getLastUserText(messages);
      await prisma.$transaction([
        prisma.message.create({
          data: {
            chatId,
            role: "USER",
            content: userText,
          },
        }),
        prisma.message.create({
          data: { chatId, role: "ASSISTANT", content: text },
        }),
        prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        }),
      ]);

      if (chat.title === DEFAULT_CHAT_TITLE && userText) {
        const title = await generateChatTitle(userText);
        await prisma.chat.update({
          where: { id: chatId },
          data: { title },
        });
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}