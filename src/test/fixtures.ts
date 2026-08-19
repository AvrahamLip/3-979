import type { RawRecord } from "../types/attendance";
import fixture from "./fixtures/attendance-2026-08-20-to-2026-09-18.json";

let cache: Map<string, RawRecord[]> | null = null;

export function loadAttendanceFixtures(): Map<string, RawRecord[]> {
  if (cache) return cache;
  const byDate = new Map<string, RawRecord[]>();
  for (const iso of Object.keys(fixture.dates)) {
    const rows = fixture.dates[iso] as RawRecord[];
    const apiDate = rows[0]?.dateUsed;
    if (apiDate) byDate.set(apiDate, rows);
  }
  cache = byDate;
  return cache;
}