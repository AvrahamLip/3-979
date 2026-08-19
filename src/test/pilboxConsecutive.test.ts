import { describe, it, expect } from "vitest";
import { generateAssignment } from "../pages/GuardAssignmentPage";
import { processRecords } from "../lib/attendanceUtils";
import type { RawRecord } from "../types/attendance";
import type { AssignmentData } from "../types/guard";
import { loadAttendanceFixtures } from "./fixtures";

const API_BASE = "https://151.145.89.228.sslip.io/webhook/Doch-1";

async function getRecords(apiDate: string): Promise<RawRecord[]> {
  const fixture = loadAttendanceFixtures().get(apiDate);
  if (fixture) return fixture;
  const res = await fetch(`${API_BASE}?date=${encodeURIComponent(apiDate)}`);
  const json = await res.json();
  return Array.isArray(json) ? json : json.data ?? [];
}

describe("Pilbox Consecutive Days Logic", () => {
  it("should generate assignments for 5 days without crashing and respect continuity", async () => {
    const dates = ["20/8/26", "21/8/26", "22/8/26", "23/8/26", "24/8/26"];

    let previousAssignment: AssignmentData | null = null;
    let history: Record<string, number> = {};

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const tomorrowDate = i < dates.length - 1 ? dates[i + 1] : "25/8/26";

      const records = processRecords(await getRecords(date));
      const tomorrowRecords = processRecords(await getRecords(tomorrowDate));

      const result = generateAssignment(records, history, [], new Set(), date, previousAssignment, [], tomorrowRecords);

      expect(result).toBeDefined();
      expect(result.missions.length).toBeGreaterThan(0);

      const pilbox = result.missions.find(m => m.postType === "פילבוקס");
      const pilboxNames = pilbox?.slots.map(s => s.assignedTo).filter(Boolean) || [];
      expect(pilboxNames.length).toBeGreaterThan(0);

      const withinDayDupes = pilboxNames.filter((name, idx) => pilboxNames.indexOf(name) !== idx);
      expect(withinDayDupes).toEqual([]);

      const femaleCount = pilboxNames.filter(name => records.find(r => r.name === name)?.gender === "נ").length;
      expect(femaleCount === 0 || femaleCount >= 3).toBe(true);

      const newHistory = { ...history };
      pilboxNames.forEach(name => {
        if (name) newHistory[name] = (newHistory[name] || 0) + 3;
      });
      history = newHistory;
      previousAssignment = result;
    }
  }, 30000);
});