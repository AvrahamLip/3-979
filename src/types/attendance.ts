export type StatusType = "בבסיס" | "בבית" | "מחלה / גימלים" | "פיצול" | "שחרור" | "אחר";

export interface RawRecord {
  name: string;
  department: string;
  role: string;
  todayValue: string | number;
  personalNumber?: string | number;
}

export interface AttendanceRecord {
  name: string;
  department: string;
  role: string;
  todayValue: string;
  status: StatusType;
  personalNumber: string;
}

export interface StatusCounts {
  "בבסיס": number;
  "בבית": number;
  "מחלה / גימלים": number;
  "פיצול": number;
  "שחרור": number;
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
