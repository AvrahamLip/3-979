import { describe, it, expect } from "vitest";
import { generateAssignment } from "../pages/GuardAssignmentPage";
import { processRecords } from "../lib/attendanceUtils";
import fs from 'fs';
import path from 'path';

describe("generateAssignment with real data", () => {
  it("should assign all slots for 20.8", () => {
    const rawData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../tmp/attendance.json'), 'utf8'));
    const records = processRecords(rawData);
    // the user mentioned 20.8, the data might not have todayValue for 20.8, it uses todayValue dynamically based on column?
    // processRecords just uses 'todayValue', which in tmp/attendance.json is fixed to whatever the dump had.
    const result = generateAssignment(records, {}, [], new Set(), '2026-08-21');
    
    const pilbox = result.missions.find(m => m.postType === "פילבוקס");
    const izuma = result.missions.find(m => m.postType === "יזומה");
    
    console.log("Pilbox:", pilbox?.slots.map(s => s.assignedTo));
    console.log("Izuma:", izuma?.slots.map(s => s.assignedTo));
  });
});
