export type StatusType = 
  | "נוכח" 
  | "יצא לאפטר" 
  | "אפטר" 
  | "מחלה / גימלים" 
  | "מנותק קשר" 
  | "קורס" 
  | "משתחרר" 
  | "שוחרר" 
  | "פוטנציאל נפקדות" 
  | "פיצול" 
  | "יציאה לפיצול"
  | "אחר";

export interface RawRecord {
  name: string;
  department: string;
  role: string;
  personalNumber: string | number;
  todayValue: string | number;
  VacationStatus?: number | string;
  burdenPoints?: number | string;
  gender?: "ז" | "נ";
}

export interface AttendanceRecord {
  name: string;
  department: string;
  role: string;
  personalNumber: string;
  todayValue: string;
  status: StatusType;
  vacationStatus?: number | string;
  burdenPoints?: number;
  gender?: "ז" | "נ";
}

export interface StatusCounts {
  "נוכח": number;
  "יצא לאפטר": number;
  "אפטר": number;
  "מחלה / גימלים": number;
  "מנותק קשר": number;
  "קורס": number;
  "משתחרר": number;
  "שוחרר": number;
  "פוטנציאל נפקדות": number;
  "פיצול": number;
  "יציאה לפיצול": number;
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
