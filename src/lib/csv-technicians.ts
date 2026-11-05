import type { CsvImportResult, TechnicianInput } from "@/lib/types";

const REQUIRED_HEADERS = ["name", "accountId"] as const;

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  nombre: "name",
  accountid: "accountId",
  jiraaccountid: "accountId",
  atlassianaccountid: "accountId",
  team: "team",
  equipo: "team",
  rol: "team",
  role: "team",
  active: "active",
  activo: "active",
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function parseActive(value: string | undefined): boolean {
  if (!value || value.trim() === "") return true;
  const v = value.trim().toLowerCase();
  if (["0", "false", "no", "inactivo", "inactive"].includes(v)) return false;
  return true;
}

export function parseTechniciansCsv(content: string): CsvImportResult {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      accepted: [],
      rejected: [{ row: 0, reason: "El archivo está vacío", raw: {} }],
    };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => HEADER_ALIASES[normalizeHeader(h)]);

  if (headers.includes(undefined as unknown as string)) {
    return {
      accepted: [],
      rejected: [
        {
          row: 1,
          reason: `Encabezados no reconocidos: ${rawHeaders.join(", ")}. Usá name,accountId,team,active`,
          raw: {},
        },
      ],
    };
  }

  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      return {
        accepted: [],
        rejected: [
          {
            row: 1,
            reason: `Falta la columna obligatoria "${required}"`,
            raw: {},
          },
        ],
      };
    }
  }

  const accepted: TechnicianInput[] = [];
  const rejected: CsvImportResult["rejected"] = [];
  const seenAccountIds = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) raw[header] = cells[index] ?? "";
    });

    const name = (raw.name ?? "").trim();
    const accountId = (raw.accountId ?? "").trim();
    const team = (raw.team ?? "").trim() || null;
    const active = parseActive(raw.active);
    const rowNumber = i + 1;

    if (!name) {
      rejected.push({ row: rowNumber, reason: "Nombre vacío", raw });
      continue;
    }
    if (!accountId) {
      rejected.push({ row: rowNumber, reason: "accountId vacío", raw });
      continue;
    }
    if (seenAccountIds.has(accountId)) {
      rejected.push({
        row: rowNumber,
        reason: `accountId duplicado en el archivo: ${accountId}`,
        raw,
      });
      continue;
    }

    seenAccountIds.add(accountId);
    accepted.push({ name, accountId, team, active });
  }

  // Atomic import: if any row rejected, don't accept partial file
  if (rejected.length > 0) {
    return { accepted: [], rejected };
  }

  return { accepted, rejected };
}
