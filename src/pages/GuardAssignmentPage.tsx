import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMainAttendance } from "@/hooks/useAttendanceData";
import { getTodayIso, formatDateForApi, normalizeNameStr, getComputedPresence, formatDateShort, formatDateRange } from "@/lib/attendanceUtils";
import type { AttendanceRecord } from "@/types/attendance";
import DatePickerBar from "@/components/DatePickerBar";
import { LoadingOverlay, ErrorMessage } from "@/components/StatusMessages";
import { RefreshCw, Shield, ShieldOff, Users, Clock, Shuffle, CheckCircle2, Save, Trash2, Info, Camera, ChevronUp, ChevronDown, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, X as CloseX } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChamalShift {
  shiftIndex: 0 | 1 | 2;
  timeLabel: string;
  assignedTo: string;
}

interface MissionSlot {
  roleLabel: string;
  requiredRole: string | null;
  assignedTo: string;
}

interface MissionPost {
  postType: "יזומה" | "פילבוקס";
  slots: MissionSlot[];
}

interface HapakMission {
  id: number;
  memberIndex: number; // 1-4
  name: string;
  assignedTo: string;
  points: number;
}

interface AssignmentData {
  hapak: HapakMission[];
  chamal: ChamalShift[];
  missions: MissionPost[];
}

type PersonnelPoints = Record<string, number>;

// ─── Configuration ────────────────────────────────────────────────────────────

const HAPAK_MISSIONS = [
  { id: 1, name: "מ\"פ", key: "מפ" }
];

const CHAMAL_SHIFTS: { shiftIndex: 0 | 1 | 2; timeLabel: string; points: number }[] = [
  { shiftIndex: 0, timeLabel: "22:00 – 06:00", points: 3 },
  { shiftIndex: 1, timeLabel: "06:00 – 14:00", points: 2 },
  { shiftIndex: 2, timeLabel: "14:00 – 22:00", points: 2 },
];

const IZUMA_SLOTS = [
  { roleLabel: "מפקד", roleFilter: ["סמ", "מפקד"], points: 2 },
  { roleLabel: "נהג",   roleFilter: "נהג",   points: 2 },
  { roleLabel: "רחפן", roleFilter: ["רחפן", "חייל", "חובש", "מפקד"], points: 2 },
  { roleLabel: "חייל", roleFilter: ["חייל", "נהג", "חובש", "מפקד"], points: 2 },
];

const PILBOX_SLOTS = [
  { roleLabel: "סמל",    roleFilter: "סמ",   points: 3 },
  { roleLabel: "מפקד",  roleFilter: "מפקד", points: 3 },
  { roleLabel: "נהג",   roleFilter: "נהג",  points: 3 },
  { roleLabel: "חייל 1", roleFilter: ["חייל", "נהג", "חובש", "מפקד"], points: 3 },
  { roleLabel: "חייל 2", roleFilter: ["חייל", "נהג", "חובש", "מפקד"], points: 3 },
  { roleLabel: "חייל 3", roleFilter: ["חייל", "נהג", "חובש", "מפקד"], points: 3 },
  { roleLabel: "חייל 4", roleFilter: ["חייל", "נהג", "חובש", "מפקד"], points: 3 },
  { roleLabel: "חייל 5", roleFilter: ["חייל", "נהג", "חובש", "מפקד"], points: 3 },
];

const POINTS = {
  HAPAK: 3,
  CHAMAL_NIGHT: 3,
  CHAMAL_DAY: 2,
  PILBOX: 3,
  IZUMA: 2,
  RASAP: 1
};

const STORAGE_KEY = "guard_burden_points";
const BLOCKED_STORAGE_KEY = "guard_blocked_names";

// ─── Logic ────────────────────────────────────────────────────────────────────

const getYesterdayIso = (dateStr: string) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export function generateAssignment(
  records: AttendanceRecord[],
  history: PersonnelPoints,
  hapakRows: any[],
  blockedNames: Set<string>,
  date: string,
  previousAssignment: AssignmentData | null = null,
  yesterdayRecords: AttendanceRecord[] = []
): AssignmentData {

  try {
    if (!records) records = [];
    if (!hapakRows) hapakRows = [];

    const assignedNames = new Set<string>(blockedNames);

    const getPresenceFor = (p: AttendanceRecord | undefined) =>
      getComputedPresence(p, yesterdayRecords);

    const findRecord = (name: string) =>
      records.find(r => normalizeNameStr(r.name) === normalizeNameStr(name));

    const isPersonAvailable = (name: string): boolean => {
      if (!name) return false;
      const rec = findRecord(name);
      if (!rec) return false;
      const p = getPresenceFor(rec);
      const rawValue = String(rec.todayValue || "").trim();
      return (p !== "none" && p !== "leaving");
    };

    // Minimal-change: prefer keeping the previous assignment.
    // Only replace if the person is no longer available.
    const findBest = (roleFilters: string[] | string | null, preferName?: string, requiredGender?: "ז" | "נ"): string => {
      if (preferName && isPersonAvailable(preferName) && !assignedNames.has(normalizeNameStr(preferName))) {
        // If gender is required, check if preferName matches it
        if (!requiredGender || findRecord(preferName)?.gender === requiredGender) {
          return preferName;
        }
      }

      const filters = Array.isArray(roleFilters) ? roleFilters : [roleFilters];

      for (const filter of filters) {
        const candidates = records
          .filter(p => {
            const role = (p.role || "").trim();
            const norm = normalizeNameStr(p.name);
            const pres = getPresenceFor(p);
            if (pres === "none" || pres === "leaving") return false;
            if (assignedNames.has(norm)) return false;
            if (role.includes("מ\"פ") || role === "מפ") return false; // Exclude MP
            if (requiredGender && p.gender !== requiredGender) return false;
            
            if (filter) {
              if (filter === "חייל") {
                if (role.includes("מנהלה")) return false;
                if (!role.includes("חייל") && !role.includes("חובש")) return false;
              } else {
                if (!role.includes(filter)) return false;
              }
            }
            return true;
          })
          .sort((a, b) => {
            const aRole = (a.role || "").trim();
            const bRole = (b.role || "").trim();
            
            const aExact = filter ? aRole === filter : false;
            const bExact = filter ? bRole === filter : false;

            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            const aScore = (a.burdenPoints || 0) + (history[a.name] || 0);
            const bScore = (b.burdenPoints || 0) + (history[b.name] || 0);
            return aScore - bScore;
          });

        if (candidates.length > 0) {
          return candidates[0].name;
        }
      }
      return "";
    };

    // Helper for hypothetical assignments
    const getBestCandidate = (roleFilters: string[] | string | null, preferName?: string, genderReq?: "ז" | "נ", extraAssigned = new Set<string>()): string => {
      if (preferName && isPersonAvailable(preferName) && !assignedNames.has(normalizeNameStr(preferName)) && !extraAssigned.has(normalizeNameStr(preferName))) {
        if (!genderReq || findRecord(preferName)?.gender === genderReq) return preferName;
      }
      const filters = Array.isArray(roleFilters) ? roleFilters : [roleFilters];
      for (const filter of filters) {
        const candidates = records.filter(p => {
          const role = (p.role || "").trim();
          const norm = normalizeNameStr(p.name);
          const pres = getPresenceFor(p);
          if (pres === "none" || pres === "leaving") return false;
          if (assignedNames.has(norm) || extraAssigned.has(norm)) return false;
          if (role.includes("מ\"פ") || role === "מפ") return false;
          if (genderReq && p.gender !== genderReq) return false;
          if (filter) {
            if (filter === "חייל") {
              if (role.includes("מנהלה")) return false;
              if (!role.includes("חייל") && !role.includes("חובש")) return false;
            } else {
              if (!role.includes(filter)) return false;
            }
          }
          return true;
        }).sort((a, b) => {
          const aExact = filter ? (a.role || "").trim() === filter : false;
          const bExact = filter ? (b.role || "").trim() === filter : false;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return ((a.burdenPoints || 0) + (history[a.name] || 0)) - ((b.burdenPoints || 0) + (history[b.name] || 0));
        });
        if (candidates.length > 0) return candidates[0].name;
      }
      return "";
    };

    // ─── 0. Pilbox Sergeant (סמל פילבוקס) ──────────────────────────────
    // Pre-assign Pilbox Sergeant so they are not taken by Izuma
    const pilboxSergeantSlot = PILBOX_SLOTS[0]; // Assuming index 0 is סמל
    const prevPilbox = previousAssignment?.missions?.find(m => m.postType === "פילבוקס");
    const prevPilboxSergeant = prevPilbox?.slots?.[0]?.assignedTo;
    const assignedPilboxSergeant = getBestCandidate(pilboxSergeantSlot.roleFilter, prevPilboxSergeant);
    if (assignedPilboxSergeant) assignedNames.add(normalizeNameStr(assignedPilboxSergeant));
    let pilboxSergeantGender = "ז";
    if (assignedPilboxSergeant) {
      pilboxSergeantGender = findRecord(assignedPilboxSergeant)?.gender || "ז";
    }

    // ─── 1. חמל – 3 משמרות × אדם אחד מוגדר "חמל" ────────────────────────
    const chamal: ChamalShift[] = CHAMAL_SHIFTS.map(shift => {
      const prev = previousAssignment?.chamal?.find(c => c.shiftIndex === shift.shiftIndex)?.assignedTo;
      const assigned = getBestCandidate("חמל", prev);
      if (assigned) assignedNames.add(normalizeNameStr(assigned));
      return { shiftIndex: shift.shiftIndex, timeLabel: shift.timeLabel, assignedTo: assigned };
    });

    // Helper to build Izuma with gender constraints (2M/2F or 4M)
    const buildIzuma = (prevM: any): MissionSlot[] => {
      // Strategy: Try exactly 2 Females and 2 Males
      // We will try Female for the last 2 slots (Soldier, Drone) and Male for Commander, Driver
      const tryPattern = (genders: ("ז"| "נ" | undefined)[]): MissionSlot[] | null => {
        const tempAssigned = new Set<string>();
        const slots: MissionSlot[] = [];
        for (let i = 0; i < IZUMA_SLOTS.length; i++) {
          const slot = IZUMA_SLOTS[i];
          const prev = prevM?.slots?.[i]?.assignedTo;
          const assigned = getBestCandidate(slot.roleFilter, prev, genders[i], tempAssigned);
          if (!assigned && genders[i]) return null; // Failed to find required gender
          if (assigned) tempAssigned.add(normalizeNameStr(assigned));
          slots.push({ roleLabel: slot.roleLabel, requiredRole: slot.roleFilter, assignedTo: assigned });
        }
        return slots;
      };

      // Try 2F/2M (Commander=M, Driver=M, Drone=F, Soldier=F)
      let slots = tryPattern(["ז", "ז", "נ", "נ"]);
      if (!slots) {
        // Try all males if mixed fails
        slots = tryPattern(["ז", "ז", "ז", "ז"]);
      }
      if (!slots) {
        // Fallback without gender constraints
        slots = tryPattern([undefined, undefined, undefined, undefined]);
      }
      
      slots?.forEach(s => {
        if (s.assignedTo) assignedNames.add(normalizeNameStr(s.assignedTo));
      });
      return slots || [];
    };

    // ─── 2. יזומה ──────────────────────────────
    const prevIzuma = previousAssignment?.missions?.find(m => m.postType === "יזומה");
    const izumaSlots: MissionSlot[] = buildIzuma(prevIzuma);

    // ─── 3. פילבוקס ──────────────────────────────
    // We already assigned Sergeant (slot 0)
    // Needs 3-4 females if females are used. Sergeant counts.
    const buildPilboxSlots = (): MissionSlot[] => {
      const remainingSlots = PILBOX_SLOTS.slice(1);
      
      const tryPattern = (genders: ("ז"|"נ" | undefined)[]): MissionSlot[] | null => {
        const tempAssigned = new Set<string>();
        const slots: MissionSlot[] = [{ roleLabel: pilboxSergeantSlot.roleLabel, requiredRole: pilboxSergeantSlot.roleFilter, assignedTo: assignedPilboxSergeant }];
        let femaleCount = pilboxSergeantGender === "נ" ? 1 : 0;
        
        for (let i = 0; i < remainingSlots.length; i++) {
          const slot = remainingSlots[i];
          const prev = prevPilbox?.slots?.[i + 1]?.assignedTo;
          const assigned = getBestCandidate(slot.roleFilter, prev, genders[i], tempAssigned);
          if (!assigned && genders[i]) return null;
          if (assigned) {
            tempAssigned.add(normalizeNameStr(assigned));
            if (findRecord(assigned)?.gender === "נ") femaleCount++;
          }
          slots.push({ roleLabel: slot.roleLabel, requiredRole: slot.roleFilter, assignedTo: assigned });
        }
        
        // Validation for females
        if (femaleCount > 0 && femaleCount < 3) return null;
        
        return slots;
      };
      
      // We need 7 more people. Let's try 3 females out of 7 (if sergeant is male, we need 3 females. If sergeant is female, we need 2 more)
      // We will assign females to the last N "חייל" slots.
      let numFemalesNeeded = pilboxSergeantGender === "נ" ? 2 : 3;
      const patternMixed: ("ז"|"נ" | undefined)[] = ["ז", "ז", "ז", "ז", "ז", "ז", "ז"];
      // Fill the last `numFemalesNeeded` with "נ"
      for (let i = 0; i < numFemalesNeeded; i++) patternMixed[6 - i] = "נ";
      
      let slots = tryPattern(patternMixed);
      if (!slots) {
        // Try all males
        slots = tryPattern(["ז", "ז", "ז", "ז", "ז", "ז", "ז"]);
      }
      if (!slots) {
        // Fallback
        slots = tryPattern([undefined, undefined, undefined, undefined, undefined, undefined, undefined]);
      }
      
      slots?.forEach(s => {
        if (s.assignedTo && s.assignedTo !== assignedPilboxSergeant) assignedNames.add(normalizeNameStr(s.assignedTo));
      });
      return slots || [];
    };

    const pilboxSlots: MissionSlot[] = buildPilboxSlots();

    // ─── 3.5. יזומה ב ──────────────────────────────
    const prevIzumaB = previousAssignment?.missions?.find(m => m.postType === "יזומה ב");
    const izumaBSlots: MissionSlot[] = buildIzuma(prevIzumaB);

    const missions: MissionPost[] = [
      { postType: "יזומה",   slots: izumaSlots  },
      { postType: "פילבוקס", slots: pilboxSlots },
      { postType: "יזומה ב", slots: izumaBSlots },
    ];

    // ─── 4. חפ"ק – רק אם הצוות הרלוונטי נמצא ────────────────────────────
    const hapakAssignments: HapakMission[] = [];

    const getStatus = (name: string): "full" | "leaving" | "returning" | "none" => {
      const normalized = normalizeNameStr(name);
      const p = records.find(r => normalizeNameStr(r.name) === normalized);
      const pres = getPresenceFor(p);
      return pres === "leaving" ? "none" : pres;
    };

    for (const mission of HAPAK_MISSIONS) {
      let currentMemberIndex = 1;

      // Filter anyone who has "חפק" / "חפ"ק" in their role or department
      const missionTeam = records.filter(r => {
        const role = String(r.role || "").trim();
        const dept = String(r.department || "").trim();
        return role.includes("חפק") || role.includes("חפ\"ק") || dept.includes("חפק") || dept.includes("חפ\"ק");
      });
      
      const presentTeam = missionTeam.filter(r => getStatus(r.name) !== "none");

      if (presentTeam.length === 0) {
        hapakAssignments.push({
          id: mission.id, memberIndex: 1,
          name: `חפ"ק ${mission.name} - לא פעיל`,
          assignedTo: "", points: 0,
        });
        continue;
      }

      // Ensure Commander is Raz Hayun
      const razNorm = normalizeNameStr("רז חיון");
      const razRecord = presentTeam.find(p => normalizeNameStr(p.name) === razNorm);
      
      let commanderName = "רז חיון";
      if (razRecord && !assignedNames.has(razNorm)) {
        assignedNames.add(razNorm);
        commanderName = razRecord.name.trim();
      } else {
        assignedNames.add(razNorm);
      }

      hapakAssignments.push({
        id: mission.id,
        memberIndex: currentMemberIndex++,
        name: `חפ"ק ${mission.name} - מפקד`,
        assignedTo: commanderName,
        points: POINTS.HAPAK,
      });

      for (const p of presentTeam) {
        const norm = normalizeNameStr(p.name);
        if (!assignedNames.has(norm)) {
          assignedNames.add(norm);
          const pStatus = getStatus(p.name);
          const suffix = pStatus === "returning" ? " (בדרך חזרה)" : "";
          const roleLabel = (p.role && p.role.trim() !== "") ? p.role.trim() : "לוחם";
          hapakAssignments.push({
            id: mission.id,
            memberIndex: currentMemberIndex++,
            name: `חפ"ק ${mission.name} - ${roleLabel}${suffix}`,
            assignedTo: p.name.trim(),
            points: POINTS.HAPAK,
          });
        }
      }

      // Ensure at least 4 slots for the UI layout
      while (currentMemberIndex <= 4) {
        hapakAssignments.push({
          id: mission.id,
          memberIndex: currentMemberIndex++,
          name: `חפ"ק ${mission.name} - עמדה ${currentMemberIndex - 1}`,
          assignedTo: "",
          points: POINTS.HAPAK,
        });
      }
    }

    // ─── 4.5. תורן רס"פ ──────────────────────────────
    const rasapCandidates = records.filter(p => {
      const norm = normalizeNameStr(p.name);
      if (assignedNames.has(norm)) return false;
      const pres = getPresenceFor(p);
      const rawValue = String(p.todayValue || "").trim();
      const isAvailable = (pres !== "none" && pres !== "leaving");
      if (!isAvailable) return false;
      
      const role = (p.role || "").trim();
      // Not a commander, sergeant, officer, rasap, or minhala
      if (role.includes("מפקד") || role.includes("סמ") || role.includes("סמל") || role.includes("קצין") || role.includes("רספ") || role.includes("רס\"פ") || role.includes("מנהלה")) return false;
      if (role.includes("מ\"פ") || role === "מפ") return false;
      
      return true;
    }).sort((a, b) => {
      const aScore = (a.burdenPoints || 0) + (history[a.name] || 0);
      const bScore = (b.burdenPoints || 0) + (history[b.name] || 0);
      return aScore - bScore;
    });

    if (rasapCandidates.length > 0) {
      const chosen = rasapCandidates[0];
      assignedNames.add(normalizeNameStr(chosen.name));
      missions.push({
        postType: "תורן רס\"פ",
        slots: [{
          roleLabel: "תורן",
          requiredRole: null,
          assignedTo: chosen.name.trim()
        }]
      });
    }

    // ─── 5. הוספת חיילים פנויים נוספים לפילבוקס ──────────────────────────────
    const unassignedSoldiers = records.filter(p => {
      const norm = normalizeNameStr(p.name);
      if (assignedNames.has(norm)) return false;
      const pres = getPresenceFor(p);
      const rawValue = String(p.todayValue || "").trim();
      const role = String(p.role || "").trim();
      if (role.includes("מנהלה")) return false;
      if (role.includes("מ\"פ") || role === "מפ") return false;
      return (pres !== "none" && pres !== "leaving");
    }).sort((a, b) => {
      const aScore = (a.burdenPoints || 0) + (history[a.name] || 0);
      const bScore = (b.burdenPoints || 0) + (history[b.name] || 0);
      return aScore - bScore;
    });

    let extraIndex = 1;
    for (const p of unassignedSoldiers) {
      if (extraIndex > 1) break; // Limit to maximum 1 extra soldier
      assignedNames.add(normalizeNameStr(p.name));
      pilboxSlots.push({
        roleLabel: `חייל נוסף ${extraIndex++}`,
        requiredRole: null,
        assignedTo: p.name.trim()
      });
    }

    return { hapak: hapakAssignments, chamal, missions };
  } catch (error) {
    console.error("Critical error in generateAssignment:", error);
    throw error;
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function PersonnelSwap({
  currentName,
  allPersonnel,
  onSwap,
  readonly,
  allowEmpty,
  type,
  currentAssignments,
  yesterdayRecords = []
}: {
  currentName: string;
  allPersonnel: AttendanceRecord[];
  onSwap: (newName: string) => void;
  readonly?: boolean;
  allowEmpty?: boolean;
  type: "hapak" | "guard";
  currentAssignments?: AssignmentData | null;
  yesterdayRecords?: AttendanceRecord[];
}) {
  const [open, setOpen] = useState(false);

  const available = useMemo(() => {
    if (!allPersonnel || !Array.isArray(allPersonnel)) return [];
    try {
      return allPersonnel
        .filter(p => {
          const presence = getComputedPresence(p, yesterdayRecords);
          const rawValue = String(p.todayValue || "").trim();
          if (presence === "none" || presence === "leaving") return false;
          return true;
        })
        .map(p => {
          const alreadyAssigned =
            currentAssignments?.hapak?.some(h => normalizeNameStr(h.assignedTo) === normalizeNameStr(p.name)) ||
            currentAssignments?.chamal?.some(c => normalizeNameStr(c.assignedTo) === normalizeNameStr(p.name)) ||
            currentAssignments?.missions?.some(m => m.slots.some(s => normalizeNameStr(s.assignedTo) === normalizeNameStr(p.name)));
          return { ...p, alreadyAssigned: alreadyAssigned && normalizeNameStr(p.name) !== normalizeNameStr(currentName) };
        })
        .sort((a, b) => {
          if (a.alreadyAssigned && !b.alreadyAssigned) return 1;
          if (!a.alreadyAssigned && b.alreadyAssigned) return -1;
          return (a.burdenPoints || 0) - (b.burdenPoints || 0);
        });
    } catch (err) {
      console.error("Error in PersonnelSwap available useMemo:", err);
      return [];
    }
  }, [allPersonnel, currentName, currentAssignments, yesterdayRecords]);



  const person = useMemo(() => (allPersonnel || []).find(p => p && p.name === currentName), [allPersonnel, currentName]);
  const presence = getComputedPresence(person, yesterdayRecords);
  
  const statusDot = useMemo(() => {
    if (!currentName || currentName === "לא מאויש" || currentName === "טרם שובץ") return null;
    let color = "bg-green-500";
    if (presence === "leaving") color = "bg-amber-500";
    else if (presence === "returning") color = "bg-blue-500";
    return <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", color)} />;
  }, [currentName, presence]);

  if (readonly) {
    return (
      <span className="font-bold text-right py-1 flex items-center gap-1.5 whitespace-nowrap">
        {statusDot}
        {String(currentName || "")}
      </span>
    );
  }

  const isMobile = useIsMobile();

  const SelectionContent = (
    <Command className="border-none">
      <CommandInput placeholder="חפש חייל..." className="h-10 text-right" dir="rtl" autoFocus={!isMobile} />
      <CommandList className={cn("overflow-y-auto", isMobile ? "max-h-[50vh]" : "max-h-[300px]")}>
        <CommandEmpty>לא נמצאו חיילים.</CommandEmpty>
        <CommandGroup>
          {allowEmpty && (
            <CommandItem
              value="ריק ללא שיבוץ"
              onSelect={() => {
                onSwap("");
                setOpen(false);
              }}
              className="flex items-center justify-between text-muted-foreground italic font-normal py-2 px-3"
            >
              <span>(ריק) - ללא שיבוץ</span>
              {(!currentName || currentName === "לא מאויש") && <Check className="w-4 h-4 text-primary" />}
            </CommandItem>
          )}
          {available.map((p) => (
            <CommandItem
              key={p.name}
              value={p.name}
              onSelect={(currentValue) => {
                onSwap(currentValue);
                setOpen(false);
              }}
              className={cn(
                "flex items-center justify-between py-2 px-3 border-b border-border/40 last:border-0",
                p.gapConflict && "opacity-60 bg-red-500/5"
              )}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 text-right" dir="rtl">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full shrink-0",
                     getComputedPresence(p, yesterdayRecords) === "leaving" ? "bg-amber-500" : 
                     getComputedPresence(p, yesterdayRecords) === "returning" ? "bg-blue-500" : "bg-green-500"
                   )} />
                   <span className="font-bold truncate text-sm">{p.name}</span>
                   <span className={cn(
                     "text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums shrink-0 ml-auto",
                     p.burdenPoints > 10 ? "bg-orange-100 text-orange-700" : "bg-blue-50/80 text-blue-700"
                   )}>
                     {p.burdenPoints || 0}
                   </span>
                </div>
                {p.gapConflict && (
                  <div className="flex items-center gap-1.5 text-[9px] text-red-600 mt-0.5 font-bold text-right" dir="rtl">
                    <Clock className="w-2.5 h-2.5" />
                    מרווח קטן מדי: {p.gapHours} שעות
                  </div>
                )}
              </div>
              {currentName === p.name && <Check className="w-4 h-4 text-primary animate-in zoom-in ml-2" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const isEmpty = !currentName || currentName === "לא מאויש" || currentName === "טרם שובץ";

  const trigger = (
    <button className={cn(
      "font-bold hover:text-primary transition-all text-right flex items-center gap-1.5 group whitespace-nowrap min-h-[32px]",
      isEmpty
        ? "border border-dashed border-border bg-muted/40 rounded-lg px-2 py-1 text-muted-foreground italic font-normal hover:border-primary/50 hover:bg-muted"
        : "px-2 py-1 rounded-lg hover:bg-muted/60"
    )}>
      {statusDot}
      <span className="truncate max-w-[120px]">
        {isEmpty ? "ריק / ללא שיבוץ" : currentName}
      </span>
      <Shuffle className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent className="px-0 pb-4 max-h-[60vh] w-full max-w-[420px] mx-auto rounded-t-[2rem]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-4 mt-2" />
          <DrawerHeader className="pb-2 px-4 flex items-center justify-between space-y-0 text-right">
            <DrawerTitle className="text-right w-full text-base font-black">בחירת חייל לשיבוץ</DrawerTitle>
            <DrawerClose asChild>
                <button className="p-3 rounded-full hover:bg-muted mr-2" aria-label="סגור"><CloseX className="w-4 h-4"/></button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            {SelectionContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px]" align="start">
        {SelectionContent}
      </PopoverContent>
    </Popover>
  );
}

function CommanderAuthOverlay({ isOpen, onClose, isAuthenticated }: { isOpen: boolean; onClose: () => void; isAuthenticated: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300">
      <div className="bg-card border border-border p-8 sm:p-10 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-[420px] w-full animate-in zoom-in-95 duration-300 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          aria-label="סגור"
        >
          <CloseX className="w-5 h-5" />
        </button>
        
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-black text-primary mb-2">גישת מפקדים בלבד</h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          {isAuthenticated 
            ? "דרושה הרשאת שיבוץ (Guard) כדי לבצע פעולות עריכה." 
            : "אנא הזדהה באמצעות חשבון Google כדי לעדכן ולערוך את שיבוץ השמירות."}
        </p>
        
        <div id="google-signin-btn-commander" className="bg-white rounded-lg p-0.5 overflow-hidden border border-border h-[44px] flex items-center justify-center min-w-[250px] transition-all hover:shadow-md">
          {/* Button rendered by useRoleAuth */}
        </div>
        
        <button 
          onClick={onClose}
          className="mt-8 text-sm font-bold text-muted-foreground hover:text-primary transition-colors py-2 px-4"
        >
          חזרה לתצוגת חייל
        </button>
      </div>
    </div>
  );
}


// ─── Logic ────────────────────────────────────────────────────────────────────
function generateAggregatedHistory(history: Record<string, PersonnelPoints>): PersonnelPoints {
  const aggregated: PersonnelPoints = {};
  Object.values(history).forEach((dayPoints) => {
    Object.entries(dayPoints).forEach(([name, points]) => {
      aggregated[name] = (aggregated[name] || 0) + points;
    });
  });
  return aggregated;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuardAssignmentPage({ mode = "soldier" }: { mode?: "soldier" | "commander" }) {
  const { isAuthenticated, checkPermission, user } = useAuth();
  const isAuthorized = mode === "commander" || (isAuthenticated && user?.authorizedRolls?.includes('guard'));

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showAuthButton, setShowAuthButton] = useState(false);

  const authError = null;
  const resetError = () => {};

  const getDateFromUrl = () => {
    try {
      const m = window.location.hash.match(/[?&]date=(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  };

  const [date, setDate] = useState<string>(() => getDateFromUrl() || getTodayIso());

  const changeDate = (d: string) => {
    setDate(d);
    try {
      const base = window.location.hash.split("?")[0];
      window.history.replaceState(null, "", `${base}?date=${d}`);
    } catch {
      // ignore
    }
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useMainAttendance(date);
  const yesterdayIsoDate = useMemo(() => getYesterdayIso(date), [date]);
  const { data: yesterdayAttendanceData } = useMainAttendance(yesterdayIsoDate);
  const [assignments, setAssignments] = useState<AssignmentData | null>(null);
  const [loadedAssignments, setLoadedAssignments] = useState<AssignmentData | null>(null);
  // history now stores points per date: { [date]: { [name]: points } }
  const [history, setHistory] = useState<Record<string, PersonnelPoints>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [hapakData, setHapakData] = useState<any[]>([]);
  const [blockedNames, setBlockedNames] = useState<Set<string>>(new Set());

  const availablePersonnel = useMemo(() => {
    if (!data || !assignments) return [];
    const assigned = new Set<string>();
    assignments.hapak.forEach(h => {
      if (h.assignedTo && h.assignedTo !== "טרם שובץ") assigned.add(normalizeNameStr(h.assignedTo));
    });
    assignments.chamal.forEach(c => {
      if (c.assignedTo) assigned.add(normalizeNameStr(c.assignedTo));
    });
    assignments.missions.forEach(m => {
      m.slots.forEach(s => { if (s.assignedTo) assigned.add(normalizeNameStr(s.assignedTo)); });
    });
    blockedNames.forEach(name => assigned.add(normalizeNameStr(name)));

    return data.filter(p => {
      const presence = getComputedPresence(p, yesterdayAttendanceData);
      const rawValue = String(p.todayValue || "").trim();
      if (presence === "none" || presence === "leaving") return false;
      if (assigned.has(normalizeNameStr(p.name))) return false;
      const role = (p.role || "").trim();
      if (role.includes("מ\"פ") || role === "מפ") return false;
      const ELIGIBLE_ROLES = [
        "חייל", "קצין", "סמל", "סמ\"ר", "סמ\"ל", "סמר",
        "מפקד", "חובש", "מהנדס", "אוכלוסיה", "אנוח", "שו\"ב",
        "חמל", "נהג", "רחפן",
      ];
      return ELIGIBLE_ROLES.some(eligible => role.includes(eligible));
    });
  }, [data, assignments, blockedNames]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingHapak, setIsExportingHapak] = useState(false);
  const [isSavingToSheet, setIsSavingToSheet] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLedgerCollapsed, setIsLedgerCollapsed] = useState(false);
  const [isHapakCollapsed, setIsHapakCollapsed] = useState(false);
  const [isChamalCollapsed, setIsChamalCollapsed] = useState(false);
  const [isMissionsCollapsed, setIsMissionsCollapsed] = useState(false);
  const [isAvailableCollapsed, setIsAvailableCollapsed] = useState(false);

  const handleExportHapak = async () => {
    if (!assignments || !assignments.hapak || assignments.hapak.length === 0) {
      toast.error("אין נתוני חפ\"ק לייצוא.");
      return;
    }
    try {
      setIsExportingHapak(true);
      toast.info("מכין תמונת חפ\"ק להורדה...");

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const scale = 3; // higher DPI for sharp mobile screens
      const W = 390; // mobile-friendly width (iPhone standard)

      // --- Layout constants ---
      const PAD = 16;
      const ROW_H = 44;
      const MISSION_GAP = 12;
      const TITLE_H = 56;
      const SUBTITLE_H = 38;
      const HEADER_H = TITLE_H + 10;

      // Group hapak by mission id
      const groups = HAPAK_MISSIONS.map(m => ({
        name: `חפ"ק ${m.name}`,
        rows: assignments.hapak
          .filter(h => h.id === m.id)
          .sort((a, b) => a.memberIndex - b.memberIndex)
      }));

      // Calculate total height
      let totalH = HEADER_H + PAD;
      for (const g of groups) {
        totalH += SUBTITLE_H + g.rows.length * ROW_H + MISSION_GAP;
      }
      totalH += PAD;

      canvas.width = W * scale;
      canvas.height = totalH * scale;
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, totalH);

      // Title
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, TITLE_H);
      ctx.fillStyle = '#ffffff';
      const dateRange = formatDateRange(date);

      ctx.fillText(`שיבוץ חפ"ק - ${dateRange}`, W - PAD, TITLE_H / 2 + 8);

      let y = HEADER_H + PAD;

      for (const group of groups) {
        // Mission header
        ctx.fillStyle = '#e8eeff';
        ctx.fillRect(PAD / 2, y - 2, W - PAD, SUBTITLE_H);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(group.name, W - PAD, y + SUBTITLE_H / 2 + 5);
        y += SUBTITLE_H + 4;

        for (const row of group.rows) {
          // Alternating row
          const isOdd = group.rows.indexOf(row) % 2 !== 0;
          ctx.fillStyle = isOdd ? '#f5f5f5' : '#ffffff';
          ctx.fillRect(PAD / 2, y, W - PAD, ROW_H);

          // Role (right side) - truncate if too long
          ctx.fillStyle = '#666';
          ctx.font = '13px Arial';
          const role = row.name.includes(' - ') ? row.name.split(' - ').slice(1).join(' - ') : row.name;
          ctx.textAlign = 'right';
          ctx.fillText(role, W - PAD, y + ROW_H / 2 + 5);

          // Name (left side)
          ctx.fillStyle = row.assignedTo ? '#1a1a2e' : '#aaa';
          ctx.font = row.assignedTo ? 'bold 14px Arial' : '13px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(row.assignedTo || '(לא שובץ)', PAD, y + ROW_H / 2 + 5);

          // Bottom border
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(PAD / 2, y + ROW_H);
          ctx.lineTo(W - PAD / 2, y + ROW_H);
          ctx.stroke();

          y += ROW_H;
        }
        y += MISSION_GAP;
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `hapak-schedule-${date}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("תמונת החפ\"ק נשמרה בהצלחה!");
    } catch (error) {
      console.error("Failed to export hapak image", error);
      toast.error("שגיאה בשמירת התמונה.");
    } finally {
      setIsExportingHapak(false);
    }
  };

  const handleExportImage = async () => {
    if (!assignments) {
      toast.error("אין נתוני שמירות לייצוא.");
      return;
    }
    const hasMissions = assignments.missions && assignments.missions.length > 0;
    const hasChamal = assignments.chamal && assignments.chamal.length > 0;
    
    if (!hasMissions && !hasChamal) {
      toast.error("אין נתוני שמירות לייצוא.");
      return;
    }
    
    try {
      setIsExporting(true);
      toast.info("מכין תמונת שמירות להורדה...");

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const scale = 3;
      const W = 390;
      const PAD = 14;
      const ROW_H = 38;
      const MISSION_GAP = 12;
      const TITLE_H = 56;
      const SUBTITLE_H = 38;
      const HEADER_H = TITLE_H + 10;

      const groups: { name: string; rows: { name: string; assignedTo: string }[] }[] = [];
      
      if (hasChamal) {
        groups.push({
          name: "חמ\"ל",
          rows: assignments.chamal.map(c => ({ name: c.timeLabel, assignedTo: c.assignedTo }))
        });
      }
      if (hasMissions) {
        assignments.missions.forEach(m => {
          groups.push({
            name: `עמדה - ${m.postType}`,
            rows: m.slots.map(s => ({ name: s.roleLabel, assignedTo: s.assignedTo }))
          });
        });
      }

      let totalH = HEADER_H + PAD;
      for (const g of groups) {
        totalH += SUBTITLE_H + g.rows.length * ROW_H + MISSION_GAP;
      }
      totalH += PAD;

      canvas.width = W * scale;
      canvas.height = totalH * scale;
      ctx.scale(scale, scale);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, totalH);

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, TITLE_H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      const dateRange = formatDateRange(date);

      ctx.fillText(`לו"ז עמדות וחמ"ל - ${dateRange}`, W - PAD, TITLE_H / 2 + 8);

      let y = HEADER_H + PAD;

      for (const group of groups) {
        ctx.fillStyle = '#e8eeff';
        ctx.fillRect(PAD / 2, y - 2, W - PAD, SUBTITLE_H);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(group.name, W - PAD, y + SUBTITLE_H / 2 + 5);
        y += SUBTITLE_H + 4;

        for (const row of group.rows) {
          const isOdd = group.rows.indexOf(row) % 2 !== 0;
          ctx.fillStyle = isOdd ? '#f5f5f5' : '#ffffff';
          ctx.fillRect(PAD / 2, y, W - PAD, ROW_H);

          ctx.fillStyle = '#666';
          ctx.font = '13px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(row.name, W - PAD, y + ROW_H / 2 + 5);

          ctx.fillStyle = row.assignedTo ? '#1a1a2e' : '#aaa';
          ctx.font = row.assignedTo ? 'bold 14px Arial' : '13px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(row.assignedTo || '(לא שובץ)', PAD, y + ROW_H / 2 + 5);

          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(PAD / 2, y + ROW_H);
          ctx.lineTo(W - PAD / 2, y + ROW_H);
          ctx.stroke();

          y += ROW_H;
        }
        y += MISSION_GAP;
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `guard-schedule-${date}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("תמונת השמירות נשמרה בהצלחה!");
    } catch (error) {
      console.error("Failed to export guard image", error);
      toast.error("שגיאה בשמירת התמונה.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const savedBlocked = localStorage.getItem(BLOCKED_STORAGE_KEY);
    if (savedBlocked) {
      try {
        setBlockedNames(new Set(JSON.parse(savedBlocked)));
      } catch (e) {
        console.error("Failed to parse blocked names", e);
      }
    }
  }, []);

  const fetchSavedAssignment = async (targetDate: string) => {
    try {
      const response = await fetch(`https://151.145.89.228.sslip.io/webhook/load-guards?date=${formatDateForApi(targetDate)}`);
      if (!response.ok) return null;
      const text = await response.text();
      if (!text || text.trim() === "") return null;
      const data = JSON.parse(text);
      if (data && data.status === "not_found") return null;
      return data as AssignmentData;
    } catch (e) {
      console.error("Load API Error:", e);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      if (data && data.length > 0) {
        const saved = await fetchSavedAssignment(date);
        if (saved) {
          setAssignments(saved);
          setLoadedAssignments(saved);
          setIsSaved(true);
        } else {
          setLoadedAssignments(null);
          if (isAuthorized) {
            const yesterday = getYesterdayIso(date);
            const yesterdayData = await fetchSavedAssignment(yesterday);
            const aggregatedHistory = generateAggregatedHistory(history);
            setAssignments(generateAssignment(data, aggregatedHistory, [], blockedNames, date, yesterdayData, yesterdayAttendanceData || []));
            setIsSaved(false);
          } else {
            setAssignments(null);
            setIsSaved(true);
          }
        }
      }
    };
    init();
  }, [date, history, isAuthenticated, blockedNames, data]);

  const handleGenerate = async () => {
    if (!isAuthorized) {
      toast.error("אין לך הרשאה לבצע שיבוץ (נדרשת הרשאת guard)");
      return;
    }
    setIsGenerating(true);
    setAssignments(null); // Clear UI during generation
    
    try {
      // Reload everything before generating to ensure latest changes from Excel/spreadsheet are used
      const { data: latestData } = await refetch();
      
      const yesterday = getYesterdayIso(date);
      const yesterdayData = await fetchSavedAssignment(yesterday);

      if (!latestData) {
        toast.error("נכשל בטעינת נתונים עדכניים. הגנרוט הופסק.");
        return;
      }

      const aggregatedHistory = generateAggregatedHistory(history);
      setAssignments(generateAssignment(latestData, aggregatedHistory, [], blockedNames, date, yesterdayData, yesterdayAttendanceData || []));

      setIsSaved(false);
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("שגיאה ביצירת השיבוץ.");
    } finally {
      setIsGenerating(false);
    }
  };


  const handleSwap = (
    type: "hapak" | "chamal" | "mission",
    id: number,
    newName: string,
    memberIndex?: number,
    hapakName?: string
  ) => {
    setAssignments(prev => {
      if (!prev) return null;
      const next = { ...prev };
      if (type === "hapak") {
        next.hapak = next.hapak.map(h =>
          (h.id === id && h.memberIndex === memberIndex && (!hapakName || h.name === hapakName))
            ? { ...h, assignedTo: newName } : h
        );
      } else if (type === "chamal") {
        next.chamal = next.chamal.map(c =>
          c.shiftIndex === id ? { ...c, assignedTo: newName } : c
        );
      } else if (type === "mission") {
        // id = mission post index (0=יזומה, 1=פילבוקס), memberIndex = slot index
        next.missions = next.missions.map((m, mIdx) =>
          mIdx === id
            ? { ...m, slots: m.slots.map((s, sIdx) => sIdx === memberIndex ? { ...s, assignedTo: newName } : s) }
            : m
        );
      }
      return next;
    });
    setIsSaved(false);
  };

  const handleConfirm = async () => {
    if (!assignments) return;
    setIsConfirming(true);

    const formattedDate = formatDateForApi(date);
    const consolidated = new Map<string, any>();

    const addUpdate = (name: string, role: string, type: string, hours: string, points: number) => {
      if (!name || name === "לא מאויש" || name === "טרם שובץ" || name === "-") return;
      if (!consolidated.has(name)) {
        consolidated.set(name, { date: formattedDate, name, role, type, hours, points });
      } else {
        const ex = consolidated.get(name);
        ex.role  = Array.from(new Set([ex.role,  role ])).join(" + ");
        ex.type  = Array.from(new Set([ex.type,  type ])).join(" + ");
        ex.hours = ex.hours === "לתאם" ? hours : hours === "לתאם" ? ex.hours : `${ex.hours} + ${hours}`;
        ex.points += points;
      }
    };

    // חפ"ק
    assignments.hapak.forEach(h => {
      if (h.assignedTo && h.assignedTo !== "טרם שובץ" && h.points > 0) {
        const parts = h.name.split(' - ');
        const displayRole = parts.length > 1 ? parts[1].trim() : `עמדה ${h.memberIndex}`;
        addUpdate(h.assignedTo, displayRole, 'חפ"ק', 'לתאם', h.points);
      }
    });

    // חמל
    assignments.chamal.forEach(c => {
      if (c.assignedTo) {
        const pts = c.shiftIndex === 0 ? POINTS.CHAMAL_NIGHT : POINTS.CHAMAL_DAY;
        addUpdate(c.assignedTo, 'חמל', 'חמל', c.timeLabel, pts);
      }
    });

    // עמדות (יזומה / פילבוקס)
    assignments.missions.forEach(m => {
      m.slots.forEach(s => {
        if (s.assignedTo) {
          let pts = 0;
          if (m.postType.includes("פילבוקס")) pts = POINTS.PILBOX;
          else if (m.postType.includes("יזומה")) pts = POINTS.IZUMA;
          else if (m.postType.includes("תורן רס\"פ")) pts = POINTS.RASAP;
          addUpdate(s.assignedTo, s.roleLabel, m.postType, 'לתאם', pts);
        }
      });
    });

    // Differential – track removed assignments
    if (loadedAssignments) {
      const currentActive = new Set<string>();
      assignments.hapak.forEach(h => { if (h.assignedTo) currentActive.add(normalizeNameStr(h.assignedTo)); });
      assignments.chamal.forEach(c => { if (c.assignedTo) currentActive.add(normalizeNameStr(c.assignedTo)); });
      assignments.missions.forEach(m => m.slots.forEach(s => { if (s.assignedTo) currentActive.add(normalizeNameStr(s.assignedTo)); }));

      loadedAssignments.hapak?.forEach(h => {
        if (h.assignedTo && !currentActive.has(normalizeNameStr(h.assignedTo)) && !consolidated.has(h.assignedTo))
          addUpdate(h.assignedTo, 'הוסר', 'חפ"ק', 'הוסר', 0);
      });
      loadedAssignments.chamal?.forEach(c => {
        if (c.assignedTo && !currentActive.has(normalizeNameStr(c.assignedTo)) && !consolidated.has(c.assignedTo))
          addUpdate(c.assignedTo, 'הוסר', 'חמל', 'הוסר', 0);
      });
      loadedAssignments.missions?.forEach(m => m.slots?.forEach(s => {
        if (s.assignedTo && !currentActive.has(normalizeNameStr(s.assignedTo)) && !consolidated.has(s.assignedTo))
          addUpdate(s.assignedTo, 'הוסר', m.postType, 'הוסר', 0);
      }));
    }

    const sessionUpdates = Array.from(consolidated.values());

    try {
      const response = await fetch("https://151.145.89.228.sslip.io/webhook/confirm-guards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: sessionUpdates })
      });

      if (!response.ok) throw new Error("API update failed");

      const formattedDateDay = formatDateForApi(date);
      const newHistory = { ...history };
      newHistory[formattedDateDay] = {};
      sessionUpdates.forEach(u => {
        newHistory[formattedDateDay][u.name] = (newHistory[formattedDateDay][u.name] || 0) + u.points;
      });
      setHistory(newHistory);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setLoadedAssignments(assignments);
      toast.success("השיבוץ אושר ונרשם ביומן הפעילות בהצלחה!");
    } catch (e) {
      console.error("Confirm API Error:", e);
      // keep local state even on failure so the commander's work isn't lost
      const formattedDateDay = formatDateForApi(date);
      const newHistory = { ...history };
      newHistory[formattedDateDay] = {};
      sessionUpdates.forEach(u => {
        newHistory[formattedDateDay][u.name] = (newHistory[formattedDateDay][u.name] || 0) + u.points;
      });
      setHistory(newHistory);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setLoadedAssignments(assignments);
      toast.warning("הסנכרון לגליון נכשל — השיבוץ נשמר באופן מקומי בלבד. נסה שוב מאוחר יותר.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSaveToSheet = async () => {
    if (!assignments) return;
    setIsSavingToSheet(true);
    try {
      const response = await fetch("https://151.145.89.228.sslip.io/webhook/save-guards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDateForApi(date),
          assignment: assignments
        })
      });
      if (!response.ok) throw new Error("Save API failed");
      setLoadedAssignments(assignments);
      toast.success("השיבוץ נשמר בגיליון בהצלחה!");
    } catch (e) {
      console.error("Save API Error:", e);
      toast.error("שמירת השיבוץ בגיליון נכשלה.");
    } finally {
      setIsSavingToSheet(false);
    }
  };

  const handleResetHistory = () => {
    if (window.confirm("האם אתה בטוח שברצונך לאפס את כל היסטוריית הניקוד?")) {
      setHistory({});
      localStorage.removeItem(STORAGE_KEY);
      toast.info("ההיסטוריה אופסה.");
    }
  };

  const toggleBlock = (name: string) => {
    setBlockedNames(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
    setIsSaved(false);
  };

  const handleResetBlocks = () => {
    if (window.confirm("האם אתה בטוח שברצונך לבטל את כל החסימות?")) {
      setBlockedNames(new Set());
      localStorage.removeItem(BLOCKED_STORAGE_KEY);
      toast.info("כל החסימות בוטלו.");
    }
  };

  const sortedHistory = useMemo(() => {
    // Aggregating all session points across all dates
    const aggregatedHistory: Record<string, number> = {};
    Object.values(history).forEach((dayPoints) => {
      Object.entries(dayPoints).forEach(([name, points]) => {
        aggregatedHistory[name] = (aggregatedHistory[name] || 0) + points;
      });
    });

    const allPersonnel = data?.map(r => ({
      name: r.name,
      total: (r.burdenPoints || 0) + (aggregatedHistory[r.name] || 0),
      isPermanent: (r.burdenPoints || 0) > 0,
      isSession: (aggregatedHistory[r.name] || 0) > 0
    })) || [];

    return allPersonnel.sort((a, b) => b.total - a.total);
  }, [data, history]);

  const totalPoints = useMemo(
    () => sortedHistory.reduce((sum, p) => sum + (p.total || 0), 0),
    [sortedHistory]
  );

  const hapakFilled = assignments?.hapak.filter(h => h.assignedTo).length ?? 0;
  const hapakTotal = assignments?.hapak.length ?? 0;
  const chamalFilled = assignments?.chamal.filter(c => c.assignedTo).length ?? 0;
  const chamalTotal = assignments?.chamal.length ?? 0;
  const missionsFilled = assignments?.missions.reduce((n, m) => n + m.slots.filter(s => s.assignedTo).length, 0) ?? 0;
  const missionsTotal = assignments?.missions.reduce((n, m) => n + m.slots.length, 0) ?? 0;

  const OccupancyBar = ({ filled, total }: { filled: number; total: number }) => (
    <div className="mt-2.5 flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            filled === total ? "bg-green-500" : filled >= total * 0.5 ? "bg-amber-500" : "bg-orange-500"
          )}
          style={{ width: `${total ? (filled / total) * 100 : 0}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
        {filled}/{total} מאויש
      </span>
    </div>
  );

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 elevated-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              type="button"
              className="p-2.5 sm:p-2.5 bg-white/20 rounded-lg cursor-pointer hover:bg-white/30 transition-colors active:scale-95"
              onClick={() => setShowAuthButton(!showAuthButton)}
              title="גישת מפקדים"
              aria-label="גישת מפקדים"
            >
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-overlay" />
            </button>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-overlay leading-none">שיבוץ שוויוני ({formatDateRange(date)})</h1>
              <p className="text-overlay/70 text-xs sm:text-sm mt-1 sm:mt-0.5">
                רשימת שמירות ושיבוצי חפ"ק (החל מ-14:00)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isAuthorized && (
              <div className="px-3 py-1.5 bg-green-500/20 text-white border border-green-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                מצב עריכה מאושר (Guard)
              </div>
            )}
            
            {!isAuthorized && showAuthButton && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                <Button
                  onClick={() => setShowLoginPrompt(true)}
                  className="bg-primary/20 hover:bg-primary/30 text-white border border-primary/40 text-xs font-bold h-11 px-4 backdrop-blur-sm"
                >
                  {!isAuthenticated ? "התחבר לעריכה" : "בקש הרשאת שיבוץ"}
                </Button>
              </div>
            )}

            <DatePickerBar value={date} onChange={changeDate} />
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center justify-center w-11 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-overlay transition-colors disabled:opacity-50"
              aria-label="רענן"
              title="רענן"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {(isLoading || isGenerating) && <LoadingOverlay />}
      {isError && !isLoading && !isGenerating && <ErrorMessage message={(error as Error)?.message ?? "שגיאה לא ידועה"} />}

      {!isLoading && !isGenerating && !isError && assignments && (
        <div className={cn(
          "grid gap-6",
          isAuthorized ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {/* Side Column: Management, Ledger & Statistics - Visible ONLY for Authenticated Commanders */}
          {isAuthorized && (
            <div className="lg:col-span-1 space-y-6 text-right order-2 lg:order-1" dir="rtl">
              {/* Management Card */}
              <div className="bg-card border border-border rounded-xl p-5 card-shadow space-y-4 animate-in fade-in slide-in-from-top-2 lg:sticky lg:top-20">
                <h2 className="text-lg font-black flex items-center gap-2 text-primary border-b border-border pb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {mode === "commander" ? "ניהול מפקדים" : "ניהול שיבוץ"}
                </h2>
                <div className="space-y-2">
                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || isSavingToSheet || isConfirming}
                    className="w-full h-11 text-md font-bold gradient-hero border-none shadow-md"
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : null}
                    ג'נרט שיבוץ חדש
                  </Button>
                  <Button 
                    onClick={handleSaveToSheet} 
                    disabled={isSavingToSheet || isGenerating || isConfirming}
                    variant="outline" 
                    className="w-full h-11 text-md font-bold border-primary text-primary hover:bg-primary/5"
                  >
                    {isSavingToSheet ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                    שמור שיבוץ לגיליון
                  </Button>
                  <Button 
                    onClick={handleConfirm} 
                    disabled={isConfirming || isGenerating || isSavingToSheet}
                    className="w-full h-11 text-md font-bold bg-accent text-accent-foreground hover:bg-accent/90 border-none shadow-md"
                  >
                    {isConfirming ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
                    אשר ועדכן ניקוד בגליון
                  </Button>
                </div>
              </div>

              {/* Burden Ledger Card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsLedgerCollapsed(!isLedgerCollapsed)} className="p-1 hover:bg-muted rounded-md transition-colors">
                      {isLedgerCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <h3 className="font-black text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      טבלת עומס (ניקוד מצטבר)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums whitespace-nowrap">סה"כ {totalPoints} נק'</span>
                    <button onClick={handleResetBlocks} type="button" title="בטל את כל החסימות" aria-label="בטל את כל החסימות" className="p-2 text-muted-foreground hover:text-amber-500 transition-colors">
                      <ShieldOff className="w-4 h-4" />
                    </button>
                    <button onClick={handleResetHistory} type="button" title="אפס הכל" aria-label="אפס הכל" className="p-2 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {!isLedgerCollapsed && (
                  <div className="p-1 max-h-[600px] overflow-y-auto">
                    {sortedHistory.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">אין נתונים היסטוריים</div>
                    ) : (
                      sortedHistory.map((p) => {
                        const isBlocked = blockedNames.has(p.name);
                        return (
                          <div key={p.name} className={cn(
                            "flex items-center justify-between p-2.5 border-b border-border last:border-0 group",
                            isBlocked && "bg-red-500/5 opacity-80"
                          )}>
                            <div className="flex items-center gap-3">
                              <button onClick={() => toggleBlock(p.name)} aria-label={isBlocked ? "בטל חסימה" : "חסום משיבוץ"} type="button" className={cn("p-2.5 rounded-md transition-colors", isBlocked ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" : "text-muted-foreground hover:text-primary hover:bg-muted")} title={isBlocked ? "בטל חסימה" : "חסום משיבוץ"}>
                                {isBlocked ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                              </button>
                              <div className="flex flex-col text-right">
                                <span className={cn("text-sm font-medium", isBlocked && "line-through text-muted-foreground")}>{p.name}</span>
                                <span className="text-[10px] text-muted-foreground">{p.isPermanent ? "מהגליון" : "בסשן זה"}</span>
                              </div>
                            </div>
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", p.isPermanent ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600")}>{p.total} נק'</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Personnel Stats Card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsAvailableCollapsed(!isAvailableCollapsed)} className="p-1 hover:bg-muted rounded-md transition-colors">
                      {isAvailableCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <h3 className="font-black text-sm flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      חיילים פנויים ({availablePersonnel.length})
                    </h3>
                  </div>
                </div>
                {!isAvailableCollapsed && (
                  <div className="p-3 max-h-[400px] overflow-y-auto space-y-2">
                    {availablePersonnel.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">אין חיילים פנויים כרגע</div>
                    ) : (
                      <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
                        {availablePersonnel.map((p) => {
                          const v = String(p.todayValue || "").trim().toUpperCase();
                          const isLeaving = ["יא", "יפ", "מ", "5"].includes(v);
                          const isReturning = ["4"].includes(v);

                          let statusColor = "bg-green-500/10 text-green-700 border-green-500/20"; // נ, 1 or V
                          if (isLeaving) {
                             statusColor = "bg-indigo-500/10 text-indigo-700 border-indigo-500/30"; // Leaving
                          } else if (isReturning) {
                             statusColor = "bg-blue-500/10 text-blue-700 border-blue-500/20"; // Returning
                          }

                          let statusLabel = "";
                          if (isLeaving) statusLabel = " (ביציאה)";
                          else if (isReturning) statusLabel = " (בדרך חזרה)";

                          return (
                            <div key={p.name} className={cn("border px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2", statusColor)}>
                              <span>{p.name}{statusLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Column: Assignment Tables */}
          <div className={cn(
            "space-y-6 order-1 lg:order-2",
            isAuthenticated ? "lg:col-span-2" : "col-span-1"
          )}>
            {/* Hapak Assignment Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow" id="hapak-export-container">
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsHapakCollapsed(!isHapakCollapsed)} className="p-1 hover:bg-muted rounded-md transition-colors">
                      {isHapakCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <div className="flex flex-col">
                      <h2 className="font-black flex items-center gap-2 text-sm sm:text-base">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                        שיבוץ חפ"ק
                      </h2>
                      <span className="text-[10px] text-muted-foreground font-mono mr-6 sm:mr-7">טווח: {(() => {
                        const d1 = date.split('-').reverse().slice(0, 2).join('/');
                        const nextDateObj = new Date(date);
                        nextDateObj.setDate(nextDateObj.getDate() + 1);
                        const d2 = nextDateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
                        return `${d1} - ${d2}`;
                      })()}</span>
                    </div>
                  </div>
                  {!isHapakCollapsed && (
                    <Button 
                      onClick={handleExportHapak} 
                      disabled={isExportingHapak}
                      variant="outline" 
                      size="sm" 
                      className="h-8 shadow-sm text-xs font-bold border-primary text-primary hover:bg-primary/5 no-export"
                    >
                      {isExportingHapak ? <RefreshCw className="w-3.5 h-3.5 ml-2 animate-spin" /> : <Camera className="w-3.5 h-3.5 ml-2" />}
                      תמונה
                    </Button>
                  )}
                </div>
                <OccupancyBar filled={hapakFilled} total={hapakTotal} />
              </div>
              {!isHapakCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
                  {HAPAK_MISSIONS.map(mission => (
                    <div key={mission.id} className="bg-card p-4">
                      <h3 className="text-sm font-black mb-3 text-primary text-right" dir="rtl">חפ"ק {mission.name}</h3>
                      <div className="space-y-2">
                        {assignments?.hapak.filter(h => h.id === mission.id)
                          .sort((a, b) => a.memberIndex - b.memberIndex)
                          .map((h, hIdx) => {
                             const person = data?.find(p => p.name === h.assignedTo);
                             const roleText = person?.role ? `(${person.role.trim()})` : '';
                             const parts = h.name.split(' - ');
                             const displayRole = parts.length > 1 ? parts[1].trim() : `עמדה ${h.memberIndex}`;
                             return (
                               <div key={`${h.id}-${h.memberIndex}-${hIdx}`} className={cn("flex items-center justify-between p-2 rounded-lg text-xs", h.memberIndex === 1 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/30")}>
                                 <span className={cn("font-medium max-w-[100px] break-words text-right", h.memberIndex === 1 ? "text-amber-700 font-black" : "text-muted-foreground")}>{displayRole}</span>
                                 <div className="flex items-center gap-1.5 flex-row-reverse">
                                    <PersonnelSwap
                                      currentName={h.assignedTo}
                                      allPersonnel={data || []}
                                      onSwap={(newName) => handleSwap("hapak", h.id, newName, h.memberIndex, h.name)}
                                      readonly={!isAuthorized || isExportingHapak}
                                      allowEmpty={true}
                                      type="hapak"
                                      currentAssignments={assignments}
                                      yesterdayGuards={loadedAssignments?.guards || []}
                                    />
                                    {roleText && <span className="text-[10px] text-muted-foreground">{roleText}</span>}
                                 </div>
                               </div>
                             );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chamal Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow">
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsChamalCollapsed(!isChamalCollapsed)} className="p-1 hover:bg-muted rounded-md transition-colors">
                      {isChamalCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <h2 className="font-black flex items-center gap-2 text-sm sm:text-base">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                      חמל (3 משמרות)
                    </h2>
                  </div>
                </div>
                <OccupancyBar filled={chamalFilled} total={chamalTotal} />
              </div>
              {!isChamalCollapsed && (
                <div className="divide-y divide-border" dir="rtl">
                  {assignments.chamal.map(shift => (
                    <div key={shift.shiftIndex} className={cn(
                      "flex items-center justify-between p-3 sm:p-4",
                      shift.shiftIndex === 0 && "bg-indigo-500/5"
                    )}>
                      <span className={cn(
                        "font-mono text-xs sm:text-sm font-bold",
                        shift.shiftIndex === 0 ? "text-indigo-600" : "text-muted-foreground"
                      )}>
                        {shift.timeLabel}
                        {shift.shiftIndex === 0 && (
                          <span className="mr-2 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">לילה</span>
                        )}
                      </span>
                      <PersonnelSwap
                        currentName={shift.assignedTo}
                        allPersonnel={(data || []).filter(p => (p.role || "").includes("חמל"))}
                        onSwap={(newName) => handleSwap("chamal", shift.shiftIndex, newName)}
                        readonly={!isAuthorized}
                        allowEmpty={true}
                        type="hapak"
                        currentAssignments={assignments}
                        yesterdayRecords={yesterdayAttendanceData || []}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missions Card (יזומה + פילבוקס) */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow">
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsMissionsCollapsed(!isMissionsCollapsed)} className="p-1 hover:bg-muted rounded-md transition-colors">
                      {isMissionsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <h2 className="font-black flex items-center gap-2 text-sm sm:text-base">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      עמדות (יזומה ופילבוקס)
                    </h2>
                  </div>
                  {!isMissionsCollapsed && (
                    <Button 
                      onClick={handleExportImage} 
                      disabled={isExporting}
                      variant="outline" 
                      size="sm" 
                      className="h-8 shadow-sm text-xs font-bold border-primary text-primary hover:bg-primary/5 no-export"
                    >
                      {isExporting ? <RefreshCw className="w-3.5 h-3.5 ml-2 animate-spin" /> : <Camera className="w-3.5 h-3.5 ml-2" />}
                      תמונה
                    </Button>
                  )}
                </div>
                <OccupancyBar filled={missionsFilled} total={missionsTotal} />
              </div>
              {!isMissionsCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {assignments.missions.map((mission, gIdx) => {
                    const filledCount = mission.slots.filter(s => s.assignedTo).length;
                    const isFull = filledCount === mission.slots.length;
                    return (
                      <div key={mission.postType} className="bg-card border border-border rounded-xl p-4 card-shadow">
                        <div className="flex items-center justify-between mb-3" dir="rtl">
                          <h3 className="text-sm font-black text-primary">
                            {mission.postType}
                          </h3>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums",
                            isFull ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"
                          )}>
                            {filledCount}/{mission.slots.length} מאויש
                          </span>
                        </div>
                        <div className="space-y-2">
                          {mission.slots.map((slot, sIdx) => (
                            <div key={sIdx} className={cn(
                              "flex items-center justify-between p-2 rounded-lg text-xs",
                              sIdx === 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/30"
                            )}>
                              <span className={cn(
                                "font-medium text-right min-w-[50px]",
                                sIdx === 0 ? "text-amber-700 font-black" : "text-muted-foreground"
                              )}>{slot.roleLabel}</span>
                              <PersonnelSwap
                                currentName={slot.assignedTo}
                                allPersonnel={data || []}
                                onSwap={(newName) => handleSwap("mission", gIdx, newName, sIdx)}
                                readonly={!isAuthorized}
                                allowEmpty={true}
                                type="hapak"
                                currentAssignments={assignments}
                                yesterdayRecords={yesterdayAttendanceData || []}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoading && !isGenerating && !isError && !assignments && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-5xl">🛡️</div>
          <p className="font-bold text-foreground text-lg">אין שיבוץ זמין</p>
          <p className="text-sm text-muted-foreground">לא נמצא שיבוץ שמירות לתאריך זה</p>
        </div>
      )}

      <CommanderAuthOverlay
        isOpen={showLoginPrompt && !isAuthorized}
        onClose={() => setShowLoginPrompt(false)}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}

