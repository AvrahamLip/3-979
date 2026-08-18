import { describe, it, expect } from "vitest";
import { generateAssignment } from "../pages/GuardAssignmentPage";
import { AttendanceRecord } from "../types/attendance";

describe("generateAssignment", () => {
  const createRecord = (name: string, role: string, gender: "ז" | "נ", todayValue = "1"): AttendanceRecord => ({
    name,
    department: "מחלקה",
    role,
    personalNumber: "123",
    todayValue,
    status: "נוכח",
    burdenPoints: 0,
    gender,
  });

  it("should assign Sergeant to Pilbox first before Izuma Commander", () => {
    const records = [
      createRecord("סמל זכר", "סמל", "ז"),
      createRecord("מפקד זכר", "מפקד", "ז"),
      ...Array.from({ length: 15 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז"))
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");
    
    const pilbox = result.missions.find(m => m.postType === "פילבוקס");
    const izuma = result.missions.find(m => m.postType === "יזומה");

    const pilboxSergeant = pilbox?.slots.find(s => s.roleLabel === "סמל")?.assignedTo;
    const izumaCommander = izuma?.slots.find(s => s.roleLabel === "מפקד")?.assignedTo;

    expect(pilboxSergeant).toBe("סמל זכר");
    expect(izumaCommander).toBe("מפקד זכר");
  });

  it("should assign exactly 2 males and 2 females to Izuma if females are assigned", () => {
    const records = [
      createRecord("מפקד זכר", "מפקד", "ז"),
      createRecord("נהג זכר", "נהג", "ז"),
      createRecord("רחפניסט זכר", "רחפן", "ז"),
      createRecord("חייל זכר", "חייל", "ז"),
      createRecord("רחפנית נקבה", "רחפן", "נ"),
      createRecord("חיילת נקבה", "חייל", "נ"),
      ...Array.from({ length: 15 }, (_, i) => createRecord(`חייל נוסף ${i}`, "חייל", "ז"))
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");
    const izuma = result.missions.find(m => m.postType === "יזומה");
    
    const assignedNames = izuma?.slots.map(s => s.assignedTo) || [];
    const assignedGenders = assignedNames.map(name => records.find(r => r.name === name)?.gender);
    
    const femaleCount = assignedGenders.filter(g => g === "נ").length;
    const maleCount = assignedGenders.filter(g => g === "ז").length;

    expect(femaleCount).toBe(2);
    expect(maleCount).toBe(2);
  });

  it("should assign 3-4 females to Pilbox if females are assigned", () => {
    const records = [
      createRecord("סמלת נקבה", "סמל", "נ"), // 1st female
      createRecord("מפקד זכר", "מפקד", "ז"),
      createRecord("נהג זכר", "נהג", "ז"),
      createRecord("חיילת א", "חייל", "נ"), // 2nd female
      createRecord("חיילת ב", "חייל", "נ"), // 3rd female
      ...Array.from({ length: 15 }, (_, i) => createRecord(`חייל זכר ${i}`, "חייל", "ז"))
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");
    const pilbox = result.missions.find(m => m.postType === "פילבוקס");
    
    const assignedNames = pilbox?.slots.map(s => s.assignedTo).filter(Boolean) || [];
    const assignedGenders = assignedNames.map(name => records.find(r => r.name === name)?.gender);
    
    const femaleCount = assignedGenders.filter(g => g === "נ").length;
    
    expect(femaleCount).toBeGreaterThanOrEqual(3);
  });
});
