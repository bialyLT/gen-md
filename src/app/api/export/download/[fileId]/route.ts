import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ fileId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.res;

  const { fileId } = await ctx.params;
  const file = await prisma.generatedFile.findUnique({ where: { id: fileId } });

  if (!file || file.userId !== auth.data.userId) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}