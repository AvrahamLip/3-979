import { describe, it, expect } from "vitest";
import {
  normalizeStatus,
  formatDateForApi,
  processRecords,
  buildStatusCounts
} from "../lib/attendanceUtils";
import { RawRecord } from "../types/attendance";

describe("attendanceUtils", () => {
  describe("normalizeStatus", () => {
    it("should return 'בבסיס' for '1' or 'V'", () => {
      expect(normalizeStatus("1")).toBe("בבסיס");
      expect(normalizeStatus("V")).toBe("בבסיס");
    });

    it("should return 'בבית' for '0' or empty string", () => {
      expect(normalizeStatus("0")).toBe("בבית");
      expect(normalizeStatus("")).toBe("בבית");
      expect(normalizeStatus(null)).toBe("בבית");
    });

    it("should return 'מחלה / גימלים' for '2' or 'גימלים'", () => {
      expect(normalizeStatus("2")).toBe("מחלה / גימלים");
      expect(normalizeStatus("גימלים")).toBe("מחלה / גימלים");
    });

    it("should return 'אחר' for unknown values", () => {
      expect(normalizeStatus("999")).toBe("אחר");
      expect(normalizeStatus("מילואים")).toBe("אחר");
    });
  });

  describe("formatDateForApi", () => {
    it("should convert YYYY-MM-DD to DD/MM/YYYY", () => {
      expect(formatDateForApi("2026-03-19")).toBe("19/03/2026");
    });
  });

  describe("processRecords", () => {
    it("should filter out empty names and normalize data", () => {
      const raw: RawRecord[] = [
        { name: "John Doe", department: "Dept A", role: "Role A", personalNumber: 123456, todayValue: "1" },
        { name: "", department: "Dept B", role: "Role B", personalNumber: 789012, todayValue: "0" }, // Empty name
        { name: "Jane Smith", department: "Dept A", role: "Role C", personalNumber: "654321", todayValue: "2" }
      ];

      const processed = processRecords(raw);

      expect(processed).toHaveLength(2);
      expect(processed[0].name).toBe("John Doe");
      expect(processed[0].status).toBe("בבסיס");
      expect(processed[1].name).toBe("Jane Smith");
      expect(processed[1].status).toBe("מחלה / גימלים");
    });
  });

  describe("buildStatusCounts", () => {
    it("should count statuses correctly", () => {
      const records: any[] = [
        { status: "בבסיס" },
        { status: "בבית" },
        { status: "בבסיס" },
        { status: "מחלה / גימלים" },
        { status: "אחר" }
      ];

      const counts = buildStatusCounts(records);

      expect(counts["בבסיס"]).toBe(2);
      expect(counts["בבית"]).toBe(1);
      expect(counts["מחלה / גימלים"]).toBe(1);
      expect(counts["אחר"]).toBe(1);
      expect(counts.total).toBe(5);
    });
  });
});
