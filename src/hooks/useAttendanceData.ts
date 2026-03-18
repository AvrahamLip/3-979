import { useQuery } from "@tanstack/react-query";
import {
  processRecords,
  formatDateForApi,
} from "@/lib/attendanceUtils";
import type { AttendanceRecord } from "@/types/attendance";
import type { RawRecord } from "@/types/attendance";

const MAIN_API = "https://151.145.89.228.sslip.io/webhook/Doch-1";

async function fetchMainData(date: string): Promise<AttendanceRecord[]> {
  const res = await fetch(`${MAIN_API}?date=${encodeURIComponent(date)}`);
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

// ─── Zama ────────────────────────────────────────────────────────────────────

const ZAMA_API = "https://151.145.89.228.sslip.io/webhook/Zama/Doch-1";
const ZAMA_DEPTS = ["המושבה - פ\"ת", "צרעה", "מכון ויצמן - רחובות", "מפל\"ג"];

async function fetchZamaDept(deptName: string, date: string): Promise<AttendanceRecord[]> {
  const url = `${ZAMA_API}?id=${encodeURIComponent(deptName)}&date=${encodeURIComponent(date)}`;
  const res = await fetch(url);
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
