export type Technician = {
  id: string;
  name: string;
  accountId: string;
  team: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TechnicianInput = {
  name: string;
  accountId: string;
  team?: string | null;
  active?: boolean;
};

export type TechnicianWeekStats = {
  id: string;
  open: number;
  resolved: number;
  avgResolutionDays: number;
  created: number;
};

export type ResolvedIssue = {
  weekId: string;
  technicianId: string;
  issueKey: string;
  summary: string;
  createdAt: string;
  resolvedAt: string;
  resolutionDays: number;
  resolution: string | null;
  url: string | null;
};

export type WeekSnapshot = {
  id: string;
  label: string;
  start: string;
  end: string;
  created: number;
  resolved: number;
  open: number;
  stale: number;
  unassigned: number;
  reopened: number;
  byTechnician: TechnicianWeekStats[];
  syncedAt: string | null;
};

export type SyncRun = {
  id: number;
  weekId: string;
  status: "success" | "error";
  message: string;
  startedAt: string;
  finishedAt: string;
};

export type CsvImportResult = {
  accepted: TechnicianInput[];
  rejected: { row: number; reason: string; raw: Record<string, string> }[];
};

export type DashboardMeta = {
  projectKey: string;
  projectName: string;
  lastSyncAt: string | null;
  technicianCount: number;
  weekCount: number;
};
