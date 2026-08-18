import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 }
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos inválidos",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "El email ya está registrado" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json(
    { user, message: "Cuenta creada. Ahora inicia sesión." },
    { status: 201 }
  );
}