import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMainAttendance } from "@/hooks/useAttendanceData";
import { getTodayIso, formatDateForApi, normalizeNameStr, getComputedPresence } from "@/lib/attendanceUtils";
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

interface GuardShift {
  hour: number;
  time: string;
  name: string;
  points: number;
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
  guards: GuardShift[];
}

type PersonnelPoints = Record<string, number>;

// ─── Configuration ────────────────────────────────────────────────────────────


const GUARD_RELEVANT_ROLES = ["חייל", "מ\"כ", "חובש", "אוכלוסיה", "אנוח", "מפקד"];
const GUARD_EXCLUDED_ROLES = ["סמל", "סמ\"ל", "סמר", "סמ\"ר"];

const HAPAK_MISSIONS = [
  { id: 1, name: "מ\"פ", key: "מפ" },
  { id: 2, name: "1ג", key: "1ג" },
  { id: 3, name: "2ג", key: "2ג" },
  { id: 4, name: "3ג", key: "3ג" },
  { id: 5, name: "אנו\"ח", key: "אנוח" }
];

const POINTS = {
  HAPAK: 3,
  NIGHT_GUARD: 2, // 00:00 - 08:00
  DAY_GUARD: 1    // 08:00 - 00:00
};

const STORAGE_KEY = "guard_burden_points";
const BLOCKED_STORAGE_KEY = "guard_blocked_names";

// ─── Logic ────────────────────────────────────────────────────────────────────

function getPointsForHour(hour: number): number {
  return (hour >= 0 && hour < 8) ? POINTS.NIGHT_GUARD : POINTS.DAY_GUARD;
}

const getYesterdayIso = (dateStr: string) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

function generateAssignment(records: AttendanceRecord[], history: PersonnelPoints, hapakRows: any[], blockedNames: Set<string>, date: string, yesterdayGuards: GuardShift[] = [], yesterdayRecords: AttendanceRecord[] = []): AssignmentData {

  try {
    if (!records) records = [];
    if (!hapakRows) hapakRows = [];
    
    const hapakAssignments: HapakMission[] = [];
    const assignedNames = new Set<string>(blockedNames);

    const rows = (Array.isArray(hapakRows) ? hapakRows : []).filter(r => r && typeof r === 'object');

    for (const mission of HAPAK_MISSIONS) {
      let currentMemberIndex = 1;
      
      // 1. Mandatory Commander (All missions)
      const commanderRow = rows.find(r => String(r["תפקיד"] || "").trim().includes("מפקד") && !String(r["תפקיד"] || "").includes("2"));
      const commander2Row = rows.find(r => String(r["תפקיד"] || "").trim().includes("מפקד2"));
      
      let commanderName = "טרם שובץ";
      
      const getStatus = (name: string): "full" | "leaving" | "returning" | "none" => {
        const normalizedQuery = normalizeNameStr(name);
        const p = records.find(r => normalizeNameStr(r.name) === normalizedQuery);
        return getComputedPresence(p, yesterdayRecords);
      };

      if (commanderRow && commanderRow[mission.key]) {
        const pureNameFromApi = String(commanderRow[mission.key]);
        const nameFromApi = normalizeNameStr(pureNameFromApi);
        const status = getStatus(nameFromApi);
        
        if (nameFromApi && nameFromApi !== "טרם שובץ" && status !== "none") {
          commanderName = pureNameFromApi.trim();
        }
      }
      
      if (commanderName === "טרם שובץ" && commander2Row && commander2Row[mission.key]) {
        const pureNameFromApi = String(commander2Row[mission.key]);
        const nameFromApi = normalizeNameStr(pureNameFromApi);
        if (nameFromApi && nameFromApi !== "טרם שובץ" && getStatus(nameFromApi) !== "none") {
          commanderName = pureNameFromApi.trim();
        }
      }
      
      // Special logic for Anuh Commander if not in registry
      if (mission.key === "אנוח" && commanderName === "טרם שובץ") {
        const eligibleCommanders = records.filter(p => {
          const dept = (p.department || "").trim();
          const role = (p.role || "").trim();
          const name = normalizeNameStr(p.name);
          const v = String(p.todayValue || "").trim().toUpperCase();
          const isPresent = v === "1" || v === "V";
          
          return isPresent && 
                 dept.includes("אנוח") && 
                 (role.includes("קצין") || role.includes("סמל")) &&
                 !assignedNames.has(name);
        }).sort((a, b) => (a.burdenPoints || 0) + (history[a.name] || 0) - ((b.burdenPoints || 0) + (history[b.name] || 0)));

        if (eligibleCommanders.length > 0) {
          commanderName = eligibleCommanders[0].name;
        }
      }

      if (commanderName && commanderName !== "טרם שובץ") {
        assignedNames.add(normalizeNameStr(commanderName));
      }
      
      const commanderStatus = commanderName !== "טרם שובץ" ? getStatus(commanderName) : "none";
      const commanderSuffix = commanderStatus === "leaving" ? " (היום בבית)" : commanderStatus === "returning" ? " (חוזר היום)" : "";

      hapakAssignments.push({
        id: mission.id,
        memberIndex: currentMemberIndex++,
        name: `חפ"ק ${mission.name} - מפקד${commanderSuffix}`,
        assignedTo: commanderName === "טרם שובץ" ? "" : commanderName,
        points: POINTS.HAPAK
      });

      // 2. Specialists
      const specialistCount = (mission.key === "מפ" || mission.key === "אנוח") ? 3 : 2;
      let filledSpecialists = 0;
      
      let hasLeavingInSlot = false;
      let hasReturningInSlot = false;

      // MP Prioritization: Engineer
      if (mission.key === "מפ") {
        const engineerRow = rows.find(r => String(r["תפקיד"] || "").includes("מהנדס"));
        if (engineerRow && engineerRow["מפ"]) {
          const purePersonName = String(engineerRow["מפ"]);
          const personName = normalizeNameStr(purePersonName);
          if (personName && personName !== "" && personName !== "טרם שובץ") {
            const finalStatus = getStatus(personName);
            if (finalStatus !== "none" && !assignedNames.has(purePersonName.trim())) {
              if (finalStatus === "full") filledSpecialists++;
              else if (finalStatus === "leaving") { hasLeavingInSlot = true; filledSpecialists++; }
              else if (finalStatus === "returning") { hasReturningInSlot = true; filledSpecialists++; }
              
              assignedNames.add(normalizeNameStr(purePersonName));
              const personSuffix = finalStatus === "leaving" ? " (היום בבית)" : finalStatus === "returning" ? " (חוזר היום)" : "";
              hapakAssignments.push({
                id: mission.id,
                memberIndex: currentMemberIndex++,
                name: `חפ"ק ${mission.name} - מהנדס${personSuffix}`,
                assignedTo: purePersonName.trim(),
                points: POINTS.HAPAK
              });
            }
          }
        }
      }

      // Normal registry loop for specialists
      for (const row of rows) {
        const rolePattern = String(row["תפקיד"] || "").trim();
        if (!rolePattern || rolePattern === "מפקד" || rolePattern === "מפקד חפ\"ק") continue; 
        if (mission.key === "מפ" && rolePattern.includes("מהנדס")) continue;

        if (filledSpecialists >= specialistCount) {
          if (!(filledSpecialists === specialistCount && ((hasLeavingInSlot && !hasReturningInSlot) || (!hasLeavingInSlot && hasReturningInSlot)))) {
            break;
          }
        }

        const purePersonName = String(row[mission.key] || "");
        const personName = normalizeNameStr(purePersonName);
        if (personName && personName !== "" && personName !== "טרם שובץ") {
          if ((rolePattern.includes("רופא") || rolePattern.includes("חובש")) && mission.key !== "מפ") {
            const alreadyHasMedical = hapakAssignments.some(h => {
              if (h.id !== mission.id) return false;
              if (h.name.includes("רופא") || h.name.includes("חובש")) return true;
              const person = records.find(p => normalizeNameStr(p.name) === normalizeNameStr(h.assignedTo));
              return person && ((person.role || "").includes("רופא") || (person.role || "").includes("חובש"));
            });
            if (alreadyHasMedical) continue;
          }

          if (rolePattern.includes("מפקד2") && mission.key !== "מפ") {
            const alreadyHasCommander = hapakAssignments.some(h => 
              h.id === mission.id && h.assignedTo !== "" && (h.name.includes("מפקד") && !h.name.includes("מפקד2"))
            );
            if (alreadyHasCommander) continue;
          }

          const isSaturday = new Date(date).getDay() === 6;
          if (rolePattern.includes("מהנדס") && isSaturday && mission.key === "1ג") continue;

          const finalStatus = getStatus(personName);
          const assignedOriginalName = purePersonName.trim();
          
          if (finalStatus !== "none" && !assignedNames.has(assignedOriginalName)) {
            if (finalStatus === "full") filledSpecialists++;
            else if (finalStatus === "leaving") {
              if (hasReturningInSlot) hasReturningInSlot = false; 
              else { hasLeavingInSlot = true; filledSpecialists++; }
            } else if (finalStatus === "returning") {
              if (hasLeavingInSlot) hasLeavingInSlot = false; 
              else { hasReturningInSlot = true; filledSpecialists++; }
            }

            assignedNames.add(normalizeNameStr(assignedOriginalName));
            const personSuffix = finalStatus === "leaving" ? " (היום בבית)" : finalStatus === "returning" ? " (חוזר היום)" : "";
            hapakAssignments.push({
              id: mission.id,
              memberIndex: currentMemberIndex++,
              name: `חפ"ק ${mission.name} - ${rolePattern}${personSuffix}`,
              assignedTo: assignedOriginalName,
              points: POINTS.HAPAK
            });
          }
        }
      }

      // Anuh Specialist Auto-population
      if (mission.key === "אנוח" && filledSpecialists < specialistCount) {
        const eligibleSoldiers = records.filter(p => {
          const dept = (p.department || "").trim();
          const role = (p.role || "").trim();
          const name = normalizeNameStr(p.name);
          const v = String(p.todayValue || "").trim().toUpperCase();
          const isPresent = v === "1" || v === "V";
          
          return isPresent && 
                 dept.includes("אנוח") && 
                 !(role.includes("קצין") || role.includes("סמל")) &&
                 !assignedNames.has(name);
        }).sort((a, b) => (a.burdenPoints || 0) + (history[a.name] || 0) - ((b.burdenPoints || 0) + (history[b.name] || 0)));

        for (let i = 0; i < Math.min(specialistCount - filledSpecialists, eligibleSoldiers.length); i++) {
          const person = eligibleSoldiers[i];
          const name = person.name.trim();
          assignedNames.add(normalizeNameStr(name));
          filledSpecialists++;
          hapakAssignments.push({
            id: mission.id,
            memberIndex: currentMemberIndex++,
            name: `חפ"ק ${mission.name} - אנוח`,
            assignedTo: name,
            points: POINTS.HAPAK
          });
        }
      }

      while (filledSpecialists < specialistCount) {
         filledSpecialists++;
         hapakAssignments.push({
           id: mission.id,
           memberIndex: currentMemberIndex++,
           name: `חפ"ק ${mission.name} - עמדה ${currentMemberIndex - 1}`,
           assignedTo: "",
           points: POINTS.HAPAK
         });
      }
    }

    const localGenerationPoints: Record<string, number> = {};
    const guardCandidates = records.filter(p => {
      const role = (p.role || "").trim();
      const isExcluded = GUARD_EXCLUDED_ROLES.some(ex => role.includes(ex));
      if (isExcluded) return false;
      return !assignedNames.has(normalizeNameStr(p.name)) && 
             GUARD_RELEVANT_ROLES.some(included => role.includes(included));
    });

    const allShifts = [];
    for (let i = 0; i < 24; i++) {
      const hour = (i + 12) % 24; 
      const time = `${String(hour).padStart(2, "0")}:00 - ${String((hour + 1) % 24).padStart(2, "0")}:00`;
      const isNight = hour >= 0 && hour < 8; 
      allShifts.push({ hour, time, isNight, shiftPoints: getPointsForHour(hour), originalIndex: i });
    }

    const sortedShifts = [...allShifts].sort((a, b) => {
      if (a.isNight && !b.isNight) return -1;
      if (!a.isNight && b.isNight) return 1;
      return a.originalIndex - b.originalIndex; 
    });

    const yesterdayNightGuards = new Set(yesterdayGuards.filter(g => g.hour >= 0 && g.hour < 8 && g.name).map(g => normalizeNameStr(g.name)));

    const getShiftIndex = (h: number) => (h - 12 + 24) % 24;

    const temporaryAssignmentsMap = new Map<number, GuardShift>();
    for (const shift of sortedShifts) {
      const hour = shift.hour;
      const currentShiftIndex = getShiftIndex(hour);

      const hourlyEligible = guardCandidates.filter(p => {
         const normName = normalizeNameStr(p.name);
         
         const presence = getComputedPresence(p, yesterdayRecords);
         let isAvailable = false;
         if (presence === "full") isAvailable = true;
         if (presence === "leaving" && hour < 14) isAvailable = true;
         if (presence === "returning" && hour >= 18) isAvailable = true;
         
         if (!isAvailable) return false;

         // 2. 12-Hour Gap Check (Yesterday)
         const workedYesterday = yesterdayGuards.filter(yg => normalizeNameStr(yg.name) === normName);
         for (const yg of workedYesterday) {
            const yesterdayIndex = getShiftIndex(yg.hour);
            const gap = (currentShiftIndex + 24) - yesterdayIndex;
            if (gap < 12) return false;
         }

         // 3. 12-Hour Gap Check (Current Session)
         for (const assignedShift of temporaryAssignmentsMap.values()) {
            if (normalizeNameStr(assignedShift.name) === normName) {
               const assignedIndex = getShiftIndex(assignedShift.hour);
               const gap = Math.abs(currentShiftIndex - assignedIndex);
               if (gap < 12) return false;
            }
         }

         return true;
      });


      if (hourlyEligible.length > 0) {
        const best = hourlyEligible.reduce((prev, curr) => {
          const prevAssignments = Math.floor((localGenerationPoints[prev.name] || 0) / 1000);
          const currAssignments = Math.floor((localGenerationPoints[curr.name] || 0) / 1000);
          if (currAssignments < prevAssignments) return curr;
          if (currAssignments > prevAssignments) return prev;
          let prevScore = (prev.burdenPoints || 0) + (history[prev.name] || 0) + ((localGenerationPoints[prev.name] || 0) % 1000);
          let currScore = (curr.burdenPoints || 0) + (history[curr.name] || 0) + ((localGenerationPoints[curr.name] || 0) % 1000);
          if (shift.isNight) {
            if (yesterdayNightGuards.has(normalizeNameStr(prev.name))) prevScore += 10000;
            if (yesterdayNightGuards.has(normalizeNameStr(curr.name))) currScore += 10000;

            const prevPresence = getComputedPresence(prev, yesterdayRecords);
            const currPresence = getComputedPresence(curr, yesterdayRecords);
            if (prevPresence === "returning") prevScore -= 3; // מוריד 3 נקודות כדי לתת עדיפות, אבל עדיין מתחשב בהיסטוריה גדולה
            if (currPresence === "returning") currScore -= 3;
          }
          return currScore < prevScore ? curr : prev;
        });
        temporaryAssignmentsMap.set(hour, { hour, time: shift.time, name: best.name, points: shift.shiftPoints });
        localGenerationPoints[best.name] = (localGenerationPoints[best.name] || 0) + shift.shiftPoints + 1000;
      } else {
        temporaryAssignmentsMap.set(hour, { hour, time: shift.time, name: "", points: shift.shiftPoints });
      }
    }

    const guardAssignments: GuardShift[] = allShifts.map(s => temporaryAssignmentsMap.get(s.hour)!);
    return { hapak: hapakAssignments, guards: guardAssignments };
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
  hour,
  type,
  currentAssignments,
  yesterdayGuards = [],
  yesterdayRecords = []
}: {
  currentName: string;
  allPersonnel: AttendanceRecord[];
  onSwap: (newName: string) => void;
  readonly?: boolean;
  allowEmpty?: boolean;
  hour?: number;
  type: "hapak" | "guard";
  currentAssignments?: AssignmentData | null;
  yesterdayGuards?: GuardShift[];
  yesterdayRecords?: AttendanceRecord[];
}) {
  const [open, setOpen] = useState(false);
  const getShiftIndex = (h: number) => (h - 12 + 24) % 24;

  const available = useMemo(() => {
    if (!allPersonnel || !Array.isArray(allPersonnel)) return [];
    try {
      return allPersonnel
        .filter(p => {
          const presence = getComputedPresence(p, yesterdayRecords);
          if (presence === "none") return false;
          if (presence === "leaving" && hour !== undefined && hour >= 14) return false;
          if (presence === "returning" && hour !== undefined && hour < 18) return false;
          return true;
        })
        .map(p => {
          const normName = normalizeNameStr(p.name);
          let gapConflict = false;
          let gapHours = 0;

          if (type === "guard" && hour !== undefined) {
             const currentIndex = getShiftIndex(hour);
             const workedYesterday = (yesterdayGuards || []).filter(yg => yg && yg.name && normalizeNameStr(yg.name) === normName);
             for (const yg of workedYesterday) {
                const yIndex = getShiftIndex(yg.hour);
                const gap = (currentIndex + 24) - yIndex;
                if (gap < 12) { gapConflict = true; gapHours = gap; }
             }
             if (currentAssignments && Array.isArray(currentAssignments.guards)) {
                for (const g of currentAssignments.guards) {
                   if (g && g.name && normalizeNameStr(g.name) === normName && g.hour !== hour) {
                      const assignedIndex = getShiftIndex(g.hour);
                      const gap = Math.abs(currentIndex - assignedIndex);
                      if (gap < 12) { gapConflict = true; gapHours = gap; }
                   }
                }
             }
          }
          return { ...p, gapConflict, gapHours };
        })
        .sort((a, b) => {
          if (a.gapConflict && !b.gapConflict) return 1;
          if (!a.gapConflict && b.gapConflict) return -1;
          return (a.burdenPoints || 0) - (b.burdenPoints || 0);
        });
    } catch (err) {
      console.error("Error in PersonnelSwap available useMemo:", err);
      return [];
    }
  }, [allPersonnel, hour, type, currentAssignments, yesterdayGuards]);

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
      <CommandList className="max-h-[50vh] sm:max-h-[300px] overflow-y-auto">
        <CommandEmpty>לא נמצאו חיילים.</CommandEmpty>
        <CommandGroup>
          {allowEmpty && (
            <CommandItem
              value="ריק ללא שיבוץ"
              onSelect={() => {
                onSwap("");
                setOpen(false);
              }}
              className="flex items-center justify-between text-muted-foreground italic font-normal py-3 px-4"
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
                "flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0",
                p.gapConflict && "opacity-60 bg-red-500/5"
              )}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                   <span className="font-bold">{p.name}</span>
                   {p.gapConflict && (
                     <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                       <Clock className="w-2.5 h-2.5" />
                       מרווח: {p.gapHours}ש'
                     </span>
                   )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <span className={cn(
                    "px-1.5 rounded-md",
                    p.burdenPoints > 10 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {p.burdenPoints || 0} נק'
                  </span>
                  <span>•</span>
                  <span>{!p.gapConflict ? "זמין לשיבוץ" : "בעיית מרווח"}</span>
                </div>
              </div>
              {currentName === p.name && <Check className="w-4 h-4 text-primary animate-in zoom-in" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const trigger = (
    <button className={cn(
      "font-bold hover:text-primary transition-colors text-right flex items-center gap-1.5 group whitespace-nowrap",
      (!currentName || currentName === "לא מאויש" || currentName === "טרם שובץ") && "text-muted-foreground italic font-normal"
    )}>
      {statusDot}
      {(!currentName || currentName === "לא מאויש" || currentName === "טרם שובץ") ? "ריק / ללא שיבוץ" : currentName}
      <Shuffle className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger}
        </DrawerTrigger>
        <DrawerContent className="px-0 pb-6 max-h-[70vh] w-full max-w-[380px] mx-auto">
          <DrawerHeader className="border-b pb-4 px-4 flex items-center justify-between">
            <DrawerTitle className="text-right w-full">בחירת חייל לשיבוץ</DrawerTitle>
            <DrawerClose asChild>
                <button className="p-2 rounded-full hover:bg-muted"><CloseX className="w-5 h-5"/></button>
            </DrawerClose>
          </DrawerHeader>
          <div className="mt-2 flex-1 overflow-hidden">
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
      <PopoverContent className="p-0 w-[240px]" align="start">
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
  const [date, setDate] = useState(getTodayIso());
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
      if (h.assignedTo && h.assignedTo !== "טרם שובץ" && h.assignedTo !== "לא מאויש") {
        assigned.add(normalizeNameStr(h.assignedTo));
      }
    });
    assignments.guards.forEach(g => {
      if (g.name) assigned.add(normalizeNameStr(g.name));
    });
    blockedNames.forEach(name => assigned.add(normalizeNameStr(name)));
    
    return data.filter(p => {
      const presence = getComputedPresence(p, yesterdayAttendanceData);
      if (presence === "none") return false;

      if (assigned.has(normalizeNameStr(p.name))) return false;

      const role = (p.role || "").trim();
      
      // Explicit Whitelist for manual assignment visibility
      const ELIGIBLE_ROLES = [
        "חייל", 
        "קצין", 
        "סמל", 
        "סמ\"ר", 
        "סמ\"ל", 
        "סמר", 
        "מפקד", 
        "חובש", 
        "מהנדס", 
        "אוכלוסיה", 
        "אנוח", 
        "שו\"ב"
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
  const [isGuardCollapsed, setIsGuardCollapsed] = useState(false);
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
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText(`שיבוץ חפ"ק - ${date.split('-').reverse().join('/')}`, W - PAD, TITLE_H / 2 + 8);

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
    if (!assignments || !assignments.guards || assignments.guards.length === 0) {
      toast.error("אין נתוני שמירות לייצוא.");
      return;
    }
    try {
      setIsExporting(true);
      toast.info("מכין תמונת שמירות להורדה...");

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const scale = 3; // higher DPI for sharp mobile screens
      const W = 390; // mobile-friendly width (iPhone standard)
      const PAD = 14;
      const ROW_H = 46;
      const TITLE_H = 56;
      const TABLE_HEADER_H = 40;

      const rows = assignments.guards;
      const totalH = TITLE_H + PAD / 2 + TABLE_HEADER_H + rows.length * ROW_H + PAD;

      canvas.width = W * scale;
      canvas.height = totalH * scale;
      ctx.scale(scale, scale);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, totalH);

      // Title bar
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, TITLE_H);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText(`לו"ז שמירות - ${date.split('-').reverse().join('/')}`, W - PAD, TITLE_H / 2 + 8);

      // Table header
      let y = TITLE_H + PAD / 2;
      ctx.fillStyle = '#e8eeff';
      ctx.fillRect(0, y, W, TABLE_HEADER_H);
      ctx.fillStyle = '#333';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('שומר', W - PAD, y + TABLE_HEADER_H / 2 + 5);
      ctx.textAlign = 'left';
      ctx.fillText('שעה', PAD, y + TABLE_HEADER_H / 2 + 5);
      y += TABLE_HEADER_H;

      for (let i = 0; i < rows.length; i++) {
        const g = rows[i];
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f7f8fa';
        ctx.fillRect(0, y, W, ROW_H);

        // Time (left side)
        ctx.fillStyle = '#555';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(g.time, PAD, y + ROW_H / 2 + 5);

        // Name (right side)
        ctx.fillStyle = g.name ? '#1a1a2e' : '#bbb';
        ctx.font = g.name ? 'bold 16px Arial' : '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(g.name || '(לא שובץ)', W - PAD, y + ROW_H / 2 + 5);

        // Border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y + ROW_H);
        ctx.lineTo(W, y + ROW_H);
        ctx.stroke();

        y += ROW_H;
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

  const loadHapakRegistry = async () => {
    try {
      const response = await fetch("https://151.145.89.228.sslip.io/webhook/hapak-eligible");
      if (!response.ok) throw new Error("Failed to fetch hapak registry");
      const results = await response.json();
      const registryRows = results.map((r: any) => r.json || r);
      setHapakData(registryRows);
      return registryRows;
    } catch (err) {
      console.error("Error fetching Hapak registry:", err);
      return null;
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
      if (data && data.length > 0 && (hapakData && hapakData.length > 0)) {
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
            const yesterdayGuardsArray = yesterdayData?.guards || [];
            
            const aggregatedHistory = generateAggregatedHistory(history);
            setAssignments(generateAssignment(data, aggregatedHistory, hapakData, blockedNames, date, yesterdayGuardsArray, yesterdayAttendanceData || []));
            setIsSaved(false);
          } else {
            setAssignments(null);
            setIsSaved(true);
          }
        }
      }
    };
    init();
  }, [date, history, isAuthenticated, blockedNames, data, hapakData]);

  useEffect(() => {
    loadHapakRegistry();
  }, []);

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
      const latestHapakRows = await loadHapakRegistry();
      
      const yesterday = getYesterdayIso(date);
      const yesterdayData = await fetchSavedAssignment(yesterday);
      const yesterdayGuardsArray = yesterdayData?.guards || [];


      if (!latestData || !latestHapakRows) {
        toast.error("נכשל בטעינת נתונים עדכניים. הגנרוט הופסק.");
        return;
      }

      const aggregatedHistory = generateAggregatedHistory(history);
      setAssignments(generateAssignment(latestData, aggregatedHistory, latestHapakRows, blockedNames, date, yesterdayGuardsArray, yesterdayAttendanceData || []));

      setIsSaved(false);
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("שגיאה ביצירת השיבוץ.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSwap = (type: "hapak" | "guard", id: number, newName: string, memberIndex?: number, hapakName?: string) => {
    if (newName && newName !== "לא מאויש" && newName !== "טרם שובץ" && newName !== "-") {
      const normalizedNew = normalizeNameStr(newName);
      
      // 1. Check Hapak Conflicts
      const existingHapak = assignments?.hapak.find(h => 
        h.assignedTo && normalizeNameStr(h.assignedTo) === normalizedNew && 
        !(type === "hapak" && h.id === id && h.memberIndex === memberIndex)
      );
      
      // 2. Check Guard Conflicts
      const existingGuard = assignments?.guards.find(g => 
        g.name && normalizeNameStr(g.name) === normalizedNew && 
        !(type === "guard" && g.hour === id)
      );

      if (type === "guard" && existingHapak) {
        toast.warning(`שים לב: ${newName} כבר משובץ ב${existingHapak.name}`, {
          description: "השינוי בוצע, אך קיימת כפילות עם חפ\"ק.",
          duration: 5000
        });
      } else if (type === "hapak" && existingGuard) {
        toast.warning(`שים לב: ${newName} כבר משובץ בשמירה (${existingGuard.time})`, {
          description: "השינוי בוצע, אך קיימת כפילות עם שמירות.",
          duration: 5000
        });
      }
    }

    setAssignments(prev => {
      if (!prev) return null;
      const next = { ...prev };
      if (type === "hapak") {
        next.hapak = next.hapak.map(h =>
          (h.id === id && h.memberIndex === memberIndex && (!hapakName || h.name === hapakName)) ? { ...h, assignedTo: newName } : h
        );
      } else {
        next.guards = next.guards.map(g =>
          g.hour === id ? { ...g, name: newName } : g
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
        consolidated.set(name, {
          date: formattedDate,
          name: name,
          role: role,
          type: type,
          hours: hours,
          points: points
        });
      } else {
        const existing = consolidated.get(name);
        existing.role = Array.from(new Set([existing.role, role])).join(" + ");
        existing.type = Array.from(new Set([existing.type, type])).join(" + ");
        existing.hours = existing.hours === "לתאם" ? hours : hours === "לתאם" ? existing.hours : `${existing.hours} + ${hours}`;
        existing.points += points;
      }
    };

    assignments.hapak.forEach(h => {
      if (h.assignedTo && h.assignedTo !== "לא מאויש" && h.assignedTo !== "טרם שובץ") {
        const parts = h.name.split(' - ');
        const displayRole = parts.length > 1 ? parts[1].trim() : `עמדה ${h.memberIndex}`;
        addUpdate(h.assignedTo, displayRole, 'חפ"ק', 'לתאם', h.points);
      }
    });

    assignments.guards.forEach(g => {
      if (g.name && g.name !== "לא מאויש" && g.name !== "-") {
        const person = data?.find(p => p.name === g.name);
        addUpdate(g.name, person?.role || 'שומר', 'שמירה', g.time, g.points);
      }
    });

    // ─── Differential Updates (UPSERT-0 Strategy) ──────────────────────────
    if (loadedAssignments) {
        const currentActiveNames = new Set<string>();
        assignments.hapak.forEach(h => {
             if (h.assignedTo && h.assignedTo !== "לא מאויש" && h.assignedTo !== "טרם שובץ") currentActiveNames.add(normalizeNameStr(h.assignedTo));
        });
        assignments.guards.forEach(g => {
             if (g.name && g.name !== "לא מאויש" && g.name !== "-") currentActiveNames.add(normalizeNameStr(g.name));
        });

        loadedAssignments.hapak.forEach(h => {
            if (h.assignedTo && h.assignedTo !== "לא מאויש" && h.assignedTo !== "טרם שובץ") {
                const normName = normalizeNameStr(h.assignedTo);
                if (!currentActiveNames.has(normName) && !consolidated.has(h.assignedTo)) {
                    addUpdate(h.assignedTo, 'הוסר מהשיבוץ', 'חפ"ק', 'הוסר', 0);
                }
            }
        });

        loadedAssignments.guards.forEach(g => {
             if (g.name && g.name !== "לא מאויש" && g.name !== "-") {
                const normName = normalizeNameStr(g.name);
                if (!currentActiveNames.has(normName) && !consolidated.has(g.name)) {
                   addUpdate(g.name, 'הוסר מהשיבוץ', 'שמירה', 'הוסר', 0);
                }
             }
        });
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
      toast.warning("עדכון יומן הפעילות נכשל, נשמר באופן מקומי בלבד.");
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

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 elevated-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="p-1.5 sm:p-2 bg-white/20 rounded-lg cursor-pointer hover:bg-white/30 transition-colors active:scale-95"
              onClick={() => setShowAuthButton(!showAuthButton)}
              title="גישת מפקדים"
            >
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-overlay" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-overlay leading-none">שיבוץ שוויוני (ניקוד)</h1>
              <p className="text-overlay/70 text-xs sm:text-sm mt-1 sm:mt-0.5">
                רשימת שמירות ושיבוצי חפ"ק
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
                  className="bg-primary/20 hover:bg-primary/30 text-white border border-primary/40 text-xs font-bold h-9 px-3 backdrop-blur-sm"
                >
                  {!isAuthenticated ? "התחבר לעריכה" : "בקש הרשאת שיבוץ"}
                </Button>
              </div>
            )}

            <DatePickerBar value={date} onChange={setDate} />
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-overlay transition-colors disabled:opacity-50"
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
            <div className="lg:col-span-1 space-y-6 text-right" dir="rtl">
              {/* Management Card */}
              <div className="bg-card border border-border rounded-xl p-5 card-shadow space-y-4 animate-in fade-in slide-in-from-top-2">
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
                    {isGenerating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                    ג'נרט שיבוץ חדש
                  </Button>
                  <Button 
                    onClick={handleSaveToSheet} 
                    disabled={isSavingToSheet || isGenerating || isConfirming}
                    variant="outline" 
                    className="w-full h-11 text-md font-bold border-primary text-primary hover:bg-primary/5"
                  >
                    {isSavingToSheet ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    שמור שיבוץ לגיליון
                  </Button>
                  <Button 
                    onClick={handleConfirm} 
                    disabled={isConfirming || isGenerating || isSavingToSheet}
                    variant="outline" 
                    className="w-full h-11 text-md font-bold border-primary text-primary hover:bg-primary/5"
                  >
                    {isConfirming ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
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
                    <button onClick={handleResetBlocks} title="בטל את כל החסימות" className="text-muted-foreground hover:text-amber-500 transition-colors">
                      <ShieldOff className="w-4 h-4" />
                    </button>
                    <button onClick={handleResetHistory} title="אפס הכל" className="text-muted-foreground hover:text-red-500 transition-colors">
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
                              <button onClick={() => toggleBlock(p.name)} className={cn("p-1.5 rounded-md transition-colors", isBlocked ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" : "text-muted-foreground hover:text-primary hover:bg-muted")} title={isBlocked ? "בטל חסימה" : "חסום משיבוץ"}>
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
                          let statusColor = "bg-green-500/10 text-green-700 border-green-500/20"; // 1 or V
                          if (v.includes("בית") || v === "0" || v === "5") {
                             statusColor = "bg-indigo-500/10 text-indigo-700 border-indigo-500/30"; // Leaving
                          } else if (v.includes("חוזר") || v === "4") {
                             statusColor = "bg-blue-500/10 text-blue-700 border-blue-500/20"; // Returning
                          }

                          let statusLabel = "";
                          if (v.includes("בית") || v === "0" || v === "5") statusLabel = " (יוצא/בבית)";
                          else if (v.includes("חוזר") || v === "4") statusLabel = " (חוזר)";

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
            "space-y-6",
            isAuthenticated ? "lg:col-span-2" : "col-span-1"
          )}>
            {/* Hapak Assignment Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow" id="hapak-export-container">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsHapakCollapsed(!isHapakCollapsed)} className="p-1 hover:bg-muted rounded-md transition-colors">
                    {isHapakCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <div className="flex flex-col">
                    <h2 className="font-black flex items-center gap-2 text-sm sm:text-base">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      שיבוץ חפ"ק
                    </h2>
                    <span className="text-[10px] text-muted-foreground font-mono mr-6 sm:mr-7">תאריך: {date.split('-').reverse().join('/')}</span>
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
                    {isExportingHapak ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Camera className="w-3.5 h-3.5 mr-2" />}
                    תמונה
                  </Button>
                )}
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

            {/* Guard Table Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow" id="guard-export-container">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsGuardCollapsed(!isGuardCollapsed)} className="p-1 hover:bg-muted rounded-md transition-colors">
                    {isGuardCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <div className="flex flex-col">
                    <h2 className="font-black flex items-center gap-2 text-sm sm:text-base">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      לו"ז שמירות
                    </h2>
                    <span className="text-[10px] text-muted-foreground font-mono mr-6 sm:mr-7">תאריך: {date.split('-').reverse().join('/')}</span>
                  </div>
                </div>
                {!isGuardCollapsed && (
                  <Button 
                    onClick={handleExportImage} 
                    disabled={isExporting}
                    variant="outline" 
                    size="sm" 
                    className="h-8 shadow-sm text-xs font-bold border-primary text-primary hover:bg-primary/5 no-export"
                  >
                    {isExporting ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Camera className="w-3.5 h-3.5 mr-2" />}
                    תמונה
                  </Button>
                )}
              </div>
              {!isGuardCollapsed && (
                <div className={cn(!isExporting && "max-h-[800px] overflow-y-auto")}>
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-muted z-10">
                      <tr className="text-right">
                        <th className="px-2 sm:px-4 py-2.5 font-black text-muted-foreground text-xs sm:text-sm w-2/5">שעה</th>
                        <th className="px-2 sm:px-4 py-2.5 font-black text-muted-foreground text-xs sm:text-sm">שומר</th>
                        {(!isExporting && isAuthorized) && <th className="px-2 sm:px-4 py-2.5 font-black text-muted-foreground text-xs sm:text-sm">ניקוד</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {assignments?.guards.map((g, idx) => (
                        <tr key={idx} className={cn("border-t border-border transition-colors hover:bg-muted/50", idx % 2 === 0 ? "bg-card" : "bg-background")}>
                          <td className="px-2 sm:px-4 py-2.5 font-mono text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap align-middle">
                            {g.time}
                          </td>
                          <td className="px-2 sm:px-4 py-2.5 font-bold align-middle">
                            <PersonnelSwap
                              currentName={g.name}
                              allPersonnel={data || []}
                              onSwap={(newName) => handleSwap("guard", g.hour, newName)}
                              readonly={!isAuthorized || isExporting}
                              allowEmpty={true}
                              hour={g.hour}
                              type="guard"
                              currentAssignments={assignments}
                              yesterdayGuards={loadedAssignments?.guards || []}
                              yesterdayRecords={yesterdayAttendanceData}
                            />
                          </td>
                          {(!isExporting && isAuthorized) && (
                            <td className="px-2 sm:px-4 py-2.5 align-middle">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap", g.points === 2 ? "bg-indigo-500/10 text-indigo-600" : "bg-yellow-500/10 text-yellow-700")}>
                                {g.points} נק'
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden shadow containers removed - using Canvas API instead */}

      <CommanderAuthOverlay 
        isOpen={showLoginPrompt && !isAuthorized} 
        onClose={() => setShowLoginPrompt(false)} 
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
