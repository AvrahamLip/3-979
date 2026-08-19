import { describe, it, expect } from "vitest";
import {
  normalizeStatus,
  formatDateForApi,
  formatDateShort,
  formatDateFull,
  getTomorrowIso,
  processRecords,
  buildStatusCounts,
  buildRoleStats,
  buildDepartmentStats,
  getSummaryCategory,
  normalizeNameStr,
  getComputedPresence,
} from "../lib/attendanceUtils";
import type { RawRecord, AttendanceRecord } from "../types/attendance";

const record = (overrides: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  name: "חייל",
  department: "מחלקה",
  role: "חייל",
  personalNumber: "123",
  todayValue: "1",
  status: "נוכח",
  ...overrides,
});

describe("attendanceUtils", () => {
  describe("normalizeStatus", () => {
    it("should return 'נוכח' for 'נ', 'V' or '1'", () => {
      expect(normalizeStatus("נ")).toBe("נוכח");
      expect(normalizeStatus("V")).toBe("נוכח");
      expect(normalizeStatus("1")).toBe("נוכח");
    });

    it("should return 'אפטר' for '0' or empty string", () => {
      expect(normalizeStatus("0")).toBe("אפטר");
      expect(normalizeStatus("")).toBe("אפטר");
      expect(normalizeStatus(null)).toBe("אפטר");
      expect(normalizeStatus(undefined)).toBe("אפטר");
    });

    it("should return 'יצא לאפטר' for 'יא'", () => {
      expect(normalizeStatus("יא")).toBe("יצא לאפטר");
    });

    it("should return 'מחלה / גימלים' for 'ג', '2' or 'גימלים'", () => {
      expect(normalizeStatus("ג")).toBe("מחלה / גימלים");
      expect(normalizeStatus("2")).toBe("מחלה / גימלים");
      expect(normalizeStatus("גימלים")).toBe("מחלה / גימלים");
    });

    it("should map remaining statuses", () => {
      expect(normalizeStatus("מק")).toBe("מנותק קשר");
      expect(normalizeStatus("ק")).toBe("קורס");
      expect(normalizeStatus("מ")).toBe("משתחרר");
      expect(normalizeStatus("ש")).toBe("שוחרר");
      expect(normalizeStatus("פנ")).toBe("פוטנציאל נפקדות");
      expect(normalizeStatus("פ")).toBe("פיצול");
      expect(normalizeStatus("יפ")).toBe("יציאה לפיצול");
      expect(normalizeStatus("4")).toBe("נוכח");
    });

    it("should return 'אחר' for unknown values", () => {
      expect(normalizeStatus("999")).toBe("אחר");
      expect(normalizeStatus("מילואים")).toBe("אחר");
    });
  });

  describe("date formatting", () => {
    it("formatDateForApi should convert YYYY-MM-DD to D/M/YY", () => {
      expect(formatDateForApi("2026-03-19")).toBe("19/3/26");
      expect(formatDateForApi("2026-10-01")).toBe("1/10/26");
    });

    it("formatDateShort should return DD/MM", () => {
      expect(formatDateShort("2026-03-19")).toBe("19/03");
      expect(formatDateShort("")).toBe("");
    });

    it("formatDateFull should return DD/MM/YY", () => {
      expect(formatDateFull("2026-03-19")).toBe("19/03/26");
    });

    it("getTomorrowIso should return next day", () => {
      expect(getTomorrowIso("2026-03-19")).toBe("2026-03-20");
      expect(getTomorrowIso("2026-03-31")).toBe("2026-04-01");
    });
  });

  describe("processRecords", () => {
    it("should filter out empty names and normalize data", () => {
      const raw: RawRecord[] = [
        { name: "John Doe", department: "Dept A", role: "Role A", personalNumber: 123456, todayValue: "1" },
        { name: "", department: "Dept B", role: "Role B", personalNumber: 789012, todayValue: "0" },
        { name: "Jane Smith", department: "Dept A", role: "Role C", personalNumber: "654321", todayValue: "2" },
      ];

      const processed = processRecords(raw);

      expect(processed).toHaveLength(2);
      expect(processed[0].name).toBe("John Doe");
      expect(processed[0].status).toBe("נוכח");
      expect(processed[1].name).toBe("Jane Smith");
      expect(processed[1].status).toBe("מחלה / גימלים");
    });

    it("should trim names and default missing burdenPoints/gender", () => {
      const raw: RawRecord[] = [{ name: "  אבי  ", department: "", role: "", personalNumber: "", todayValue: "V" }];
      const processed = processRecords(raw);
      expect(processed[0].name).toBe("אבי");
      expect(processed[0].burdenPoints).toBe(0);
      expect(processed[0].gender).toBeUndefined();
    });
  });

  describe("buildStatusCounts", () => {
    it("should count statuses correctly", () => {
      const records = [
        record({ status: "נוכח" }),
        record({ status: "אפטר" }),
        record({ status: "נוכח" }),
        record({ status: "מחלה / גימלים" }),
        record({ status: "אחר" }),
      ];

      const counts = buildStatusCounts(records);

      expect(counts["נוכח"]).toBe(2);
      expect(counts["אפטר"]).toBe(1);
      expect(counts["מחלה / גימלים"]).toBe(1);
      expect(counts["אחר"]).toBe(1);
      expect(counts.total).toBe(5);
    });

    it("should count unknown statuses as 'אחר'", () => {
      const counts = buildStatusCounts([record({ status: "לא קיים" as StatusValue })]);
      expect(counts["אחר"]).toBe(1);
    });
  });

  describe("buildRoleStats / buildDepartmentStats", () => {
    it("should group records by role sorted by presence", () => {
      const records = [
        record({ name: "א", role: "חייל", status: "נוכח" }),
        record({ name: "ב", role: "סמל", status: "אפטר" }),
        record({ name: "ג", role: "חייל", status: "נוכח" }),
      ];
      const stats = buildRoleStats(records);
      expect(stats).toHaveLength(2);
      expect(stats[0].role).toBe("חייל");
      expect(stats[0].counts["נוכח"]).toBe(2);
    });

    it("should group records by department sorted by total", () => {
      const records = [
        record({ name: "א", department: "מחלקה 1", status: "נוכח" }),
        record({ name: "ב", department: "מחלקה 2", status: "אפטר" }),
        record({ name: "ג", department: "מחלקה 1", status: "נוכח" }),
      ];
      const stats = buildDepartmentStats(records);
      expect(stats).toHaveLength(2);
      expect(stats[0].department).toBe("מחלקה 1");
      expect(stats[0].counts.total).toBe(2);
      expect(stats[0].roles[0].role).toBe("חייל");
    });
  });

  describe("getSummaryCategory", () => {
    it("should map statuses to summary categories", () => {
      expect(getSummaryCategory("נוכח")).toBe("נוכח");
      expect(getSummaryCategory("אפטר")).toBe("אפטר");
      expect(getSummaryCategory("יצא לאפטר")).toBe("אפטר");
      expect(getSummaryCategory("מחלה / גימלים")).toBe("מחלה / גימלים");
      expect(getSummaryCategory("פוטנציאל נפקדות")).toBe("מחלה / גימלים");
      expect(getSummaryCategory("קורס")).toBe("אחר");
    });
  });

  describe("normalizeNameStr", () => {
    it("should strip parenthetical suffixes and collapse whitespace", () => {
      expect(normalizeNameStr("רז חיון (בדרך חזרה)")).toBe("רז חיון");
      expect(normalizeNameStr("  אייל   סולמון  ")).toBe("אייל סולמון");
    });
  });

  describe("getComputedPresence", () => {
    it("should return 'none' for no person", () => {
      expect(getComputedPresence(undefined)).toBe("none");
    });

    it("should classify home statuses as 'none'", () => {
      for (const v of ["א", "ג", "מק", "ק", "ש", "פנ", "פ", "0", ""]) {
        expect(getComputedPresence(record({ todayValue: v }))).toBe("none");
      }
    });

    it("should classify leaving statuses as 'leaving'", () => {
      for (const v of ["יא", "יפ", "מ"]) {
        expect(getComputedPresence(record({ todayValue: v }))).toBe("leaving");
      }
    });

    it("should classify '4' as 'returning'", () => {
      expect(getComputedPresence(record({ todayValue: "4" }))).toBe("returning");
    });

    it("should classify present values as 'full'", () => {
      for (const v of ["נ", "1", "V"]) {
        expect(getComputedPresence(record({ todayValue: v }))).toBe("full");
      }
    });

    it("should cross-check yesterday: away yesterday + present today = 'returning'", () => {
      const today = record({ todayValue: "1" });
      const yesterday = [record({ name: "חייל", todayValue: "א" })];
      expect(getComputedPresence(today, yesterday)).toBe("returning");
    });

    it("should return 'none' for today-home regardless of yesterday (cross-check 'leaving' branch is unreachable)", () => {
      const today = record({ todayValue: "א" });
      const yesterday = [record({ name: "חייל", todayValue: "1" })];
      expect(getComputedPresence(today, yesterday)).toBe("none");
    });

    it("should ignore yesterday when today's status is explicit", () => {
      const yesterday = [record({ name: "חייל", todayValue: "1" })];
      expect(getComputedPresence(record({ todayValue: "יא" }), yesterday)).toBe("leaving");
    });
  });
});