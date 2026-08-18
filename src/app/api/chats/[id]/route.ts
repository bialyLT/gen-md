import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const renameSchema = z.object({
  title: z.string().min(1).max(120),
});

async function getOwnedChat(userId: string, chatId: string) {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.userId !== userId) return null;
  return chat;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { id } = await ctx.params;
  const chat = await getOwnedChat(auth.data.userId, id);
  if (!chat) {
    return NextResponse.json(
      { error: "Chat no encontrado o no autorizado" },
      { status: 404 }
    );
  }

  const messages = await prisma.message.findMany({
    where: { chatId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ chat, messages });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { id } = await ctx.params;
  const chat = await getOwnedChat(auth.data.userId, id);
  if (!chat) {
    return NextResponse.json(
      { error: "Chat no encontrado o no autorizado" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Título inválido", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updated = await prisma.chat.update({
    where: { id },
    data: { title: parsed.data.title },
  });

  return NextResponse.json({ chat: updated });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { id } = await ctx.params;
  const chat = await getOwnedChat(auth.data.userId, id);
  if (!chat) {
    return NextResponse.json(
      { error: "Chat no encontrado o no autorizado" },
      { status: 404 }
    );
  }

  await prisma.chat.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}