import { FalProvider } from "./fal";
import { GoogleProvider } from "./google";
import { storeImage } from "./storage";
import type { GenerateImageInput, ImageResult, ImageProvider } from "./types";

const providers = new Map<string, ImageProvider>([
  ["fal", new FalProvider()],
  ["google", new GoogleProvider()],
]);

export function getProvider(name: string): ImageProvider {
  const provider = providers.get(name);
  if (!provider) {
    throw new Error(`Proveedor de imágenes desconocido: ${name}`);
  }
  return provider;
}

export async function generateImages(
  providerName: string,
  input: GenerateImageInput
): Promise<ImageResult[]> {
  const provider = getProvider(providerName);
  const results = await provider.generate(input);

  const stored: ImageResult[] = [];
  for (const result of results) {
    let url = result.url;
    if (result.bytes) {
      url = await storeImage(result.bytes);
    }
    if (!url) {
      throw new Error("La imagen no tiene URL ni bytes");
    }
    stored.push({ ...result, url });
  }
  return stored;
}