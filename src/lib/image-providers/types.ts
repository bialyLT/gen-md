export type AspectRatio = "1:1" | "16:9" | "4:3" | "3:2";

export interface GenerateImageInput {
  prompt: string;
  count?: number;
  aspectRatio?: AspectRatio;
  /** Model override (e.g. "fal-ai/flux/dev" o "gemini-3.1-flash-image") */
  model?: string;
}

export interface ImageResult {
  provider: string;
  model: string;
  /** Bytes de la imagen (preferido). Se sube al CDN. */
  bytes?: Uint8Array;
  /** URL directa (cuando el proveedor ya la entrega, ej. fal.ai). */
  url?: string;
}

export interface ImageProvider {
  readonly name: string;
  generate(input: GenerateImageInput): Promise<ImageResult[]>;
}