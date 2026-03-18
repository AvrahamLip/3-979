export type StatusType = "בבסיס" | "בבית" | "מחלה / גימלים" | "אחר";

export interface RawRecord {
  name: string;
  department: string;
  role: string;
  personalNumber: string | number;
  todayValue: string | number;
}

export interface AttendanceRecord {
  name: string;
  department: string;
  role: string;
  personalNumber: string;
  todayValue: string;
  status: StatusType;
}

export interface StatusCounts {
  "בבסיס": number;
  "בבית": number;
  "מחלה / גימלים": number;
  "אחר": number;
  total: number;
}

export interface RoleStats {
  role: string;
  counts: StatusCounts;
}

export interface DepartmentStats {
  department: string;
  counts: StatusCounts;
  roles: RoleStats[];
  records: AttendanceRecord[];
}
