import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const createChatSchema = z.object({
  title: z.string().min(1).max(120).default("Nuevo proyecto"),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const chats = await prisma.chat.findMany({
    where: { userId: auth.data.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ chats });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = createChatSchema.safeParse(body);
  const title = parsed.success ? parsed.data.title : "Nuevo proyecto";

  const chat = await prisma.chat.create({
    data: { userId: auth.data.userId, title },
  });

  return NextResponse.json({ chat }, { status: 201 });
}