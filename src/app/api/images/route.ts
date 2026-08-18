import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { consumeQuota } from "@/lib/quota";
import { generateImages } from "@/lib/image-providers";
import { getPlanConfig } from "@/lib/plans";

const imageRequestSchema = z.object({
  prompt: z.string().min(3).max(2000),
  count: z.number().int().min(1).max(4).default(1),
  chatId: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = imageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Prompt inválido", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { prompt, count, chatId } = parsed.data;

  if (chatId) {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || chat.userId !== auth.data.userId) {
      return NextResponse.json(
        { error: "Chat no encontrado o no autorizado" },
        { status: 404 }
      );
    }
  }

  const quota = await consumeQuota(auth.data.userId, auth.data.plan, "IMAGE");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "Alcanzaste el límite de imágenes de tu plan.", quota },
      { status: 429 }
    );
  }

  const planConfig = getPlanConfig(auth.data.plan);

  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "La generación de imágenes está desactivada: no hay FAL_KEY configurada." },
      { status: 503 }
    );
  }

  const images = await generateImages(planConfig.image.provider, {
    prompt,
    count,
    model: planConfig.image.model,
    aspectRatio: "4:3",
  });

  await prisma.imageGeneration.createMany({
    data: images.map((img) => ({
      userId: auth.data.userId,
      chatId: chatId ?? null,
      provider: img.provider,
      model: img.model,
      prompt,
      imageUrl: img.url ?? "",
    })),
  });

  return NextResponse.json({
    images: images.map((img) => ({ url: img.url, provider: img.provider })),
    quota,
  });
}