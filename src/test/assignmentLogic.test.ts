import { describe, it, expect } from "vitest";
import { generateAssignment } from "../pages/GuardAssignmentPage";
import { normalizeStatus } from "../lib/attendanceUtils";
import type { AttendanceRecord } from "../types/attendance";

interface TestAssignment {
  hapak: { id: number; memberIndex: number; name: string; assignedTo: string; points: number }[];
  chamal: { shiftIndex: number; timeLabel: string; assignedTo: string }[];
  missions: { postType: string; slots: { roleLabel: string; requiredRole: string | null; assignedTo: string }[] }[];
}

const createRecord = (name: string, role: string, gender: "ז" | "נ", todayValue = "1", burdenPoints = 0): AttendanceRecord => ({
  name,
  department: "מחלקה",
  role,
  personalNumber: "123",
  todayValue,
  status: normalizeStatus(todayValue),
  burdenPoints,
  gender,
});

const makePrevious = (overrides?: Partial<TestAssignment>): TestAssignment => ({
  hapak: [],
  chamal: [
    { shiftIndex: 0, timeLabel: "22:00 – 06:00", assignedTo: "" },
    { shiftIndex: 1, timeLabel: "06:00 – 14:00", assignedTo: "" },
    { shiftIndex: 2, timeLabel: "14:00 – 22:00", assignedTo: "" },
  ],
  missions: [
    { postType: "יזומה", slots: [] },
    { postType: "פילבוקס", slots: [] },
    { postType: "יזומה ב", slots: [] },
  ],
  ...overrides,
});

const allAssigned = (result: TestAssignment): string[] => {
  const names: string[] = [];
  for (const m of result.missions) {
    for (const s of m.slots) if (s.assignedTo) names.push(s.assignedTo);
  }
  for (const c of result.chamal) if (c.assignedTo) names.push(c.assignedTo);
  for (const h of result.hapak) if (h.assignedTo) names.push(h.assignedTo);
  return names;
};

const post = (result: TestAssignment, type: string) =>
  result.missions.find(m => m.postType === type);

describe("generateAssignment", () => {

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
      createRecord("מפקד זכר 1", "מפקד", "ז"),
      createRecord("מפקד זכר 2", "מפקד", "ז"),
      createRecord("נהג זכר 1", "נהג", "ז"),
      createRecord("נהג זכר 2", "נהג", "ז"),
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
    console.log("IZUMA ASSIGNED:", assignedNames, assignedGenders, izuma?.slots);
    
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

describe("generateAssignment - חמל", () => {
  it("should assign 3 distinct חמל to the 3 shifts, sorted by burden points", () => {
    const records = [
      createRecord("חמל א", "חמל", "ז", "1", 5),
      createRecord("חמל ב", "חמל", "ז", "1", 0),
      createRecord("חמל ג", "חמל", "ז", "1", 0),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(result.chamal).toHaveLength(3);
    expect(result.chamal.map(c => c.assignedTo)).toEqual(["חמל ב", "חמל ג", "חמל א"]);
    expect(result.chamal[0].timeLabel).toBe("22:00 – 06:00");
  });

  it("should weight session history on top of burdenPoints", () => {
    const records = [
      createRecord("חמל א", "חמל", "ז", "1", 0),
      createRecord("חמל ב", "חמל", "ז", "1", 0),
    ];

    const result = generateAssignment(records, { "חמל א": 10 }, [], new Set(), "2026-08-18");

    expect(result.chamal[0].assignedTo).toBe("חמל ב");
  });

  it("should never assign a non-חמל role to chamal", () => {
    const records = [
      createRecord("חייל רגיל", "חייל", "ז"),
      createRecord("מפקד צוות", "מפקד", "ז"),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(result.chamal.every(c => c.assignedTo === "")).toBe(true);
  });
});

describe("generateAssignment - continuity", () => {
  it("should keep yesterday's chamal occupant when still available", () => {
    const records = [
      createRecord("חמל א", "חמל", "ז"),
      createRecord("חמל ב", "חמל", "ז"),
      createRecord("חמל ג", "חמל", "ז"),
    ];
    const previous = makePrevious({
      chamal: [
        { shiftIndex: 0, timeLabel: "22:00 – 06:00", assignedTo: "חמל א" },
        { shiftIndex: 1, timeLabel: "06:00 – 14:00", assignedTo: "חמל ב" },
        { shiftIndex: 2, timeLabel: "14:00 – 22:00", assignedTo: "חמל ג" },
      ],
    });

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18", previous);

    expect(result.chamal.map(c => c.assignedTo)).toEqual(["חמל א", "חמל ב", "חמל ג"]);
  });

  it("should replace yesterday's occupant when no longer available", () => {
    const records = [
      createRecord("חמל ישן", "חמל", "ז", "א"),
      createRecord("חמל חדש", "חמל", "ז"),
    ];
    const previous = makePrevious({
      chamal: [
        { shiftIndex: 0, timeLabel: "22:00 – 06:00", assignedTo: "חמל ישן" },
        { shiftIndex: 1, timeLabel: "06:00 – 14:00", assignedTo: "" },
        { shiftIndex: 2, timeLabel: "14:00 – 22:00", assignedTo: "" },
      ],
    });

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18", previous);

    expect(result.chamal[0].assignedTo).toBe("חמל חדש");
  });

  it("should keep yesterday's full pilbox team", () => {
    const records = [
      createRecord("מפקד ב", "מפקד", "ז"),
      createRecord("נהג ב", "נהג", "ז"),
      createRecord("רחפן ב", "רחפן", "ז"),
      createRecord("חייל ב", "חייל", "ז"),
      createRecord("סמל א", "סמל", "ז"),
      createRecord("מפקד ישן", "מפקד", "ז"),
      createRecord("נהג ישן", "נהג", "ז"),
      ...Array.from({ length: 5 }, (_, i) => createRecord(`חייל ישן ${i}`, "חייל", "ז")),
      ...Array.from({ length: 10 }, (_, i) => createRecord(`חייל חדש ${i}`, "חייל", "ז")),
    ];
    const previous = makePrevious({
      missions: [
        { postType: "פילבוקס", slots: [
          { roleLabel: "סמל", requiredRole: "סמ", assignedTo: "סמל א" },
          { roleLabel: "מפקד", requiredRole: "מפקד", assignedTo: "מפקד ישן" },
          { roleLabel: "נהג", requiredRole: "נהג", assignedTo: "נהג ישן" },
          { roleLabel: "חייל 1", requiredRole: null, assignedTo: "חייל ישן 0" },
          { roleLabel: "חייל 2", requiredRole: null, assignedTo: "חייל ישן 1" },
          { roleLabel: "חייל 3", requiredRole: null, assignedTo: "חייל ישן 2" },
          { roleLabel: "חייל 4", requiredRole: null, assignedTo: "חייל ישן 3" },
          { roleLabel: "חייל 5", requiredRole: null, assignedTo: "חייל ישן 4" },
        ] },
      ],
    });

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18", previous);

    const pilboxNames = post(result, "פילבוקס")?.slots.map(s => s.assignedTo).filter(Boolean) || [];
    expect(pilboxNames).toContain("סמל א");
    expect(pilboxNames).toContain("מפקד ישן");
    expect(pilboxNames).toContain("נהג ישן");
    expect(pilboxNames).toContain("חייל ישן 0");
    expect(pilboxNames).toContain("חייל ישן 4");
  });

  it("should prefer yesterday's pilbox member over an equal-scored new candidate (−2 bonus)", () => {
    const records = [
      createRecord("סמל א", "סמל", "ז", "א"),
      createRecord("סמל ב", "סמל", "ז"),
      createRecord("סמל מ", "סמל", "ז"),
      ...Array.from({ length: 20 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז")),
    ];
    const previous = makePrevious({
      missions: [
        { postType: "פילבוקס", slots: [
          { roleLabel: "סמל", requiredRole: "סמ", assignedTo: "סמל א" },
          { roleLabel: "חייל 1", requiredRole: null, assignedTo: "חייל 0" },
          { roleLabel: "חייל 2", requiredRole: null, assignedTo: "חייל 1" },
          { roleLabel: "חייל 3", requiredRole: null, assignedTo: "חייל 2" },
          { roleLabel: "חייל 4", requiredRole: null, assignedTo: "חייל 3" },
          { roleLabel: "חייל 5", requiredRole: null, assignedTo: "חייל 4" },
          { roleLabel: "חייל 6", requiredRole: null, assignedTo: "חייל 5" },
          { roleLabel: "חייל 7", requiredRole: null, assignedTo: "חייל 6" },
        ] },
      ],
    });

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18", previous);

    const sergeant = post(result, "פילבוקס")?.slots[0].assignedTo;
    expect(sergeant).toBe("סמל ב");
  });
});

describe("generateAssignment - tomorrow leavers", () => {
  const tomorrowRecords = (leaving: string[]): AttendanceRecord[] =>
    Array.from({ length: 30 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז", leaving.includes(`חייל ${i}`) ? "א" : "1"));

  it("should exclude tomorrow-leavers from pilbox when alternatives exist", () => {
    const records = [
      createRecord("סמל א", "סמל", "ז"),
      createRecord("סמל יוצא", "סמל", "ז"),
      ...Array.from({ length: 15 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז")),
    ];
    const tomorrow = [
      createRecord("סמל א", "סמל", "ז", "1"),
      createRecord("סמל יוצא", "סמל", "ז", "א"),
      ...Array.from({ length: 15 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז", "1")),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18", null, [], tomorrow);

    const sergeant = post(result, "פילבוקס")?.slots[0].assignedTo;
    expect(sergeant).toBe("סמל א");
    const pilboxNames = post(result, "פילבוקס")?.slots.map(s => s.assignedTo).filter(Boolean) || [];
    expect(pilboxNames).not.toContain("סמל יוצא");
  });

it("should fall back to a tomorrow-leaver only when no alternative exists", () => {
    const records = [
      createRecord("סמל יחיד", "סמל", "ז"),
      createRecord("מפקד זמין", "מפקד", "ז"),
      createRecord("נהג זמין", "נהג", "ז"),
      createRecord("רחפן זמין", "רחפן", "ז"),
      createRecord("חייל זמין", "חייל", "ז"),
      createRecord("חייל יחיד", "חייל", "ז"),
    ];
    const tomorrowRecords = [
      createRecord("סמל יחיד", "סמל", "ז", "א"),
      createRecord("חייל יחיד", "חייל", "ז", "א"),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18", null, [], tomorrowRecords);

    const pilboxNames = post(result, "פילבוקס")?.slots.map(s => s.assignedTo).filter(Boolean) || [];
    expect(pilboxNames.length).toBeGreaterThan(1);
    expect(pilboxNames).toContain("סמל יחיד");
    expect(pilboxNames).toContain("חייל יחיד");
  });
});

describe("generateAssignment - חפ\"ק", () => {
  it("should mark hapak inactive when no חפק team exists", () => {
    const records = [createRecord("חייל א", "חייל", "ז")];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(result.hapak[0].name).toContain("לא פעיל");
    expect(result.hapak[0].assignedTo).toBe("");
  });

  it("should assign רז חיון as hapak commander and team members with role labels", () => {
    const records = [
      createRecord("רז חיון", "חפק", "ז"),
      createRecord("חפק 2", "חפק", "ז"),
      createRecord("חפק 3", "חפק", "ז"),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(result.hapak[0].assignedTo).toBe("רז חיון");
    expect(result.hapak[0].name).toContain("מפקד");
    expect(result.hapak[1].assignedTo).toBe("חפק 2");
    expect(result.hapak[2].assignedTo).toBe("חפק 3");
  });

  it("should mark returning team members with 'בדרך חזרה' suffix", () => {
    const records = [
      createRecord("רז חיון", "חפק", "ז"),
      createRecord("חפק חוזר", "חפק", "ז", "4"),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    const returning = result.hapak.find(h => h.assignedTo === "חפק חוזר");
    expect(returning?.name).toContain("בדרך חזרה");
  });
});

describe("generateAssignment - extras (קצין תורן / רס\"פ / חייל נוסף)", () => {
  const roster = () => [
    createRecord("קצין תורן א", "קצין", "ז"),
    createRecord("מפקד א", "מפקד", "ז"),
    createRecord("סמל א", "סמל", "ז"),
    createRecord("נהג א", "נהג", "ז"),
    createRecord("רספ א", "רס\"פ", "ז"),
    ...Array.from({ length: 20 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז")),
  ];

  it("should assign a קצין תורן when an officer is available", () => {
    const result = generateAssignment(roster(), {}, [], new Set(), "2026-08-18");

    const duty = post(result, "קצין תורן");
    expect(duty).toBeDefined();
    expect(duty!.slots[0].assignedTo).toBe("קצין תורן א");
  });

  it("should not create a קצין תורן post when no officer is available", () => {
    const records = roster().filter(r => r.name !== "קצין תורן א");
    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(post(result, "קצין תורן")).toBeUndefined();
  });

  it("should assign a regular soldier as תורן רס\"פ, never a commander/sergeant/officer", () => {
    const result = generateAssignment(roster(), {}, [], new Set(), "2026-08-18");

    const rasap = post(result, "תורן רס\"פ");
    expect(rasap).toBeDefined();
    expect(["מפקד א", "סמל א", "קצין תורן א", "רספ א"]).not.toContain(rasap!.slots[0].assignedTo);
  });

  it("should not create a רס\"פ post when only excluded roles remain", () => {
    const records = [
      createRecord("מפקד בלבד", "מפקד", "ז"),
      createRecord("סמל בלבד", "סמל", "ז"),
      createRecord("קצין בלבד", "קצין", "ז"),
      createRecord("מנהלה בלבד", "מנהלה", "ז"),
      createRecord("רספ בלבד", "רס\"פ", "ז"),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(post(result, "תורן רס\"פ")).toBeUndefined();
  });

  it("should add at most 1 extra pilbox soldier", () => {
    const result = generateAssignment(roster(), {}, [], new Set(), "2026-08-18");

    const pilbox = post(result, "פילבוקס")!;
    expect(pilbox.slots.length).toBeLessThanOrEqual(9);
    const extras = pilbox.slots.filter(s => s.roleLabel.includes("חייל נוסף"));
    expect(extras.length).toBeLessThanOrEqual(1);
  });
});

describe("generateAssignment - exclusions & edge cases", () => {
  it("should never assign a מ\"פ/מפ role to any post", () => {
    const records = [
      createRecord("מפ א", "מ\"פ", "ז"),
      createRecord("מנהלה א", "מנהלה", "ז"),
      createRecord("סמל א", "סמל", "ז"),
      ...Array.from({ length: 20 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז")),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(allAssigned(result)).not.toContain("מפ א");
  });

  it("should respect blocked names", () => {
    const records = [
      createRecord("סמל א", "סמל", "ז"),
      createRecord("חמל א", "חמל", "ז"),
      ...Array.from({ length: 20 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז")),
    ];

    const result = generateAssignment(records, {}, [], new Set(["סמל א", "חמל א"]), "2026-08-18");

    expect(allAssigned(result)).not.toContain("סמל א");
    expect(allAssigned(result)).not.toContain("חמל א");
  });

  it("should assign returning ('4') soldiers", () => {
    const records = [
      createRecord("חמל חוזר", "חמל", "ז", "4"),
      createRecord("חייל חוזר", "חייל", "ז", "4"),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(result.chamal[0].assignedTo).toBe("חמל חוזר");
  });

  it("should leave all posts empty when everyone is leaving today", () => {
    const records = [
      createRecord("חמל יוצא", "חמל", "ז", "יא"),
      createRecord("סמל יוצא", "סמל", "ז", "יא"),
      ...Array.from({ length: 15 }, (_, i) => createRecord(`חייל יוצא ${i}`, "חייל", "ז", "יא")),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    expect(result.chamal.every(c => c.assignedTo === "")).toBe(true);
    const pilbox = post(result, "פילבוקס");
    expect(pilbox!.slots.every(s => !s.assignedTo)).toBe(true);
    expect(result.hapak[0].name).toContain("לא פעיל");
  });

  it("should not crash on empty records", () => {
    const result = generateAssignment([], {}, [], new Set(), "2026-08-18");

    expect(result.chamal).toHaveLength(3);
    expect(result.missions.length).toBeGreaterThanOrEqual(3);
    expect(result.hapak[0].name).toContain("לא פעיל");
  });

  it("should never assign the same person to two posts", () => {
    const records = [
      createRecord("קצין תורן א", "קצין", "ז"),
      createRecord("מפקד א", "מפקד", "ז"),
      createRecord("סמל א", "סמל", "ז"),
      createRecord("סמל ב", "סמל", "ז"),
      createRecord("נהג א", "נהג", "ז"),
      createRecord("נהג ב", "נהג", "ז"),
      createRecord("חמל א", "חמל", "ז"),
      createRecord("חמל ב", "חמל", "ז"),
      createRecord("חמל ג", "חמל", "ז"),
      ...Array.from({ length: 25 }, (_, i) => createRecord(`חייל ${i}`, "חייל", "ז")),
    ];

    const result = generateAssignment(records, {}, [], new Set(), "2026-08-18");

    const assigned = allAssigned(result).filter(Boolean);
    expect(new Set(assigned).size).toBe(assigned.length);
  });
});
