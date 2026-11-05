export type ResolutionTicket = {
  key: string;
  summary: string;
  resolution: string;
  resolvedAt: string;
  accountId: string | null;
};

export type ResolutionRankRow = {
  id: string;
  name: string;
  resolved: number;
  avgResolutionDays: number;
  byResolution: { name: string; count: number }[];
  tickets: ResolutionTicket[];
};

function tieLabel(row: { id: string; name?: string }): string {
  return row.name?.trim() || row.id;
}

/** Top resolvers, and the lowest who did close at least one ticket. */
export function pickMostAndLeast<T extends { id: string; resolved: number; name?: string }>(
  rows: T[],
): { most: T[]; least: T[]; othersWithLeast: number; withoutResolution: number } {
  const most = [...rows]
    .sort((a, b) => b.resolved - a.resolved || tieLabel(a).localeCompare(tieLabel(b), "es"))
    .slice(0, 3);
  const mostIds = new Set(most.map((row) => row.id));
  const rest = rows.filter((row) => !mostIds.has(row.id));
  const withTickets = rest.filter((row) => row.resolved > 0);
  const least = [...withTickets]
    .sort((a, b) => a.resolved - b.resolved || tieLabel(a).localeCompare(tieLabel(b), "es"))
    .slice(0, 3);
  const minimum = least[0]?.resolved;
  const leastIds = new Set(least.map((row) => row.id));
  const othersWithLeast =
    minimum === undefined
      ? 0
      : withTickets.filter((row) => !leastIds.has(row.id) && row.resolved === minimum).length;
  const withoutResolution = rest.filter((row) => row.resolved === 0).length;
  return { most, least, othersWithLeast, withoutResolution };
}

function buildResolutionRows(
  technicians: { id: string; name: string; accountId: string }[],
  issues: ResolutionTicket[],
  daysByKey: Map<string, number>,
): ResolutionRankRow[] {
  return technicians.map((tech) => {
    const tickets = issues
      .filter((issue) => issue.accountId === tech.accountId && issue.resolution)
      .sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt));
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
      counts.set(ticket.resolution, (counts.get(ticket.resolution) ?? 0) + 1);
    }
    const dayTotal = tickets.reduce(
      (sum, ticket) => sum + (daysByKey.get(ticket.key) ?? 0),
      0,
    );
    return {
      id: tech.id,
      name: tech.name,
      resolved: tickets.length,
      avgResolutionDays:
        tickets.length > 0 ? Math.round((dayTotal / tickets.length) * 10) / 10 : 0,
      byResolution: [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      tickets,
    };
  });
}

export function rankResolutions(
  technicians: { id: string; name: string; accountId: string }[],
  issues: ResolutionTicket[],
  daysByKey: Map<string, number>,
) {
  return pickMostAndLeast(buildResolutionRows(technicians, issues, daysByKey));
}

/** Everyone who closed at least one ticket, highest count first. */
export function listMostResolvers(
  technicians: { id: string; name: string; accountId: string }[],
  issues: ResolutionTicket[],
  daysByKey: Map<string, number>,
): ResolutionRankRow[] {
  return buildResolutionRows(technicians, issues, daysByKey)
    .filter((row) => row.resolved > 0)
    .sort(
      (a, b) => b.resolved - a.resolved || a.name.localeCompare(b.name, "es"),
    );
}
