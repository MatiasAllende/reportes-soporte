"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { Technician } from "@/lib/types";

export default function AdminPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/technicians", { cache: "no-store" });
      const json = (await res.json()) as { technicians: Technician[] };
      setTechnicians(json.technicians);
    } catch {
      setError("No se pudieron cargar los técnicos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncFromJira() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/technicians/sync", { method: "POST" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        accepted?: number;
        technicians?: Technician[];
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "No se pudo actualizar");
      }
      setTechnicians(json.technicians ?? []);
      setMessage(`Lista actualizada: ${json.accepted} técnicos asignables en Jira.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell subtitle="El padrón sale de los usuarios asignables del proyecto en Jira.">
      <section className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
              Técnicos
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Actualizá la lista desde Jira. Quien deje de ser asignable en el
              proyecto se elimina.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncFromJira()}
            className="rounded-md bg-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-dark disabled:opacity-50"
          >
            {busy ? "Actualizando…" : "Actualizar técnicos desde Jira"}
          </button>
        </div>

        {message ? <p className="text-sm text-green">{message}</p> : null}
        {error ? <p className="text-sm text-amber">{error}</p> : null}

        {loading ? (
          <p className="text-ink-soft">Cargando técnicos…</p>
        ) : technicians.length === 0 ? (
          <p className="text-ink-soft">Todavía no hay técnicos. Actualizá desde Jira.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] tracking-[0.14em] text-ink-soft uppercase">
                  <th className="py-3 pr-4 font-semibold">Nombre</th>
                  <th className="py-3 font-semibold">accountId</th>
                </tr>
              </thead>
              <tbody>
                {technicians.map((tech) => (
                  <tr key={tech.id} className="border-b border-[var(--line)] last:border-none">
                    <td className="py-3.5 pr-4 font-semibold text-ink">
                      <Link href={`/tecnicos/${tech.id}`} className="hover:text-green hover:underline">
                        {tech.name}
                      </Link>
                    </td>
                    <td className="py-3.5 font-mono text-xs text-ink-soft">{tech.accountId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
