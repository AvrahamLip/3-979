import type {
  RawRecord,
  AttendanceRecord,
  StatusType,
  StatusCounts,
  RoleStats,
  DepartmentStats,
} from "../types/attendance";

export function normalizeStatus(value: string | number | undefined | null): StatusType {
  const v = String(value ?? "").trim();
  if (v === "V" || v === "1") return "בבסיס";
  if (v === "0") return "בבית";
  if (v === "2" || v === "גימלים") return "מחלה / גימלים";
  if (v === "4" || v === "פיצול") return "פיצול";
  if (v === "5" || v === "שחרור" || v === "שוחרר" || v === "שחרורר") return "שחרור";
  if (v === "") return "בבית"; // Usually empty means home in this flow, but check logic
  return "אחר";
}

export function formatDateForApi(isoDate: string): string {
  // YYYY-MM-DD → DD/MM/YYYY
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
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
    .filter((r) => r.name && r.name.trim() !== "")
    .map((r) => ({
      name: r.name.trim(),
      department: (r.department ?? "").trim(),
      role: (r.role ?? "").trim(),
      todayValue: String(r.todayValue ?? ""),
      status: normalizeStatus(r.todayValue),
      personalNumber: String(r.personalNumber ?? ""),
    }));
}

export function buildStatusCounts(records: AttendanceRecord[]): StatusCounts {
  const counts: StatusCounts = {
    "בבסיס": 0,
    "בבית": 0,
    "מחלה / גימלים": 0,
    "פיצול": 0,
    "שחרור": 0,
    "אחר": 0,
    total: records.length,
  };
  for (const r of records) {
    counts[r.status]++;
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
    .sort((a, b) => b.counts["בבסיס"] - a.counts["בבסיס"]);
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
  "בבסיס",
  "בבית",
  "מחלה / גימלים",
  "פיצול",
  "שחרור",
  "אחר",
];

export const STATUS_COLORS: Record<StatusType, string> = {
  "בבסיס": "status-base",
  "בבית": "status-home",
  "מחלה / גימלים": "status-sick",
  "פיצול": "status-split",
  "שחרור": "status-released",
  "אחר": "status-other",
};

export const STATUS_ICONS: Record<StatusType, string> = {
  "בבסיס": "🪖",
  "בבית": "🏠",
  "מחלה / גימלים": "🤒",
  "פיצול": "⚖️",
  "שחרור": "🚪",
  "אחר": "❓",
};

