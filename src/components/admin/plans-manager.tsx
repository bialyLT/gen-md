"use client";

import { useCallback, useEffect, useState } from "react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceArs: number;
  frequency: number;
  mpPlanInitPoint: string | null;
  mpPlanId: string | null;
  active: boolean;
  sortOrder: number;
}

interface PlanForm {
  name: string;
  description: string;
  priceArs: string;
  frequency: string;
  mpPlanInitPoint: string;
  active: boolean;
  sortOrder: string;
}

const EMPTY_FORM: PlanForm = {
  name: "",
  description: "",
  priceArs: "",
  frequency: "1",
  mpPlanInitPoint: "",
  active: true,
  sortOrder: "0",
};

function toForm(p: Plan): PlanForm {
  return {
    name: p.name,
    description: p.description ?? "",
    priceArs: String(p.priceArs),
    frequency: String(p.frequency),
    mpPlanInitPoint: p.mpPlanInitPoint ?? "",
    active: p.active,
    sortOrder: String(p.sortOrder),
  };
}

export function PlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<PlanForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/plans");
      const data = (await res.json()) as { plans?: Plan[] };
      setPlans(data.plans ?? []);
    } catch {
      setError("No se pudieron cargar los planes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((res) => res.json())
      .then((data) => {
        setPlans((data.plans ?? []) as Plan[]);
        setLoading(false);
      })
      .catch(() => {
        setError("No se pudieron cargar los planes");
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    const payload = {
      name: form.name,
      description: form.description || null,
      priceArs: Number(form.priceArs),
      frequency: Number(form.frequency) || 1,
      mpPlanInitPoint: form.mpPlanInitPoint || null,
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    };

    const url = editingId
      ? `/api/admin/plans/${editingId}`
      : "/api/admin/plans";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; plan?: Plan };
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el plan");
      return;
    }
    setForm(null);
    setEditingId(null);
    void load();
  }

  async function toggleActive(plan: Plan) {
    await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toForm(plan), active: !plan.active }),
    });
    void load();
  }

  async function remove(plan: Plan) {
    if (!confirm(`¿Eliminar el plan "${plan.name}"?`)) return;
    await fetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
    void load();
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setForm(toForm(plan));
    setError(null);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  if (loading) return <p className="text-sm text-zinc-400">Cargando…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planes de suscripción</h1>
        {!form && (
          <button
            onClick={startNew}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-black"
          >
            Crear plan
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {form && (
        <form
          onSubmit={save}
          className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h2 className="mb-4 text-sm font-medium text-zinc-500">
            {editingId ? "Editar plan" : "Nuevo plan"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Nombre
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Precio (ARS)
              <input
                required
                type="number"
                min={1}
                value={form.priceArs}
                onChange={(e) => setForm({ ...form, priceArs: e.target.value })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2">
              Descripción
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Frecuencia (meses)
              <input
                type="number"
                min={1}
                max={12}
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: e.target.value })
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Link del plan en Mercado Pago
              <input
                placeholder="https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=..."
                value={form.mpPlanInitPoint}
                onChange={(e) =>
                  setForm({ ...form, mpPlanInitPoint: e.target.value })
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Orden
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4"
              />
              Activo
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-black"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setEditingId(null);
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-400 dark:border-zinc-800">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Frecuencia</th>
              <th className="px-4 py-3 font-medium">Link MP</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {plans.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  Todavía no hay planes. Creá el primero.
                </td>
              </tr>
            )}
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-3 font-medium">{plan.name}</td>
                <td className="px-4 py-3">$ {plan.priceArs.toLocaleString("es-AR")}</td>
                <td className="px-4 py-3">cada {plan.frequency} mes(es)</td>
                <td className="max-w-[260px] truncate px-4 py-3 text-xs text-zinc-400">
                  {plan.mpPlanInitPoint ? (
                    <a
                      href={plan.mpPlanInitPoint}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline dark:text-blue-400"
                    >
                      link
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(plan)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      plan.active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {plan.active ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(plan)}
                    className="mr-2 text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(plan)}
                    className="text-xs text-red-600 underline hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}