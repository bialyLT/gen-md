import { fal } from "@fal-ai/client";
import type {
  AspectRatio,
  GenerateImageInput,
  ImageProvider,
  ImageResult,
} from "./types";

const DEFAULT_MODEL = "fal-ai/flux/dev";

const FAL_ASPECTS: Record<AspectRatio, string> = {
  "1:1": "square_hd",
  "16:9": "landscape_16_9",
  "4:3": "landscape_4_3",
  "3:2": "landscape_3_2",
};

export class FalProvider implements ImageProvider {
  readonly name = "fal";

  private ensureConfigured() {
    if (!process.env.FAL_KEY) {
      throw new Error("FAL_KEY no configurado");
    }
    fal.config({ credentials: process.env.FAL_KEY });
  }

  async generate(input: GenerateImageInput): Promise<ImageResult[]> {
    this.ensureConfigured();

    const model = (input.model ?? DEFAULT_MODEL) as Parameters<
      typeof fal.subscribe
    >[0];

    const result = await fal.subscribe(model, {
      input: {
        prompt: input.prompt,
        num_images: input.count ?? 1,
        image_size: FAL_ASPECTS[input.aspectRatio ?? "1:1"],
      },
    });

    const images = (
      result.data as { images?: { url: string }[] }
    ).images;
    if (!images?.length) {
      throw new Error("fal.ai no devolvió imágenes");
    }

    return images.map((image) => ({
      provider: this.name,
      model: input.model ?? DEFAULT_MODEL,
      url: image.url,
    }));
  }
}