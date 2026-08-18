import { generateAssignment } from "./src/pages/GuardAssignmentPage";
import { AttendanceRecord } from "./src/types/attendance";

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
console.log(JSON.stringify(pilbox?.slots, null, 2));
