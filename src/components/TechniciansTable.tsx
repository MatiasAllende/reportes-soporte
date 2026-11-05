import Link from "next/link";
import type { WeekSnapshot } from "@/lib/types";

export function TechniciansTable({
  week,
  names,
}: {
  week: WeekSnapshot;
  names: Record<string, string>;
}) {
  const rows = [...week.byTechnician].sort((a, b) => b.resolved - a.resolved);

  return (
    <div className="animate-rise delay-3 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-[11px] tracking-[0.14em] text-ink-soft uppercase">
            <th className="py-3 pr-4 font-semibold">Técnico</th>
            <th className="py-3 pr-4 font-semibold">Resueltos</th>
            <th className="py-3 pr-4 font-semibold">Abiertos</th>
            <th className="py-3 pr-4 font-semibold">Creados asig.</th>
            <th className="py-3 font-semibold">Resolución media</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[var(--line)] last:border-none"
            >
              <td className="py-3.5 pr-4 font-semibold text-ink">
                <Link
                  href={`/tecnicos/${row.id}`}
                  className="hover:text-green hover:underline"
                >
                  {names[row.id] ?? row.id}
                </Link>
              </td>
              <td className="py-3.5 pr-4 text-green">{row.resolved}</td>
              <td className="py-3.5 pr-4">{row.open}</td>
              <td className="py-3.5 pr-4">{row.created}</td>
              <td className="py-3.5">{row.avgResolutionDays.toFixed(1)} d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
