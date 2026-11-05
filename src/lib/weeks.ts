/** ISO week helpers (Monday–Sunday, local calendar dates as YYYY-MM-DD). */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday of the ISO week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfIsoWeek(date: Date): Date {
  const start = startOfIsoWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

/** ISO week number 1–53. */
export function isoWeekNumber(date: Date): number {
  const tmp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}

export function isoWeekYear(date: Date): number {
  const tmp = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  return tmp.getFullYear();
}

export function weekIdFromDate(date: Date): string {
  return `${isoWeekYear(date)}-W${pad(isoWeekNumber(date))}`;
}

export function rangeFromWeekId(weekId: string): {
  start: string;
  end: string;
  label: string;
} {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) {
    throw new Error(`Semana inválida: ${weekId}`);
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  // ISO week 1 contains Jan 4; Monday of that week:
  const jan4 = new Date(year, 0, 4);
  const monday = startOfIsoWeek(jan4);
  monday.setDate(monday.getDate() + (week - 1) * 7);
  const sunday = endOfIsoWeek(monday);
  const start = formatDate(monday);
  const end = formatDate(sunday);
  return {
    start,
    end,
    label: formatWeekLabel(week, monday, sunday),
  };
}

const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function formatWeekLabel(week: number, start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const left = `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]}`;
  const right = sameMonth
    ? `${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`
    : `${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
  return `Semana ${week} · ${left} – ${right}`;
}

export function listRecentWeekIds(count: number, from = new Date()): string[] {
  const ids: string[] = [];
  const cursor = startOfIsoWeek(from);
  for (let i = 0; i < count; i++) {
    ids.push(weekIdFromDate(cursor));
    cursor.setDate(cursor.getDate() - 7);
  }
  return ids;
}

export function currentWeekId(from = new Date()): string {
  return weekIdFromDate(from);
}

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function rangeFromMonthId(monthId: string): {
  start: string;
  end: string;
  label: string;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId);
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) {
    throw new Error(`Mes inválido: ${monthId}`);
  }
  const year = Number(match[1]);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${match[2]}-01`,
    end: `${year}-${match[2]}-${pad(lastDay)}`,
    label: `${MONTHS[month - 1]} ${year}`,
  };
}

export function listRecentMonthIds(count: number, from = new Date()): string[] {
  const ids: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < count; i++) {
    ids.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`);
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return ids;
}

export function currentMonthId(from = new Date()): string {
  return `${from.getFullYear()}-${pad(from.getMonth() + 1)}`;
}
