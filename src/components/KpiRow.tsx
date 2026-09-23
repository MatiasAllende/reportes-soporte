function formatDelta(value: number | null): string | null {
  if (value === null) return null;
  if (value === 0) return "igual";
  return value > 0 ? `+${value} vs ant.` : `${value} vs ant.`;
}

export function KpiRow({
  items,
}: {
  items: {
    label: string;
    value: number | string;
    hint?: string;
    delta?: number | null;
    tone?: "default" | "good" | "warn";
  }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => {
        const deltaLabel = formatDelta(item.delta ?? null);
        const toneClass =
          item.tone === "good"
            ? "text-teal"
            : item.tone === "warn"
              ? "text-amber"
              : "text-ink";

        return (
          <div
            key={item.label}
            className={`animate-rise delay-${index + 1} border-t-2 border-teal/40 pt-4`}
          >
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              {item.label}
            </p>
            <p
              className={`mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight ${toneClass}`}
            >
              {item.value}
            </p>
            {item.hint ? (
              <p className="mt-1 text-sm text-ink-soft">{item.hint}</p>
            ) : null}
            {deltaLabel ? (
              <p className="mt-1 text-xs font-medium text-ink-soft/80">
                {deltaLabel}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
