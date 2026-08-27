import { describe, it } from "vitest";
import { generateAssignment } from "../pages/GuardAssignmentPage";
import { normalizeStatus } from "../lib/attendanceUtils";
import type { AttendanceRecord } from "../types/attendance";
import fs from "fs";

// fetch is built in

const POINTS = { HAPAK: 3, CHAMAL_NIGHT: 2, CHAMAL_DAY: 2, PILBOX: 3, IZUMA: 2, RASAP: 1, DUTY_OFFICER: 2 };

async function fetchDate(date: string, retries = 3): Promise<any[]> {
  const [y, m, d] = date.split('-');
  const formatted = `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`;
  const url = `https://151.145.89.228.sslip.io/webhook/Doch-1?date=${encodeURIComponent(formatted)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.trim() === "") return [];
    return JSON.parse(text);
  } catch(e) {
    if (retries > 0) {
      console.log(`Error fetching ${formatted}, retrying...`);
      await new Promise(r => setTimeout(r, 2000));
      return fetchDate(date, retries - 1);
    }
    console.error(`Failed to fetch date ${formatted} after retries.`);
    return [];
  }
}

async function fetchHistory(date: string) {
  const [y, m, d] = date.split('-');
  const formatted = `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`;
  const url = `https://151.145.89.228.sslip.io/webhook/load-guards?date=${encodeURIComponent(formatted)}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch(e) {
    return null;
  }
}

describe("Optimal Schedule Generator", () => {
  it("should generate the schedule from 1/9 to 17/9", async () => {
    const dates = [];
    for(let d=1; d<=17; d++) {
      dates.push(`2026-09-${d.toString().padStart(2, '0')}`);
    }

    const initialPointsFile = require('fs').readFileSync('C:/Users/user/.gemini/antigravity-ide/brain/3e00c76c-1301-4564-bad6-0d1170522b88/scratch/initial-points.json', 'utf8');
    let historyPoints: Record<string, number> = JSON.parse(initialPointsFile);

    // 1. Fetch points history up to 31/8
    for(let d=20; d<=31; d++) {
      const dateStr = `2026-08-${d.toString().padStart(2, '0')}`;
      const data = await fetchHistory(dateStr);
      if (data && data.status !== "not_found") {
        if (data.hapak) {
          data.hapak.forEach((h: any) => {
            if (h.assignedTo) historyPoints[h.assignedTo] = (historyPoints[h.assignedTo] || 0) + POINTS.HAPAK;
          });
        }
        if (data.chamal) {
          data.chamal.forEach((c: any) => {
            if (c.assignedTo) historyPoints[c.assignedTo] = (historyPoints[c.assignedTo] || 0) + (c.shiftIndex === 0 ? POINTS.CHAMAL_NIGHT : POINTS.CHAMAL_DAY);
          });
        }
        if (data.missions) {
          data.missions.forEach((m: any) => {
            let pts = 0;
            if (m.postType === "פילבוקס") pts = POINTS.PILBOX;
            else if (m.postType === "יזומה" || m.postType === "יזומה ב") pts = POINTS.IZUMA;
            else if (m.postType === "תורן רס\"פ") pts = POINTS.RASAP;
            else if (m.postType === "קצין תורן") pts = POINTS.DUTY_OFFICER;
            if (m.slots) {
              m.slots.forEach((s: any) => {
                if (s.assignedTo) historyPoints[s.assignedTo] = (historyPoints[s.assignedTo] || 0) + pts;
              });
            }
          });
        }
      }
    }

    let previousAssignment: any = null;
    
    // Write markdown report
    let report = "# שיבוץ אופטימלי (1.9.2026 - 17.9.2026)\n\n";
    const allAssignmentsPayloads = [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const tomorrow = dates[i+1] || null;

      // Fetch attendance
      const records = await fetchDate(date);
      const tomorrowRecords = tomorrow ? await fetchDate(tomorrow) : [];
      const yesterdayRecords = []; // We won't need full yesterday attendance for simulation just logic
      
      // Delay to respect API
      await new Promise(r => setTimeout(r, 2000));

      const typedRecords = records.map((r: any) => ({
        ...r,
        status: normalizeStatus(r.todayValue),
        burdenPoints: 0 // handled by history map
      })) as AttendanceRecord[];

      const tomorrowTypedRecords = tomorrowRecords.map((r: any) => ({
        ...r,
        status: normalizeStatus(r.todayValue),
        burdenPoints: 0
      })) as AttendanceRecord[];

      const [y, m, dStr] = date.split('-');
      const formattedDate = `${parseInt(dStr)}/${parseInt(m)}/${y.slice(2)}`;

      const assignment = generateAssignment(
        typedRecords,
        historyPoints,
        [], // blocked names
        new Set(),
        formattedDate,
        previousAssignment,
        yesterdayRecords,
        tomorrowTypedRecords
      );

      previousAssignment = assignment;

      report += `## תאריך: ${formattedDate}\n`;
      report += `### חמל\n`;
      assignment.chamal?.forEach(c => {
        report += `- ${c.timeLabel}: ${c.assignedTo || "ריק"}\n`;
        if (c.assignedTo) historyPoints[c.assignedTo] = (historyPoints[c.assignedTo] || 0) + (c.shiftIndex === 0 ? POINTS.CHAMAL_NIGHT : POINTS.CHAMAL_DAY);
      });
      report += `### משימות\n`;
      assignment.missions?.forEach(m => {
        report += `**${m.postType}**\n`;
        let pts = 0;
        if (m.postType === "פילבוקס") pts = POINTS.PILBOX;
        else if (m.postType === "יזומה" || m.postType === "יזומה ב") pts = POINTS.IZUMA;
        else if (m.postType === "תורן רס\"פ") pts = POINTS.RASAP;
        else if (m.postType === "קצין תורן") pts = POINTS.DUTY_OFFICER;

        m.slots?.forEach(s => {
          report += `- ${s.roleLabel}: ${s.assignedTo || "ריק"}\n`;
          if (s.assignedTo) historyPoints[s.assignedTo] = (historyPoints[s.assignedTo] || 0) + pts;
        });
      });
      report += "\n---\n\n";
      
      allAssignmentsPayloads.push({
        date: formattedDate,
        assignment: {
          hapak: assignment.hapak || [],
          chamal: assignment.chamal || [],
          missions: assignment.missions || [],
          lastUpdated: new Date().toISOString()
        }
      });
    }

    fs.writeFileSync("optimal-schedule.md", report, "utf-8");
    fs.writeFileSync("optimal-schedule.json", JSON.stringify(allAssignmentsPayloads, null, 2), "utf-8");
    console.log("Schedule generated and written to optimal-schedule.md and optimal-schedule.json");
  }, 300000); // 5 min timeout
});
