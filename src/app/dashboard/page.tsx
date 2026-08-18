import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { NewChatButton } from "@/components/new-chat-button";
import { LogoutButton } from "@/components/logout-button";
import { DeleteChatButton } from "@/components/delete-chat-button";
import { UpgradeButton } from "@/components/upgrade-button";
import { CheckoutActivator } from "@/components/checkout-activator";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [chats, usage, plans] = await Promise.all([
    prisma.chat.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    }),
    prisma.usageRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.pricingPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const plan = session.user.plan ?? "FREE";
  const limits = PLANS[plan].limits;

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <aside className="hidden w-64 flex-col border-r border-zinc-200 p-4 dark:border-zinc-800 md:flex">
        <Link href="/" className="mb-6 text-lg font-semibold">
          Material Didáctico
        </Link>
        <div className="flex flex-col gap-2">
          {chats.map((chat) => (
            <div key={chat.id} className="group relative flex items-center">
              <Link
                href={`/chat/${chat.id}`}
                className="flex-1 truncate rounded-lg px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {chat.title}
              </Link>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100">
                <DeleteChatButton chatId={chat.id} compact />
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-6">
        <CheckoutActivator />
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Panel</h1>
            <p className="text-sm text-zinc-500">
              Plan {plan === "PRO" ? "Pro" : "Gratis"} ·{" "}
              {session.user.email}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <NewChatButton />
            <LogoutButton />
          </div>
        </div>

        {plan === "FREE" && plans.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-zinc-500">
              Elegí tu plan
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    ${p.priceArs.toLocaleString("es-AR")}
                    <span className="text-sm font-normal text-zinc-400">
                      {" "}
                      / {p.frequency} mes(es)
                    </span>
                  </p>
                  {p.description && (
                    <p className="mt-2 flex-1 text-sm text-zinc-500">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-4">
                    <UpgradeButton planId={p.id} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-medium text-zinc-500">
            Tu uso de hoy
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(
              [
                ["GENERATION", "Generaciones"],
                ["IMAGE", "Imágenes"],
                ["CHAT_MESSAGE", "Mensajes"],
              ] as const
            ).map(([kind, label]) => {
              const record = usage.find((u) => u.kind === kind);
              const limit = limits[kind]?.limit ?? 0;
              return (
                <div key={kind}>
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="text-xl font-semibold">
                    {record?.count ?? 0}
                    <span className="text-sm font-normal text-zinc-400">
                      {" "}
                      / {limit}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-500">
            Tus proyectos
          </h2>
          {chats.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Todavía no tenés proyectos. Creá uno para empezar.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="group relative rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
                >
                  <Link href={`/chat/${chat.id}`} className="block">
                    <p className="truncate pr-8 font-medium">{chat.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {chat._count.messages} mensajes
                    </p>
                  </Link>
                  <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
                    <DeleteChatButton chatId={chat.id} compact />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}