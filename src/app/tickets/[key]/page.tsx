"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

type IssueDetail = {
  key: string;
  summary: string;
  status: string;
  resolution: string | null;
  assignee: string | null;
  history: { at: string; field: string; from: string | null; to: string | null }[];
};

type SlaCycle = {
  name: string;
  breached: boolean;
  ongoing: boolean;
  elapsedMillis: number | null;
};

function fieldLabel(field: string): string {
  if (field === "status") return "Estado";
  if (field === "resolution") return "Resolución";
  return "Asignado";
}

function formatDuration(millis: number | null): string {
  if (millis === null) return "—";
  const minutes = Math.round(millis / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export default function TicketPage() {
  const params = useParams<{ key: string }>();
  const key = decodeURIComponent(params.key);
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [slas, setSlas] = useState<SlaCycle[]>([]);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/tickets/${encodeURIComponent(key)}`, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as {
          issue?: IssueDetail;
          slas?: SlaCycle[];
          url?: string;
          error?: string;
        };
        if (!res.ok || !json.issue) throw new Error(json.error || "No se encontró el ticket");
        setIssue(json.issue);
        setSlas(json.slas ?? []);
        setUrl(json.url ?? null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Error"));
  }, [key]);

  return (
    <AppShell subtitle="Detalle, SLA e historial del ticket.">
      <section className="space-y-8">
        <Link href="/colas" className="text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase hover:text-green">
          ← Colas
        </Link>
        {error ? <p className="text-amber">{error}</p> : null}
        {!issue && !error ? <p className="text-ink-soft">Cargando ticket…</p> : null}
        {issue ? (
          <>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-green">
                {issue.key}
              </h2>
              <p className="mt-2 text-lg text-ink">{issue.summary}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {issue.status} · {issue.resolution ?? "Sin resolución"} · {issue.assignee ?? "Sin asignar"}
              </p>
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-green hover:underline">
                  Abrir en Jira
                </a>
              ) : null}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">SLA</h3>
              {slas.length === 0 ? (
                <p className="text-sm text-ink-soft">Este ticket no tiene SLA de JSM.</p>
              ) : (
                <ul className="space-y-2">
                  {slas.map((cycle, index) => (
                    <li key={`${cycle.name}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] py-2 text-sm">
                      <span className="font-semibold text-ink">
                        {cycle.name}
                        <span className="ml-2 font-normal text-ink-soft">
                          {cycle.ongoing ? "en curso" : "cerrado"}
                        </span>
                      </span>
                      <span className={cycle.breached ? "font-semibold text-amber" : "font-semibold text-green"}>
                        {cycle.breached ? "Vencido" : "Cumplido"} · {formatDuration(cycle.elapsedMillis)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">Historial</h3>
              {issue.history.length === 0 ? (
                <p className="text-sm text-ink-soft">Sin cambios de estado o asignación.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {issue.history.map((item, index) => (
                    <li key={`${item.at}-${index}`} className="border-b border-[var(--line)] py-2">
                      <p className="font-semibold text-ink">
                        {fieldLabel(item.field)}: {item.from ?? "—"} → {item.to ?? "—"}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {new Date(item.at).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
