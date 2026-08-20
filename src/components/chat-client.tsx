"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { stripMarkdown } from "@/lib/text";
import { convertLatex } from "@/lib/latex";

interface Props {
  chatId: string;
  initialMessages: { id: string; role: "user" | "assistant"; text: string }[];
}

export function ChatClient({ chatId, initialMessages }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error, clearError } = useChat<UIMessage>({
    id: chatId,
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text", text: m.text }],
    })) satisfies UIMessage[],
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { chatId },
    }),
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const autoDownloaded = useRef<Set<string>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";
  const prevLoading = useRef(isLoading);

  useEffect(() => {
    if (prevLoading.current && !isLoading) {
      router.refresh();
    }
    prevLoading.current = isLoading;
  }, [isLoading, router]);

function cleanPart(text: string): string {
  return stripMarkdown(convertLatex(text));
}

  async function downloadFile(fileId: string, filename: string) {
    setDownloading(fileId);
    try {
      const res = await fetch(`/api/export/download/${fileId}`, {
        method: "GET",
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        const toolName =
          part.type === "dynamic-tool"
            ? part.toolName
            : part.type.replace("tool-", "");
        if (toolName !== "generar_archivo") continue;
        if (part.state !== "output-available" || !part.output) continue;
        const file = part.output as
          | { fileId?: string; filename?: string }
          | undefined;
        if (!file?.fileId) continue;
        if (autoDownloaded.current.has(file.fileId)) continue;
        autoDownloaded.current.add(file.fileId);
        downloadFile(file.fileId, file.filename ?? "material_didactico");
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Contame qué material didáctico necesitás para tus alumnos.
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-[80%] sm:px-4 sm:py-3 ${
                message.role === "user"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "bg-zinc-100 dark:bg-zinc-900"
              }`}
            >
              {message.parts.map((part, i) => {
                if (isTextUIPart(part)) {
                  return <div key={i}>{cleanPart(part.text)}</div>;
                }
                if (isToolUIPart(part)) {
                  const toolName =
                    part.type === "dynamic-tool"
                      ? part.toolName
                      : part.type.replace("tool-", "");
                  const imageUrls =
                    part.state === "output-available"
                      ? (part.output as { urls?: string[] } | undefined)?.urls
                      : undefined;
                  if (toolName === "generar_archivo") {
                    const file = part.output as
                      | { fileId?: string; filename?: string }
                      | undefined;
                    return (
                      <div key={i} className="my-2">
                        {part.state !== "output-available" ? (
                          <p className="text-xs text-zinc-500">
                            Generando archivo...
                          </p>
                        ) : file?.fileId ? (
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                📄 {file.filename ?? "Material"}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {file.filename?.endsWith(".pdf")
                                  ? "Documento PDF"
                                  : "Presentación PowerPoint"}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                file.fileId &&
                                downloadFile(file.fileId, file.filename ?? "material")
                              }
                              disabled={downloading !== null}
                              className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                              {downloading === file.fileId
                                ? "Descargando..."
                                : "Descargar"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="my-2">
                      <p className="text-xs text-zinc-500">
                        🔧 Herramienta: {toolName}
                      </p>
                      {imageUrls && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {imageUrls.map((url: string, j: number) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={j}
                              src={url}
                              alt="Imagen generada"
                              className="h-40 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <span>Error al generar la respuesta. Revisá tu plan y límites.</span>
          <button onClick={clearError} className="underline">
            Cerrar
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="border-t border-zinc-200 p-3 sm:p-4 dark:border-zinc-800"
      >
        <div className="flex gap-2 sm:gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu pedido de material didáctico..."
            className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-zinc-500 sm:py-2.5 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-40 sm:px-6 sm:py-2.5 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {isLoading ? "..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}