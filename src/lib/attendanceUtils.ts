import type {
  RawRecord,
  AttendanceRecord,
  StatusType,
  StatusCounts,
  RoleStats,
  DepartmentStats,
} from "@/types/attendance";

export function normalizeStatus(value: string | number | undefined | null): StatusType {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "נ" || v === "V" || v === "1") return "נוכח";
  if (v === "יא") return "יצא לאפטר";
  if (v === "א" || v === "0" || v === "") return "אפטר";
  if (v === "ג" || v === "2" || v === "גימלים") return "מחלה / גימלים";
  if (v === "מק") return "מנותק קשר";
  if (v === "ק") return "קורס";
  if (v === "מ") return "משתחרר";
  if (v === "ש") return "שוחרר";
  if (v === "פנ") return "פוטנציאל נפקדות";
  if (v === "פ") return "פיצול";
  if (v === "יפ") return "יציאה לפיצול";
  if (v === "4") return "נוכח";
  return "אחר";
}

export function formatDateForApi(isoDate: string): string {
  // YYYY-MM-DD → D/M/YY (Matches n8n expected format)
  const date = new Date(isoDate);
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = String(date.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
}

export function formatDateShort(isoDate: string): string {
  // YYYY-MM-DD → DD/MM
  if (!isoDate) return "";
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export function formatDateFull(isoDate: string): string {
  // YYYY-MM-DD → DD/MM/YY
  if (!isoDate) return "";
  const parts = isoDate.split('-');
  if (parts.length < 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
}

export function formatDateRange(isoDate: string, days: number = 1): string {
  // Returns "DD/MM - DD/MM" (useful for 18:00 start overlaps)
  const d1 = new Date(isoDate);
  const d2 = new Date(isoDate);
  d2.setDate(d1.getDate() + days);

  const f = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  };

  return `${f(d1)} - ${f(d2)}`;
}

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function processRecords(raw: RawRecord[]): AttendanceRecord[] {
  return raw
    .filter((r) => r.name && String(r.name).trim() !== "")
    .map((r) => ({
      name: r.name ? String(r.name).trim() : "",
      department: (r.department ?? "").trim(),
      role: (r.role ?? "").trim(),
      personalNumber: String(r.personalNumber ?? ""),
      todayValue: String(r.todayValue ?? ""),
      status: normalizeStatus(r.todayValue),
      vacationStatus: r.VacationStatus,
      burdenPoints: Number(r.burdenPoints) || 0,
      gender: r.gender,
    }));
}

export function buildStatusCounts(records: AttendanceRecord[]): StatusCounts {
  const counts: StatusCounts = {
    "נוכח": 0,
    "יצא לאפטר": 0,
    "אפטר": 0,
    "מחלה / גימלים": 0,
    "מנותק קשר": 0,
    "קורס": 0,
    "משתחרר": 0,
    "שוחרר": 0,
    "פוטנציאל נפקדות": 0,
    "פיצול": 0,
    "יציאה לפיצול": 0,
    "אחר": 0,
    total: records.length,
  };
  for (const r of records) {
    if (counts[r.status] !== undefined) {
      counts[r.status]++;
    } else {
      counts["אחר"]++;
    }
  }
  return counts;
}

export function buildRoleStats(records: AttendanceRecord[]): RoleStats[] {
  const roleMap = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const key = r.role || "לא מוגדר";
    if (!roleMap.has(key)) roleMap.set(key, []);
    roleMap.get(key)!.push(r);
  }
  return Array.from(roleMap.entries())
    .map(([role, recs]) => ({ role, counts: buildStatusCounts(recs) }))
    .sort((a, b) => b.counts["נוכח"] - a.counts["נוכח"]);
}

export function buildDepartmentStats(records: AttendanceRecord[]): DepartmentStats[] {
  const deptMap = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const key = r.department || "לא מוגדר";
    if (!deptMap.has(key)) deptMap.set(key, []);
    deptMap.get(key)!.push(r);
  }
  return Array.from(deptMap.entries())
    .map(([department, recs]) => ({
      department,
      counts: buildStatusCounts(recs),
      roles: buildRoleStats(recs),
      records: recs,
    }))
    .sort((a, b) => b.counts.total - a.counts.total);
}

export const STATUS_LABELS: StatusType[] = [
  "נוכח",
  "יצא לאפטר",
  "אפטר",
  "מחלה / גימלים",
  "מנותק קשר",
  "קורס",
  "משתחרר",
  "שוחרר",
  "פוטנציאל נפקדות",
  "פיצול",
  "יציאה לפיצול",
  "אחר",
];

export const STATUS_COLORS: Record<StatusType, string> = {
  "נוכח": "status-base",
  "יצא לאפטר": "status-returning", // Blueish
  "אפטר": "status-home",
  "מחלה / גימלים": "status-sick",
  "מנותק קשר": "status-other",
  "קורס": "status-other",
  "משתחרר": "status-home",
  "שוחרר": "status-home",
  "פוטנציאל נפקדות": "status-sick",
  "פיצול": "status-other",
  "יציאה לפיצול": "status-returning",
  "אחר": "status-other",
};

export const STATUS_ICONS: Record<StatusType, string> = {
  "נוכח": "✓",
  "יצא לאפטר": "↗",
  "אפטר": "⌂",
  "מחלה / גימלים": "⚕",
  "מנותק קשר": "!",
  "קורס": "✍",
  "משתחרר": "✖",
  "שוחרר": "✖",
  "פוטנציאל נפקדות": "!",
  "פיצול": "÷",
  "יציאה לפיצול": "↗",
  "אחר": "?",
};

export const normalizeNameStr = (name: any) => String(name || "").replace(/\(.*\)/g, '').replace(/\s+/g, ' ').trim();

export type SummaryCategory = "נוכח" | "אפטר" | "מחלה / גימלים" | "אחר";

export function getSummaryCategory(status: StatusType): SummaryCategory {
  if (status === "נוכח") return "נוכח";
  if (status === "אפטר" || status === "יצא לאפטר") return "אפטר";
  if (status === "מחלה / גימלים" || status === "פוטנציאל נפקדות") return "מחלה / גימלים";
  return "אחר";
}

export function getComputedPresence(person: AttendanceRecord | undefined, yesterdayRecords?: AttendanceRecord[]): "full" | "leaving" | "returning" | "none" {
  if (!person) return "none";
  let v = String(person.todayValue || "").trim().toUpperCase();
  
  // Categorization
  const isLeaving = ["יא", "יפ", "מ"].includes(v);
  const isHome = ["א", "ג", "מק", "ק", "ש", "פנ", "פ", "0", ""].includes(v);
  const isReturning = ["4"].includes(v);
  const isPresent = ["נ", "1", "V"].includes(v);

  if (isHome) return "none";
  if (isLeaving) return "leaving";
  if (isReturning) return "returning";
  
  // Cross check with yesterday for dynamic status (leaving/returning)
  if (yesterdayRecords && yesterdayRecords.length > 0) {
     const yestPerson = yesterdayRecords.find(r => normalizeNameStr(r.name) === normalizeNameStr(person.name));
     const vYest = yestPerson ? String(yestPerson.todayValue || "").trim().toUpperCase() : "1";
     
     const wasAway = ["א", "ג", "מק", "ק", "ש", "פנ", "פ", "0", "", "יא", "יפ", "מ", "5"].includes(vYest);
     const wasPresent = ["נ", "1", "V"].includes(vYest);

     if (wasAway && isPresent) return "returning";
     if (wasPresent && isHome) return "leaving";
  }

  if (isPresent) return "full";
  return "none";
}
