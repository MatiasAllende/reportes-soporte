"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Semana" },
  { href: "/tecnicos", label: "Técnicos" },
  { href: "/resoluciones", label: "Resoluciones" },
  { href: "/colas", label: "Colas" },
  { href: "/en-vivo", label: "En vivo" },
  { href: "/tendencias", label: "Tendencias" },
  { href: "/admin", label: "Admin" },
];

export function AppShell({
  children,
  weekControl,
  actions,
  projectKey = "Proyecto",
  subtitle = "Métricas de soporte con datos reales de Jira.",
  lastSyncAt,
}: {
  children: React.ReactNode;
  weekControl?: React.ReactNode;
  actions?: React.ReactNode;
  projectKey?: string;
  subtitle?: string;
  lastSyncAt?: string | null;
}) {
  const pathname = usePathname();

  return (
    <div className="bg-atmosphere relative min-h-screen overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 pb-16 pt-8 sm:px-8">
        <header className="animate-fade flex flex-col gap-6 border-b border-[var(--line)] pb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-green uppercase">
                Proyecto {projectKey}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-5xl leading-none font-extrabold tracking-tight text-green sm:text-6xl">
                {projectKey}
              </h1>
              <p className="mt-3 max-w-md text-base text-ink-soft">{subtitle}</p>
              {lastSyncAt ? (
                <p className="mt-2 text-xs text-ink-soft/80">
                  Última sync:{" "}
                  {new Date(lastSyncAt).toLocaleString("es-AR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              ) : (
                <p className="mt-2 text-xs text-ink-soft/80">
                  Todavía no hay semanas sincronizadas.
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              {weekControl}
              {actions}
            </div>
          </div>

          <nav className="flex flex-wrap gap-1" aria-label="Secciones">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-semibold transition-colors ${
                    active ? "text-ink" : "text-ink-soft/70 hover:text-ink"
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute inset-x-3 -bottom-[1px] h-0.5 origin-left rounded-full bg-green transition-transform duration-300 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 pt-8">{children}</main>

        <footer className="mt-12 border-t border-[var(--line)] pt-4 text-xs text-ink-soft/80">
          {projectKey} · datos locales en SQLite · sincronización manual con Jira Cloud.
        </footer>
      </div>
    </div>
  );
}
