import { useQuery } from "@tanstack/react-query";
import {
  processRecords,
  formatDateForApi,
} from "@/lib/attendanceUtils";
import type { AttendanceRecord } from "@/types/attendance";
import type { RawRecord } from "@/types/attendance";
import { getApiUrl } from "@/lib/apiHelper";

async function fetchMainData(date: string): Promise<AttendanceRecord[]> {
  const url = getApiUrl("Doch-1", { date });
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`שגיאת שרת: ${res.status}`);
  const json = await res.json();
  const arr: RawRecord[] = Array.isArray(json) ? json : json.data ?? [];
  return processRecords(arr);
}

export function useMainAttendance(date: string) {
  const apiDate = formatDateForApi(date);

  return useQuery({
    queryKey: ["main-attendance", apiDate],
    queryFn: () => fetchMainData(apiDate),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Contacts ──────────────────────────────────────────────────────────────────

async function fetchContactsData(): Promise<AttendanceRecord[]> {
  const url = getApiUrl("mobile");
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`שגיאת שרת: ${res.status}`);
  const json = await res.json();
  const arr: any[] = Array.isArray(json) ? json : (json.data ?? []);
  
  // Map the Hebrew keys from the new API to AttendanceRecord format
  return arr.map(item => ({
    name: item["שם"] || "",
    personalNumber: item["נייד"] || "",
    role: item["תפקיד"] || "",
    department: item["יחידה"] || item["מחלקה"] || "כללי",
    status: "",
    todayValue: "",
    originalDate: "",
    dateUsed: "",
    gender: "male",
    burdenPoints: 0,
    sessionHistory: {}
  }));
}

export function useContactsData() {
  return useQuery({
    queryKey: ["contacts-data"],
    queryFn: fetchContactsData,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Zama ────────────────────────────────────────────────────────────────────

const ZAMA_DEPTS = ["המושבה - פ\"ת", "צרעה", "מכון ויצמן - רחובות", "מפל\"ג"];

async function fetchZamaDept(deptName: string, date: string): Promise<AttendanceRecord[]> {
  const url = getApiUrl("Zama/Doch-1", { id: deptName, date });
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`שגיאת שרת עבור ${deptName}: ${res.status}`);
  const json = await res.json();
  const arr: RawRecord[] = Array.isArray(json) ? json : json.data ?? [];
  return processRecords(arr);
}

async function fetchAllZama(date: string): Promise<Record<string, AttendanceRecord[]>> {
  const results = await Promise.allSettled(
    ZAMA_DEPTS.map((dept) => fetchZamaDept(dept, date).then((recs) => ({ dept, recs })))
  );
  const out: Record<string, AttendanceRecord[]> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      out[result.value.dept] = result.value.recs;
    } else {
      console.error(result.reason);
    }
  }
  return out;
}

export function useZamaAttendance(date: string) {
  const apiDate = formatDateForApi(date);

  return useQuery({
    queryKey: ["zama-attendance", apiDate],
    queryFn: () => fetchAllZama(apiDate),
    staleTime: 5 * 60 * 1000,
  });
}

export { ZAMA_DEPTS };
