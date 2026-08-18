import { describe, it, expect } from "vitest";
import { generateAssignment } from "../pages/GuardAssignmentPage";
import { processRecords } from "../lib/attendanceUtils";
import type { AssignmentData } from "../types/guard";

async function fetchRecords(date: string) {
  const res = await fetch(`https://151.145.89.228.sslip.io/webhook/Doch-1?date=${date}`);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : json.data ?? [];
  return processRecords(arr);
}

describe("Pilbox Consecutive Days Logic", () => {
  it("should generate assignments for 5 days without crashing and respect continuity", async () => {
    const dates = ["20/8/26", "21/8/26", "22/8/26", "23/8/26", "24/8/26"]; // Use the API date format (DD/MM/YY)
    
    let previousAssignment: AssignmentData | null = null;
    let history: Record<string, number> = {};
    
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const tomorrowDate = i < dates.length - 1 ? dates[i+1] : "25/8/26";
      
      const records = await fetchRecords(date);
      const tomorrowRecords = await fetchRecords(tomorrowDate);
      
      console.log(`\n=== Generating for ${date} ===`);
      const result = generateAssignment(records, history, [], new Set(), date, previousAssignment, [], tomorrowRecords);
      
      expect(result).toBeDefined();
      expect(result.missions.length).toBeGreaterThan(0);
      
      const pilbox = result.missions.find(m => m.postType === "פילבוקס");
      const pilboxNames = pilbox?.slots.map(s => s.assignedTo).filter(Boolean) || [];
      console.log("Pilbox Assignees:", pilboxNames);
      
      // Update history for next iteration
      const newHistory = { ...history };
      // (Mock simple points update)
      pilboxNames.forEach(name => {
        if (name) newHistory[name] = (newHistory[name] || 0) + 3;
      });
      history = newHistory;
      
      previousAssignment = result;
    }
  }, 30000); // 30s timeout
});
