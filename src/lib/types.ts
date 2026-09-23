export type Technician = {
  id: string;
  name: string;
};

export type TechnicianWeekStats = {
  id: string;
  open: number;
  resolved: number;
  avgResolutionDays: number;
  created: number;
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
};

export type DemoData = {
  projectKey: string;
  projectName: string;
  demoNote: string;
  technicians: Technician[];
  weeks: WeekSnapshot[];
};
