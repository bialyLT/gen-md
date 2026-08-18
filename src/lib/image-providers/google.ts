import { GoogleGenAI } from "@google/genai";
import type {
  AspectRatio,
  GenerateImageInput,
  ImageProvider,
  ImageResult,
} from "./types";

/**
 * Google Gemini Nano Banana (gemini-3.1-flash-image).
 * Cableado pero desactivado por defecto: se activa cambiando el provider
 * en el plan o en el registry (src/lib/image-providers/index.ts).
 */
const DEFAULT_MODEL = "gemini-3.1-flash-image";

const GOOGLE_ASPECTS: Record<AspectRatio, string> = {
  "1:1": "1:1",
  "16:9": "16:9",
  "4:3": "4:3",
  "3:2": "3:2",
};

export class GoogleProvider implements ImageProvider {
  readonly name = "google";

  private ensureConfigured() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY no configurado");
    }
  }

  async generate(input: GenerateImageInput): Promise<ImageResult[]> {
    this.ensureConfigured();

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    const response = await ai.models.generateImages({
      model: input.model ?? DEFAULT_MODEL,
      prompt: input.prompt,
      config: {
        numberOfImages: input.count ?? 1,
        aspectRatio: GOOGLE_ASPECTS[input.aspectRatio ?? "1:1"],
      },
    });

    const images = response.generatedImages ?? [];
    if (!images.length) {
      throw new Error("Google no devolvió imágenes");
    }

    return images.map((img) => {
      const b64 = img.image?.imageBytes;
      if (!b64) {
        throw new Error("Google no devolvió bytes de imagen");
      }
      return {
        provider: this.name,
        model: input.model ?? DEFAULT_MODEL,
        bytes: Buffer.from(b64, "base64"),
      };
    });
  }
}