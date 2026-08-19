import { describe, it, expect } from "vitest";
import { generateAssignment } from "../pages/GuardAssignmentPage";
import { processRecords } from "../lib/attendanceUtils";
import type { RawRecord } from "../types/attendance";
import type { AssignmentData } from "../types/guard";
import fs from "fs";
import path from "path";
import { loadAttendanceFixtures } from "./fixtures";

const API_BASE = "https://151.145.89.228.sslip.io/webhook/Doch-1";

function formatDateForApi(isoDate: string): string {
  const date = new Date(isoDate);
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = String(date.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
}

async function getRecords(apiDate: string): Promise<RawRecord[] | undefined> {
  const fixture = loadAttendanceFixtures().get(apiDate);
  if (fixture) return fixture;
  try {
    const res = await fetch(`${API_BASE}?date=${encodeURIComponent(apiDate)}`);
    const text = await res.text();
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : json.data ?? [];
  } catch {
    return undefined;
  }
}

describe("Monthly Guard Assignment Simulation", () => {
  it("should run simulation from 20.8 to 17.9 without errors", async () => {
    const dates: string[] = [];
    const start = new Date("2026-08-20");
    const end = new Date("2026-09-17");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }

    let previousAssignment: AssignmentData | null = null;
    let history: Record<string, number> = {};
    let lastRecords: ReturnType<typeof processRecords> = [];
    const reportLines: string[] = [
      "# דוח בדיקות שיבוץ חודשי (20.8 - 17.9)",
      `נבדקו ${dates.length} ימים רצופים (נתוני fixtures; חסרים ב-API מושלמים מהיום הקודם).`,
      "",
      "| תאריך | פילבוקס (שויך/צריך) | יזומה (שויך/צריך) | קצין תורן | בעיות / הערות |",
      "| --- | --- | --- | --- | --- |"
    ];

    for (let i = 0; i < dates.length; i++) {
      const todayIso = dates[i];
      const tomorrowIso = i < dates.length - 1 ? dates[i + 1] : new Date(new Date(todayIso).getTime() + 86400000).toISOString().split("T")[0];

      const apiToday = formatDateForApi(todayIso);
      const apiTomorrow = formatDateForApi(tomorrowIso);

      const records = processRecords((await getRecords(apiToday)) ?? lastRecords);
      lastRecords = records;
      const tomorrowRecords = processRecords((await getRecords(apiTomorrow)) ?? records);

      const result = generateAssignment(records, history, [], new Set(), todayIso, previousAssignment, [], tomorrowRecords);

      const pilbox = result.missions.find(m => m.postType === "פילבוקס");
      const izuma = result.missions.find(m => m.postType === "יזומה");
      const izumaB = result.missions.find(m => m.postType === "יזומה ב");
      const dutyOfficerPost = result.missions.find(m => m.postType === "קצין תורן");
      const dutyOfficer = dutyOfficerPost?.slots[0]?.assignedTo || "";

      const pilboxAssigned = pilbox?.slots.filter(s => s.assignedTo).length || 0;
      const pilboxRequired = pilbox?.slots.length || 0;
      const izumaAssigned = (izuma?.slots.filter(s => s.assignedTo).length || 0) + (izumaB?.slots.filter(s => s.assignedTo).length || 0);
      const izumaRequired = (izuma?.slots.length || 0) + (izumaB?.slots.length || 0);

      const errors: string[] = [];

      const assignedSet = new Set<string>();
      const duplicates = new Set<string>();
      const allAssigned = [
        ...(pilbox?.slots.map(s => s.assignedTo) || []),
        ...(izuma?.slots.map(s => s.assignedTo) || []),
        ...(izumaB?.slots.map(s => s.assignedTo) || []),
        dutyOfficer
      ].filter(Boolean) as string[];

      allAssigned.forEach(name => {
        if (assignedSet.has(name)) duplicates.add(name);
        assignedSet.add(name);
      });
      if (duplicates.size > 0) errors.push(`כפילות בשיבוץ: ${Array.from(duplicates).join(", ")}`);

      const femaleCount = (pilbox?.slots.map(s => s.assignedTo).filter(Boolean) || []).filter(name =>
        records.find(r => r.name === name)?.gender === "נ"
      ).length;
      if (femaleCount > 0 && femaleCount < 3) errors.push(`אי עמידה בתקינה מגדרית בפילבוקס (${femaleCount} בנות בלבד)`);

      if (pilboxAssigned < pilboxRequired) errors.push(`עמדות פילבוקס ריקות: ${pilboxRequired - pilboxAssigned}`);

      const notes = errors.length > 0 ? errors.join("<br>") : "תקין";
      reportLines.push(`| ${todayIso} | ${pilboxAssigned}/${pilboxRequired} | ${izumaAssigned}/${izumaRequired} | ${dutyOfficer || "אין"} | ${notes} |`);

      expect(duplicates.size).toBe(0);
      expect(femaleCount === 0 || femaleCount >= 3).toBe(true);

      const newHistory = { ...history };
      pilbox?.slots.forEach(s => {
        if (s.assignedTo) newHistory[s.assignedTo] = (newHistory[s.assignedTo] || 0) + 3;
      });
      izuma?.slots.forEach(s => {
        if (s.assignedTo) newHistory[s.assignedTo] = (newHistory[s.assignedTo] || 0) + 2;
      });
      if (dutyOfficer) newHistory[dutyOfficer] = (newHistory[dutyOfficer] || 0) + 2;
      history = newHistory;
      previousAssignment = result;
    }

    expect(reportLines.filter(l => l.includes("כפילות")).length).toBe(0);
    fs.mkdirSync(path.resolve(__dirname, "../../tmp"), { recursive: true });
    fs.writeFileSync(path.resolve(__dirname, "../../tmp/monthly-report.md"), reportLines.join("\n"), "utf8");
    console.log("Report generated at tmp/monthly-report.md");
  }, 60000);
});