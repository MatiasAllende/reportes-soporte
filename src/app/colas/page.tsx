"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type Queue = { id: string; name: string; issueCount: number };
type QueueIssue = {
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
  breached: boolean;
};

export default function ColasPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [issues, setIssues] = useState<QueueIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingIssues, setLoadingIssues] = useState(false);

  useEffect(() => {
    void fetch("/api/queues", { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { queues?: Queue[]; error?: string };
        if (!res.ok) throw new Error(json.error || "No se pudieron leer las colas");
        setQueues(json.queues ?? []);
        if (json.queues?.[0]) setSelected(json.queues[0].id);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error");
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingIssues(true);
    setError(null);
    void fetch(`/api/queues/${selected}`, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { issues?: QueueIssue[]; error?: string };
        if (!res.ok) throw new Error(json.error || "No se pudo leer la cola");
        setIssues(json.issues ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => setLoadingIssues(false));
  }, [selected]);

  return (
    <AppShell subtitle="Colas de Jira Service Management, con el estado de SLA de cada ticket.">
      <section className="space-y-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
          Colas
        </h2>
        {error ? <p className="text-sm text-amber">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          {queues.map((queue) => (
            <button
              key={queue.id}
              type="button"
              onClick={() => setSelected(queue.id)}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                selected === queue.id
                  ? "border-green bg-green text-white"
                  : "border-[var(--line)] bg-white text-ink"
              }`}
            >
              {queue.name}
              <span className="ml-2 text-xs opacity-80">{queue.issueCount}</span>
            </button>
          ))}
        </div>
        {loadingIssues ? (
          <p className="text-ink-soft">Cargando tickets…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] tracking-[0.14em] text-ink-soft uppercase">
                  <th className="py-3 pr-4 font-semibold">Ticket</th>
                  <th className="py-3 pr-4 font-semibold">Estado</th>
                  <th className="py-3 pr-4 font-semibold">Asignado</th>
                  <th className="py-3 font-semibold">SLA</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.key} className="border-b border-[var(--line)] last:border-none">
                    <td className="py-3.5 pr-4">
                      <Link href={`/tickets/${issue.key}`} className="font-semibold text-green hover:underline">
                        {issue.key}
                      </Link>
                      <p className="text-ink">{issue.summary}</p>
                    </td>
                    <td className="py-3.5 pr-4">{issue.status}</td>
                    <td className="py-3.5 pr-4">{issue.assignee ?? "Sin asignar"}</td>
                    <td className={`py-3.5 font-semibold ${issue.breached ? "text-amber" : "text-green"}`}>
                      {issue.breached ? "Vencido" : "En curso"}
                    </td>
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
