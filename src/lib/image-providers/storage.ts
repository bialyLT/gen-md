import { put } from "@vercel/blob";

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/**
 * Sube una imagen al CDN (Vercel Blob) y devuelve su URL pública.
 * Sin token configurado (desarrollo) devuelve un data URL.
 */
export async function storeImage(
  bytes: Uint8Array,
  { ext = "png" }: { ext?: string } = {}
): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    const base64 = Buffer.from(bytes).toString("base64");
    const mime = MIME_BY_EXT[ext] ?? MIME_BY_EXT.png;
    return `data:${mime};base64,${base64}`;
  }

  const key = `generated/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const blob = new Blob([Uint8Array.from(bytes)], {
    type: MIME_BY_EXT[ext] ?? MIME_BY_EXT.png,
  });
  const { url } = await put(key, blob, {
    access: "public",
    contentType: MIME_BY_EXT[ext] ?? MIME_BY_EXT.png,
  });
  return url;
}