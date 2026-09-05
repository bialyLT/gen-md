import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChatClient } from "@/components/chat-client";
import { DeleteChatButton } from "@/components/delete-chat-button";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const chat = await prisma.chat.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!chat || chat.userId !== session.user.id) redirect("/dashboard");

  return (
    <div className="flex h-full flex-1 flex-col bg-white">
      <header className="flex items-center justify-between border-b border-sky-100 bg-sky-50/70 px-3 py-2.5 sm:px-4 sm:py-3">
        <Link href="/dashboard" className="text-sm text-sky-700 hover:underline">
          ← Panel
        </Link>
        <h1 className="truncate px-2 font-medium sm:px-4">{chat.title}</h1>
        <DeleteChatButton chatId={chat.id} inChat compact />
      </header>
      <ChatClient
        chatId={chat.id}
        initialMessages={chat.messages.map((m) => ({
          id: m.id,
          role: m.role === "USER" ? "user" : "assistant",
          text: m.content,
        }))}
      />
    </div>
  );
}