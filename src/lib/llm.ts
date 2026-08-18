import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const baseURL = process.env.LLM_BASE_URL ?? "";
const apiKey = process.env.LLM_API_KEY ?? "";
const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

const isGoogle =
  baseURL.includes("generativelanguage.googleapis.com") ||
  (baseURL === "" && model.toLowerCase().startsWith("gemini"));

const provider = isGoogle
  ? createGoogleGenerativeAI({
      apiKey,
      baseURL: baseURL
        ? baseURL.replace(/\/openai\/?$/, "").replace(/\/+$/, "")
        : undefined,
    })
  : createOpenAI({
      apiKey,
      baseURL: baseURL || "https://api.openai.com/v1",
    });

export function getModel() {
  return provider.chat(model);
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}