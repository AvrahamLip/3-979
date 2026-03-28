import { useState, useMemo, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { useRoleAuth } from "@/hooks/useRoleAuth";
import { useMainAttendance } from "@/hooks/useAttendanceData";
import { getTodayIso, formatDateForApi } from "@/lib/attendanceUtils";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check } from "lucide-react";

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
  { id: 4, name: "3ג", key: "3ג" }
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

const normalizeNameStr = (name: any) => String(name || "").replace(/\(.*\)/g, '').replace(/\s+/g, ' ').trim();

function generateAssignment(records: AttendanceRecord[], history: PersonnelPoints, hapakRows: any[], blockedNames: Set<string>, date: string): AssignmentData {
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
      if (!p) {
        // console.log(`[DEBUG Hapak] Presence check FAILED for: "${name}" (normalized: "${normalizedQuery}")`);
        return "none";
      }
      const v = String(p.todayValue).trim().toUpperCase();
      if (v === "1" || v === "V") return "full";
      if (v.includes("בית")) return "leaving";
      if (v.includes("חוזר")) return "returning";
      return "none";
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

    // 2. Remaining Specialists (3 for MP, 2 for others)
    const specialistCount = mission.key === "מפ" ? 3 : 2;
    let filledSpecialists = 0;
    
    let hasLeavingInSlot = false;
    let hasReturningInSlot = false;

    // Dynamically iterate over ALL registry rows instead of hardcoded priority list
    
    // MP Specialist Prioritization: Ensure Engineer is first if available
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

    for (const row of rows) {
      const rolePattern = String(row["תפקיד"] || "").trim();
      if (!rolePattern || rolePattern === "מפקד" || rolePattern === "מפקד חפ\"ק") continue; 
      
      // Skip if already assigned in previous prioritization step
      if (mission.key === "מפ" && rolePattern.includes("מהנדס")) continue;

      if (filledSpecialists >= specialistCount) {
        if (!(filledSpecialists === specialistCount && ((hasLeavingInSlot && !hasReturningInSlot) || (!hasLeavingInSlot && hasReturningInSlot)))) {
          break;
        }
      }

      const purePersonName = String(row[mission.key] || "");
      const personName = normalizeNameStr(purePersonName);
      if (personName && personName !== "" && personName !== "טרם שובץ") {
        
        // Medical exclusivity for non-MP missions (e.g., 2G, 3G) - only one doctor / medic per mission
        if ((rolePattern.includes("רופא") || rolePattern.includes("חובש")) && mission.key !== "מפ") {
          const alreadyHasMedical = hapakAssignments.some(h => {
            if (h.id !== mission.id) return false;
            if (h.name.includes("רופא") || h.name.includes("חובש")) return true;
            const person = records.find(p => normalizeNameStr(p.name) === normalizeNameStr(h.assignedTo));
            return person && ((person.role || "").includes("רופא") || (person.role || "").includes("חובש"));
          });
          if (alreadyHasMedical) continue;
        }

        // Commander exclusivity for non-MP: no Commander 2 if Commander is assigned
        if (rolePattern.includes("מפקד2") && mission.key !== "מפ") {
          const alreadyHasCommander = hapakAssignments.some(h => 
            h.id === mission.id && h.assignedTo !== "" && (h.name.includes("מפקד") && !h.name.includes("מפקד2"))
          );
          if (alreadyHasCommander) continue;
        }

        // Saturday engineer restriction for 1G
        const isSaturday = new Date(date).getDay() === 6;
        if (rolePattern.includes("מהנדס") && isSaturday && mission.key === "1ג") {
          continue;
        }

        const finalStatus = getStatus(personName);
        
        const assignedOriginalName = purePersonName.trim();
        
        if (finalStatus !== "none" && !assignedNames.has(assignedOriginalName)) {
          if (finalStatus === "full") {
            filledSpecialists++;
          } else if (finalStatus === "leaving") {
            if (hasReturningInSlot) {
              hasReturningInSlot = false; 
            } else {
              hasLeavingInSlot = true;
              filledSpecialists++;
            }
          } else if (finalStatus === "returning") {
            if (hasLeavingInSlot) {
              hasLeavingInSlot = false; 
            } else {
              hasReturningInSlot = true;
              filledSpecialists++;
            }
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

  const temporaryAssignmentsMap = new Map<number, GuardShift>();

  for (const shift of sortedShifts) {
    const hour = shift.hour;

    const hourlyEligible = guardCandidates.filter(p => {
       const rawStatus = String(p.todayValue || "").trim().toUpperCase();
       if (rawStatus === "1" || rawStatus === "V") return true;
       if (rawStatus.includes("בית") && hour < 14) return true;
       if (rawStatus.includes("חוזר") && hour >= 20) return true;
       return false;
    });

    if (hourlyEligible.length > 0) {
      const best = hourlyEligible.reduce((prev, curr) => {
        const prevAssignments = Math.floor((localGenerationPoints[prev.name] || 0) / 1000);
        const currAssignments = Math.floor((localGenerationPoints[curr.name] || 0) / 1000);

        if (currAssignments < prevAssignments) return curr;
        if (currAssignments > prevAssignments) return prev;

        const prevScore = (prev.burdenPoints || 0) + (history[prev.name] || 0) + ((localGenerationPoints[prev.name] || 0) % 1000);
        const currScore = (curr.burdenPoints || 0) + (history[curr.name] || 0) + ((localGenerationPoints[curr.name] || 0) % 1000);
        return currScore < prevScore ? curr : prev;
      });

      temporaryAssignmentsMap.set(hour, {
        hour,
        time: shift.time,
        name: best.name,
        points: shift.shiftPoints
      });

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
  allowEmpty
}: {
  currentName: string;
  allPersonnel: AttendanceRecord[];
  onSwap: (newName: string) => void;
  readonly?: boolean;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const available = useMemo(() => {
    return allPersonnel
      .filter(p => String(p.todayValue).trim() === "1")
      .sort((a, b) => (a.burdenPoints || 0) - (b.burdenPoints || 0));
  }, [allPersonnel]);

  if (readonly) {
    return <span className="font-bold text-right py-1">{currentName}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "font-bold hover:text-primary transition-colors text-right flex items-center gap-1 group truncate max-w-[120px]",
          (!currentName || currentName === "לא מאויש" || currentName === "טרם שובץ") && "text-muted-foreground italic font-normal"
        )}>
          {(!currentName || currentName === "לא מאויש" || currentName === "טרם שובץ") ? "ריק / ללא שיבוץ" : currentName}
          <Shuffle className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[200px]" align="start">
        <Command>
          <CommandInput placeholder="חפש חייל..." className="h-9 text-right" dir="rtl" />
          <CommandList>
            <CommandEmpty>לא נמצאו חיילים.</CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem
                  value="ריק ללא שיבוץ"
                  onSelect={() => {
                    onSwap("");
                    setOpen(false);
                  }}
                  className="flex items-center justify-between text-muted-foreground italic font-normal"
                >
                  <span>(ריק) - ללא שיבוץ</span>
                  {(!currentName || currentName === "לא מאויש") && <Check className="w-3 h-3" />}
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
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.burdenPoints || 0} נק'</span>
                  </div>
                  {currentName === p.name && <Check className="w-3 h-3" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuardAssignmentPage() {
  const { isAuthenticated, isLoading: isAuthLoading, error: authError, resetError } = useRoleAuth("guard", "google-signin-btn-guard");
  const [date, setDate] = useState(getTodayIso());
  const { data, isLoading, isError, error, refetch, isFetching } = useMainAttendance(date);
  const [assignments, setAssignments] = useState<AssignmentData | null>(null);
  const [history, setHistory] = useState<PersonnelPoints>({});
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
      const isPresent = String(p.todayValue).trim().toUpperCase() === "1" || String(p.todayValue).trim().toUpperCase() === "V";
      if (!isPresent || assigned.has(normalizeNameStr(p.name))) return false;

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
  const [isLedgerCollapsed, setIsLedgerCollapsed] = useState(false);
  const [isHapakCollapsed, setIsHapakCollapsed] = useState(false);
  const [isGuardCollapsed, setIsGuardCollapsed] = useState(false);
  const [isAvailableCollapsed, setIsAvailableCollapsed] = useState(false);
  const guardTableRef = useRef<HTMLDivElement>(null);
  const hapakGridRef = useRef<HTMLDivElement>(null);

  const handleExportHapak = async () => {
    if (!hapakGridRef.current) return;
    try {
      setIsExportingHapak(true);
      toast.info("מכין תמונת חפ\"ק להורדה...");
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(hapakGridRef.current, {
        scale: 3, // Higher resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 500, // Force mobile-like layout during capture
        onclone: (clonedDoc) => {
          const element = clonedDoc.getElementById('hapak-export-container');
          if (element) {
            element.style.width = '500px';
            element.style.padding = '20px';
          }
          // Inject capture-specific styles
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            .grid-cols-1.md\\:grid-cols-2 { grid-template-cols: 1fr !important; }
            h2, h3 { font-size: 20px !important; margin-bottom: 15px !important; color: #000 !important; }
            .text-xs { font-size: 14px !important; }
            .text-\\[10px\\] { font-size: 11px !important; }
            .bg-amber-500\\/10 { background-color: #fff9db !important; border: 1px solid #fab005 !important; }
            .bg-muted\\/30 { background-color: #f8f9fa !important; border-bottom: 1px solid #dee2e6 !important; }
            button { display: none !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

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
    if (!guardTableRef.current) return;
    try {
      setIsExporting(true);
      toast.info("מכין תמונה להורדה...");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(guardTableRef.current, {
        scale: 3, // Higher resolution
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 500, // Force mobile-like layout during capture
        onclone: (clonedDoc) => {
          const element = clonedDoc.getElementById('guard-export-container');
          if (element) {
            element.style.width = '500px';
            element.style.padding = '20px';
          }
          // Inject capture-specific styles
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            table { width: 100% !important; min-width: 460px !important; }
            th, td { font-size: 15px !important; padding: 12px 8px !important; border-bottom: 1px solid #eee !important; color: #000 !important; }
            h2 { font-size: 22px !important; margin-bottom: 10px !important; color: #000 !important; }
            .font-mono { font-size: 13px !important; }
            .font-bold { font-weight: 800 !important; }
            button, .btn { display: none !important; }
            .max-h-\\[600px\\] { max-height: none !important; overflow: visible !important; }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `guard-schedule-${date}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("התמונה נשמרה בהצלחה!");
    } catch (error) {
      console.error("Failed to export image", error);
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
          setIsSaved(true);
        } else {
          if (isAuthenticated) {
            setAssignments(generateAssignment(data, history, hapakData, blockedNames, date));
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
    if (!isAuthenticated) return;
    setIsGenerating(true);
    setAssignments(null); // Clear UI during generation
    
    try {
      // Reload everything before generating to ensure latest changes from Excel/spreadsheet are used
      const { data: latestData } = await refetch();
      const latestHapakRows = await loadHapakRegistry();
      
      if (!latestData || !latestHapakRows) {
        toast.error("נכשל בטעינת נתונים עדכניים. הגנרוט הופסק.");
        return;
      }

      setAssignments(generateAssignment(latestData, history, latestHapakRows, blockedNames, date));
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

    const sessionUpdates = Array.from(consolidated.values());

    try {
      const response = await fetch("https://151.145.89.228.sslip.io/webhook/confirm-guards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: sessionUpdates })
      });

      if (!response.ok) throw new Error("API update failed");

      const newHistory = { ...history };
      sessionUpdates.forEach(u => {
        newHistory[u.name] = (newHistory[u.name] || 0) + u.points;
      });
      setHistory(newHistory);
      localStorage.removeItem(STORAGE_KEY);
      toast.success("השיבוץ אושר ונרשם ביומן הפעילות בהצלחה!");
    } catch (e) {
      console.error("Confirm API Error:", e);
      const newHistory = { ...history };
      sessionUpdates.forEach(u => {
        newHistory[u.name] = (newHistory[u.name] || 0) + u.points;
      });
      setHistory(newHistory);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      toast.warning("עדכון יומן הפעילות נכשל, נשמר באופן מקומי בלבד.");
    }
  };

  const handleSaveToSheet = async () => {
    if (!assignments) return;
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
      toast.success("השיבוץ נשמר בגיליון בהצלחה!");
    } catch (e) {
      console.error("Save API Error:", e);
      toast.error("שמירת השיבוץ בגיליון נכשלה.");
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
    const allPersonnel = data?.map(r => ({
      name: r.name,
      total: (r.burdenPoints || 0) + (history[r.name] || 0),
      isPermanent: (r.burdenPoints || 0) > 0,
      isSession: (history[r.name] || 0) > 0
    })) || [];

    return allPersonnel
      .sort((a, b) => b.total - a.total);
  }, [data, history]);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 elevated-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Shield className="w-6 h-6 text-overlay" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-overlay">שיבוץ שוויוני (ניקוד)</h1>
              <p className="text-overlay/70 text-sm mt-0.5">
                רשימת שמירות ושיבוצי חפ"ק
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!isAuthenticated && (
              <div className="flex items-center bg-white/10 rounded-xl overflow-hidden min-h-[36px] min-w-[200px] relative">
                <div id="google-signin-btn-guard" data-width="200" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-90"></div>
                {isAuthLoading && !authError && <span className="text-overlay/70 text-xs px-3">מתחבר...</span>}
                {authError && <span className="text-red-400 text-xs px-3 cursor-pointer" onClick={resetError} title={authError}>שגיאה. נסה שוב</span>}
              </div>
            )}
            {isAuthenticated && (
              <div className="px-3 py-1.5 bg-green-500/20 text-white border border-green-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                עריכה מותרת
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

      {!isLoading && !isGenerating && !isError && !assignments && !isAuthenticated && (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border shadow-sm animate-fade-in-up">
          <Shield className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-black text-foreground mb-2">טרם שובצו שמירות</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            לא נמצא שיבוץ שמור לתאריך זה. רק משתמש מורשה יכול לג'נרט ולשמור לוח שמירות חדש. התחבר למעלה לתחילת עבודה.
          </p>
        </div>
      )}

      {!isLoading && !isGenerating && !isError && assignments && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Controls, Stats & History */}
          <div className="lg:col-span-1 space-y-6 text-right" dir="rtl">
            <div className="bg-card border border-border rounded-xl p-5 card-shadow space-y-4">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-primary" />
                {isAuthenticated ? "ניהול שיבוץ" : "צפייה בשיבוץ (למורשים בלבד)"}
              </h2>
              {isAuthenticated ? (
                <div className="space-y-2">
                  <Button onClick={handleGenerate} className="w-full h-11 text-md font-bold gradient-hero border-none shadow-md">
                    ג'נרט שיבוץ חדש
                  </Button>
                  <Button onClick={handleSaveToSheet} variant="outline" className="w-full h-11 text-md font-bold border-primary text-primary hover:bg-primary/5">
                    <Save className="w-4 h-4 mr-2" />
                    שמור שיבוץ לגיליון
                  </Button>
                  <Button onClick={handleConfirm} variant="outline" className="w-full h-11 text-md font-bold border-primary text-primary hover:bg-primary/5">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    אשר ועדכן ניקוד בגליון
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-amber-600/80 p-3 bg-amber-500/5 rounded-lg text-center border border-amber-500/10">
                  <p>המערכת במצב <b>צפייה בלבד</b>.</p>
                  <p className="text-xs mt-1">כדי לערוך שיבוצים, עליך להתחבר דרך הכפתור למעלה באמצעות חשבון מורשה.</p>
                </div>
              )}
            </div>

            {/* Burden Ledger */}
            {isAuthenticated && (
              <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsLedgerCollapsed(!isLedgerCollapsed)}
                      className="p-1 hover:bg-muted rounded-md transition-colors"
                    >
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
                              <button 
                                onClick={() => toggleBlock(p.name)}
                                className={cn(
                                  "p-1.5 rounded-md transition-colors",
                                  isBlocked ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" : "text-muted-foreground hover:text-primary hover:bg-muted"
                                )}
                                title={isBlocked ? "בטל חסימה" : "חסום משיבוץ"}
                              >
                                {isBlocked ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                              </button>
                              <div className="flex flex-col text-right">
                                <span className={cn("text-sm font-medium", isBlocked && "line-through text-muted-foreground")}>{p.name}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {p.isPermanent ? "מהגליון" : "בסשן זה"}
                                </span>
                              </div>
                            </div>
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full",
                              p.isPermanent ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
                            )}>
                              {p.total} נק'
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Available Personnel */}
            {isAuthenticated && (
              <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAvailableCollapsed(!isAvailableCollapsed)}
                      className="p-1 hover:bg-muted rounded-md transition-colors"
                    >
                      {isAvailableCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <h3 className="font-black text-sm flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      חיילים פנויים למשימות ({availablePersonnel.length})
                    </h3>
                  </div>
                </div>
                {!isAvailableCollapsed && (
                  <div className="p-3 max-h-[400px] overflow-y-auto space-y-2">
                    {availablePersonnel.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">אין חיילים פנויים כרגע</div>
                    ) : (
                      <div className="flex flex-wrap gap-2 justify-start" dir="rtl">
                        {availablePersonnel.map((p) => (
                          <div 
                            key={p.name} 
                            className="bg-green-500/10 text-green-700 border border-green-500/20 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2"
                          >
                            <span>{p.name}</span>
                            <span className="text-[10px] opacity-60">({p.role || "חייל"})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isAuthenticated && (
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <div className="flex gap-2 text-primary">
                  <Info className="w-5 h-5 shrink-0" />
                  <div className="text-xs space-y-1 text-right">
                    <p className="font-bold">איך זה עובד?</p>
                    <p>המערכת מחשבת מי שמר הכי פחות לפי הניקוד המצטבר ומתעדפת אותו בשיבוץ הבא.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Assignments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hapak Grid */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow" ref={hapakGridRef} id="hapak-export-container">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsHapakCollapsed(!isHapakCollapsed)}
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                  >
                    {isHapakCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <div className="flex flex-col">
                    <h2 className="font-black flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      שיבוץ חפ"ק (לפי היררכיית תפקידים)
                    </h2>
                    <span className="text-[10px] text-muted-foreground font-mono mr-7">
                      תאריך: {date.split('-').reverse().join('/')}
                    </span>
                  </div>
                </div>
                {!isExportingHapak && !isHapakCollapsed && (
                  <Button onClick={handleExportHapak} variant="outline" size="sm" className="h-8 shadow-sm text-xs font-bold border-primary text-primary hover:bg-primary/5">
                    <Camera className="w-3.5 h-3.5 mr-2" />
                    שמור כתמונה
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
                           const isUnmanned = !h.assignedTo || h.assignedTo === "לא מאויש" || h.assignedTo === "טרם שובץ";
                           const roleText = !isUnmanned && person?.role ? `(${person.role.trim()})` : '';
                           
                           const parts = h.name.split(' - ');
                           const displayRole = parts.length > 1 ? parts[1].trim() : `עמדה ${h.memberIndex}`;

                           return (
                             <div key={`${h.id}-${h.memberIndex}-${h.name}-${hIdx}`} className={cn("flex items-center justify-between p-2 rounded-lg text-xs", h.memberIndex === 1 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/30")}>
                               <span className={cn("font-medium max-w-[100px] break-words text-right", h.memberIndex === 1 ? "text-amber-700 font-black" : "text-muted-foreground")}>
                                 {displayRole}
                               </span>
                               <div className="flex items-center gap-1.5 flex-row-reverse">
                                   <PersonnelSwap
                                     currentName={h.assignedTo}
                                     allPersonnel={data || []}
                                     onSwap={(newName) => handleSwap("hapak", h.id, newName, h.memberIndex, h.name)}
                                     readonly={!isAuthenticated}
                                     allowEmpty={true}
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

            {/* Guard Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow" ref={guardTableRef} id="guard-export-container">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsGuardCollapsed(!isGuardCollapsed)}
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                  >
                    {isGuardCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <div className="flex flex-col">
                    <h2 className="font-black flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      לו"ז שמירות (24 שעות)
                    </h2>
                    <span className="text-[10px] text-muted-foreground font-mono mr-7">
                      תאריך: {date.split('-').reverse().join('/')}
                    </span>
                  </div>
                </div>
                {!isExporting && !isGuardCollapsed && (
                  <Button onClick={handleExportImage} variant="outline" size="sm" className="h-8 shadow-sm text-xs font-bold border-primary text-primary hover:bg-primary/5">
                    <Camera className="w-3.5 h-3.5 mr-2" />
                    שמור כתמונה
                  </Button>
                )}
              </div>
              {!isGuardCollapsed && (
                <div className={cn(
                  "overflow-x-auto",
                  !isExporting && "max-h-[600px] overflow-y-auto"
                )}>
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted z-10">
                      <tr className="text-right">
                        <th className="px-5 py-3 font-black text-muted-foreground">שעה</th>
                        <th className="px-5 py-3 font-black text-muted-foreground">שומר</th>
                        {(!isExporting && isAuthenticated) && <th className="px-5 py-3 font-black text-muted-foreground">ניקוד</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {assignments?.guards.map((g, idx) => (
                        <tr
                          key={idx}
                          className={cn(
                            "border-t border-border transition-colors hover:bg-muted/50",
                            idx % 2 === 0 ? "bg-card" : "bg-background"
                          )}
                        >
                          <td className="px-5 py-3 font-mono text-xs text-muted-foreground flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              g.points === 2 ? "bg-indigo-500" : "bg-yellow-500"
                            )} />
                            {g.time}
                          </td>
                          <td className="px-5 py-3 font-bold">
                            <PersonnelSwap
                              currentName={g.name}
                              allPersonnel={data || []}
                              onSwap={(newName) => handleSwap("guard", g.hour, newName)}
                              readonly={!isAuthenticated}
                              allowEmpty={true}
                            />
                          </td>
                          {(!isExporting && isAuthenticated) && (
                            <td className="px-5 py-3">
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                g.points === 2 ? "bg-indigo-500/10 text-indigo-600" : "bg-yellow-500/10 text-yellow-700"
                              )}>
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
    </div>
  );
}
