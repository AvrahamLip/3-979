import { useState, useMemo, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { useRoleAuth } from "@/hooks/useRoleAuth";
import { useMainAttendance } from "@/hooks/useAttendanceData";
import { getTodayIso, formatDateForApi } from "@/lib/attendanceUtils";
import type { AttendanceRecord } from "@/types/attendance";
import DatePickerBar from "@/components/DatePickerBar";
import { LoadingOverlay, ErrorMessage, EmptyState } from "@/components/StatusMessages";
import { RefreshCw, Shield, Users, Clock, Shuffle, CheckCircle2, Save, Trash2, Info, Camera } from "lucide-react";
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
import { Check, Search } from "lucide-react";

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

const SPECIALIST_ORDER = ["מהנדס", "רופא", "אוכלוסיה", "שו\"ב", "קשר", "חובש"];
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

// ─── Logic ────────────────────────────────────────────────────────────────────

function getPointsForHour(hour: number): number {
  return (hour >= 0 && hour < 8) ? POINTS.NIGHT_GUARD : POINTS.DAY_GUARD;
}

const normalizeNameStr = (name: string) => name.replace(/\s+/g, ' ').trim();

function generateAssignment(records: AttendanceRecord[], history: PersonnelPoints, hapakRows: any[]): AssignmentData {
  const hapakAssignments: HapakMission[] = [];
  const assignedNames = new Set<string>();

  const rows = Array.isArray(hapakRows) ? hapakRows : [];

  const inBaseMap = new Map<string, boolean>(records.map(r => [normalizeNameStr(r.name), String(r.todayValue).trim() === "1"]));

  for (const mission of HAPAK_MISSIONS) {
    // 1. Mandatory Commander (always slot 1)
    const commanderRow = rows.find(r => r["תפקיד"] && r["תפקיד"].trim().includes("מפקד") && !r["תפקיד"].includes("2"));
    const commander2Row = rows.find(r => r["תפקיד"] && r["תפקיד"].trim().includes("מפקד2"));
    
    let commanderName = "טרם שובץ";
    
    const getStatus = (name: string): "full" | "leaving" | "returning" | "none" => {
      const p = records.find(r => normalizeNameStr(r.name) === name);
      if (!p) return "none";
      const v = String(p.todayValue).trim();
      if (v === "1") return "full";
      if (v.includes("היום בבית")) return "leaving";
      if (v.includes("חוזר היום")) return "returning";
      return "none";
    };

    // Primary commander check
    if (commanderRow && commanderRow[mission.key]) {
      const pureNameFromApi = String(commanderRow[mission.key]);
      const nameFromApi = normalizeNameStr(pureNameFromApi);
      if (nameFromApi && nameFromApi !== "טרם שובץ" && getStatus(nameFromApi) !== "none") {
        commanderName = pureNameFromApi.trim();
      }
    }
    
    // Secondary commander fallback
    if (commanderName === "טרם שובץ" && commander2Row && commander2Row[mission.key]) {
      const pureNameFromApi = String(commander2Row[mission.key]);
      const nameFromApi = normalizeNameStr(pureNameFromApi);
      if (nameFromApi && nameFromApi !== "טרם שובץ" && getStatus(nameFromApi) !== "none") {
        commanderName = pureNameFromApi.trim();
      }
    }
    
    if (commanderName && commanderName !== "טרם שובץ") assignedNames.add(commanderName);
    
    hapakAssignments.push({
      id: mission.id,
      memberIndex: 1,
      name: `חפ"ק ${mission.name} - מפקד`,
      assignedTo: commanderName,
      points: POINTS.HAPAK
    });

    // 2. Remaining Specialists (3 for MP, 2 for others)
    const slotCount = mission.key === "מפ" ? 3 : 2;
    let filledSlots = 0;
    
    let hasLeavingInSlot = false;
    let hasReturningInSlot = false;

    // Defined Priority rows in order
    const priorityRoles = ["מהנדס", "רופא", "אוכלוסיה", "שו\"ב", "חובש", "קשר", "מפקד2", "מהנדס2"];
    
    for (const rolePattern of priorityRoles) {
       // If we've reached the slot limit AND we are not just looking for a complementary partial day, break.
       // E.g. If we have 2 slots, and we've filled 2. But the 2nd slot was a "leaving" person, we can take 1 more "returning" person.
       if (filledSlots >= slotCount) {
         if (!(filledSlots === slotCount && ((hasLeavingInSlot && !hasReturningInSlot) || (!hasLeavingInSlot && hasReturningInSlot)))) {
           break;
         }
       }

       const roleRow = rows.find(r => r["תפקיד"] && r["תפקיד"].trim().includes(rolePattern));
       if (roleRow && roleRow[mission.key]) {
         const purePersonName = String(roleRow[mission.key]);
         const personName = normalizeNameStr(purePersonName);
         if (personName && personName !== "" && personName !== "טרם שובץ") {
           const status = getStatus(personName);
           const assignedOriginalName = purePersonName.trim();
           
           if (status !== "none" && !assignedNames.has(assignedOriginalName)) {
             
             // Manage slot capacity with partials
             if (status === "full") {
               filledSlots++;
             } else if (status === "leaving") {
               if (hasReturningInSlot) {
                 hasReturningInSlot = false; // completed a pair
               } else {
                 hasLeavingInSlot = true;
                 filledSlots++;
               }
             } else if (status === "returning") {
               if (hasLeavingInSlot) {
                 hasLeavingInSlot = false; // completed a pair
               } else {
                 hasReturningInSlot = true;
                 filledSlots++;
               }
             }

             assignedNames.add(assignedOriginalName);
             hapakAssignments.push({
               id: mission.id,
               memberIndex: filledSlots + 1,
               name: `חפ"ק ${mission.name} - ${rolePattern}`,
               assignedTo: assignedOriginalName,
               points: POINTS.HAPAK
             });
           }
         }
       }
    }

    // 3. Fallback: If slots still empty, fill with placeholders
    while (Math.floor(filledSlots) < slotCount) {
       filledSlots++;
       hapakAssignments.push({
         id: mission.id,
         memberIndex: Math.floor(filledSlots) + 1,
         name: `חפ"ק ${mission.name} - עמדה ${Math.floor(filledSlots) + 1}`,
         assignedTo: "טרם שובץ",
         points: POINTS.HAPAK
       });
    }
  }

  // 2. Guard Assignment (24 hourly slots)
  // We use a local points tracker for the current generation to avoid duplicate/heavy loading in one person
  const localGenerationPoints: Record<string, number> = {};
  
  const guardAssignments: GuardShift[] = [];
  const guardCandidates = records.filter(p => 
    !assignedNames.has(p.name) && 
    GUARD_RELEVANT_ROLES.some(role => (p.role || "").includes(role))
  );

  for (let i = 0; i < 24; i++) {
    const hour = (i + 12) % 24;
    const time = `${String(hour).padStart(2, "0")}:00 - ${String((hour + 1) % 24).padStart(2, "0")}:00`;
    const shiftPoints = getPointsForHour(hour);

    // Rule:
    // 1. In base (בבסיס) -> All hours
    // 2. Leaving Today (היום בבית) -> Only until 14:00 (h < 14)
    // 3. Returning Today (חוזר היום) -> Only from 20:00 (h >= 20)
    
    const hourlyEligible = guardCandidates.filter(p => {
       const rawStatus = String(p.todayValue || "").trim();
       if (rawStatus === "1") return true;
       if (rawStatus.includes("היום בבית") && hour < 14) return true;
       if (rawStatus.includes("חוזר היום") && hour >= 20) return true;
       return false;
    });

    if (hourlyEligible.length > 0) {
      // Pick the best person based on (Burden Points + Historical Points + Points already assigned in this session)
      const best = hourlyEligible.reduce((prev, curr) => {
        const prevScore = (prev.burdenPoints || 0) + (history[prev.name] || 0) + (localGenerationPoints[prev.name] || 0);
        const currScore = (curr.burdenPoints || 0) + (history[curr.name] || 0) + (localGenerationPoints[curr.name] || 0);
        return currScore < prevScore ? curr : prev;
      });

      guardAssignments.push({
        hour,
        time,
        name: best.name,
        points: shiftPoints
      });

      // נוסיף פנדל גבוה מאוד (1000) לאותו אדם בתוך הסשן הנוכחי
      // זה יבטיח שהמערכת תשתדל ככל האפשר שלא לשבץ את אותו אדם פעמיים באותו יום ללא תלות בניקוד הקודם שלו.
      localGenerationPoints[best.name] = (localGenerationPoints[best.name] || 0) + shiftPoints + 1000;
    } else {
      guardAssignments.push({ hour, time, name: "-", points: shiftPoints });
    }
  }

  return { hapak: hapakAssignments, guards: guardAssignments };
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function PersonnelSwap({
  currentName,
  allPersonnel,
  onSwap,
  readonly
}: {
  currentName: string;
  allPersonnel: AttendanceRecord[];
  onSwap: (newName: string) => void;
  readonly?: boolean;
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
        <button className="font-bold hover:text-primary transition-colors text-right flex items-center gap-1 group">
          {currentName}
          <Shuffle className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[200px]" align="start">
        <Command>
          <CommandInput placeholder="חפש חייל..." className="h-9" />
          <CommandList>
            <CommandEmpty>לא נמצאו חיילים.</CommandEmpty>
            <CommandGroup>
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingHapak, setIsExportingHapak] = useState(false);
  const guardTableRef = useRef<HTMLDivElement>(null);
  const hapakGridRef = useRef<HTMLDivElement>(null);

  const handleExportHapak = async () => {
    if (!hapakGridRef.current) return;
    try {
      setIsExportingHapak(true);
      toast.info("מכין תמונת חפ\"ק להורדה...");
      await new Promise(resolve => setTimeout(resolve, 150));
      const canvas = await html2canvas(hapakGridRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
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
      // אנו ממתינים קצר כדי לאפשר למערכת להסיר את הגבלת הגובה ואז לצלם
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const canvas = await html2canvas(guardTableRef.current, {
        scale: 2, // Retain high resolution on export
        backgroundColor: '#ffffff'
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

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
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
    const fetchHapakData = async () => {
      try {
        const response = await fetch("https://151.145.89.228.sslip.io/webhook/hapak-eligible");
        if (response.ok) {
          const data = await response.json();
          setHapakData(Array.isArray(data) ? data : [data]);
        }
      } catch (e) {
        console.error("Failed to fetch hapak data", e);
      }
    };
    fetchHapakData();
  }, []);

  useEffect(() => {
    const init = async () => {
      // Wait for Hapak API data before generating new assignment
      if (data && data.length > 0 && hapakData.length > 0) {
        const saved = await fetchSavedAssignment(date);
        if (saved) {
          setAssignments(saved);
          setIsSaved(true);
        } else {
          if (isAuthenticated) {
            setAssignments(generateAssignment(data, history, hapakData));
            setIsSaved(false);
          } else {
            setAssignments(null);
            setIsSaved(true);
          }
        }
      }
    };
    init();
  }, [data, history, date, hapakData, isAuthenticated]);

  const handleGenerate = () => {
    if (data) {
      setIsGenerating(true);
      setAssignments(null); // Clears the screen visually
      setTimeout(() => {
        setAssignments(generateAssignment(data, history, hapakData));
        setIsSaved(false);
        setIsGenerating(false);
      }, 500);
    }
  };

  const handleSwap = (type: "hapak" | "guard", id: number, newName: string, memberIndex?: number) => {
    setAssignments(prev => {
      if (!prev) return null;
      const next = { ...prev };
      if (type === "hapak") {
        next.hapak = next.hapak.map(h =>
          (h.id === id && h.memberIndex === memberIndex) ? { ...h, assignedTo: newName } : h
        );
      } else {
        next.guards = next.guards.map(g =>
          g.hour === id ? { ...g, name: newName } : g
        );
      }
      return next;
    });
    setIsSaved(false); // Mark as modified
  };

  const handleConfirm = async () => {
    if (!assignments) return;

    // 1. Prepare updates for the API (Activity Log format) - CONSOLIDATED PER PERSON
    const formattedDate = formatDateForApi(date);
    const consolidated = new Map<string, any>();

    const addUpdate = (name: string, role: string, type: string, hours: string, points: number) => {
      if (name === "טרם שובץ" || name === "-") return;
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
      if (h.assignedTo !== "טרם שובץ") {
        const parts = h.name.split(' - ');
        const displayRole = parts.length > 1 ? parts[1].trim() : `עמדה ${h.memberIndex}`;
        addUpdate(h.assignedTo, displayRole, 'חפ"ק', 'לתאם', h.points);
      }
    });

    assignments.guards.forEach(g => {
      if (g.name !== "-") {
        const person = data?.find(p => p.name === g.name);
        addUpdate(g.name, person?.role || 'שומר', 'שמירה', g.time, g.points);
      }
    });

    const sessionUpdates = Array.from(consolidated.values());

    // 2. Call the API
    try {
      const response = await fetch("https://151.145.89.228.sslip.io/webhook/confirm-guards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: sessionUpdates })
      });

      if (!response.ok) throw new Error("API update failed");

      // 3. Update session history internally so UI updates flawlessly (shows points added matching API)
      const newHistory = { ...history };
      sessionUpdates.forEach(u => {
        newHistory[u.name] = (newHistory[u.name] || 0) + u.points;
      });
      setHistory(newHistory);
      
      // Clear localStorage so we don't double count on next app reload (Google sheets will be computed by then)
      localStorage.removeItem(STORAGE_KEY);

      toast.success("השיבוץ אושר ונרשם ביומן הפעילות בהצלחה!");
      
      // Deliberately NOT calling refetch() here. 
      // Google Sheets formulas take several seconds to compute. 
      // If we refetch instantly, we'll get the old values and appear as if nothing happened.
    } catch (e) {
      console.error("Confirm API Error:", e);
      // Fallback to local storage if API fails completely
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

  const sortedHistory = useMemo(() => {
    // Current points per person = record.burdenPoints + history[name]
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
              <p className="text-overlay/70 text-sm mt-0.5">חפ"ק = 3 | לילה = 2 | יום = 1</p>
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
          <div className="lg:col-span-1 space-y-6">
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

            {/* Burden Ledger (Top 10) */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h3 className="font-black text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  טבלת עומס (ניקוד מצטבר)
                </h3>
                <button onClick={handleResetHistory} title="אפס הכל" className="text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-1 max-h-[600px] overflow-y-auto">
                {sortedHistory.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">אין נתונים היסטוריים</div>
                ) : (
                  sortedHistory.map((p) => (
                    <div key={p.name} className="flex items-center justify-between p-2.5 border-b border-border last:border-0">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {p.isPermanent ? "מהגליון" : "בסשן זה"}
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        p.isPermanent ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {p.total} נק'
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
              <div className="flex gap-2 text-primary">
                <Info className="w-5 h-5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">איך זה עובד?</p>
                  <p>המערכת מחשבת מי שמר הכי פחות לפי הניקוד המצטבר ומתעדפת אותו בשיבוץ הבא.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Assignments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hapak Grid */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow" ref={hapakGridRef}>
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="font-black flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  שיבוץ חפ"ק (לפי היררכיית תפקידים)
                </h2>
                {!isExportingHapak && (
                  <Button onClick={handleExportHapak} variant="outline" size="sm" className="h-8 shadow-sm text-xs font-bold border-primary text-primary hover:bg-primary/5">
                    <Camera className="w-3.5 h-3.5 mr-2" />
                    שמור כתמונה
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
                {HAPAK_MISSIONS.map(mission => (
                  <div key={mission.id} className="bg-card p-4">
                    <h3 className="text-sm font-black mb-3 text-primary">חפ"ק {mission.name}</h3>
                    <div className="space-y-2">
                      {assignments?.hapak.filter(h => h.id === mission.id)
                        .sort((a, b) => a.memberIndex - b.memberIndex)
                        .map(h => {
                         const person = data?.find(p => p.name === h.assignedTo);
                         const roleText = h.assignedTo !== "טרם שובץ" && person?.role ? `(${person.role.trim()})` : '';
                         
                         // Get dynamic role name from h.name (e.g., 'חפ"ק מ"פ - מפקד' -> 'מפקד')
                         const parts = h.name.split(' - ');
                         const displayRole = parts.length > 1 ? parts[1].trim() : `עמדה ${h.memberIndex}`;

                         return (
                           <div key={`${h.id}-${h.memberIndex}`} className={cn("flex items-center justify-between p-2 rounded-lg text-xs", h.memberIndex === 1 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/30")}>
                             <span className={cn("font-medium max-w-[90px] break-words text-right", h.memberIndex === 1 ? "text-amber-700 font-black" : "text-muted-foreground")}>
                               {displayRole}
                             </span>
                             <div className="flex items-center gap-1.5 flex-row-reverse">
                               <PersonnelSwap
                                 currentName={h.assignedTo}
                                 allPersonnel={data || []}
                                 onSwap={(newName) => handleSwap("hapak", h.id, newName, h.memberIndex)}
                                 readonly={!isAuthenticated}
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
            </div>

            {/* Guard Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden card-shadow" ref={guardTableRef}>
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="font-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  לו"ז שמירות (24 שעות)
                </h2>
                {!isExporting && (
                  <Button onClick={handleExportImage} variant="outline" size="sm" className="h-8 shadow-sm text-xs font-bold border-primary text-primary hover:bg-primary/5">
                    <Camera className="w-3.5 h-3.5 mr-2" />
                    שמור כתמונה
                  </Button>
                )}
              </div>
              <div className={cn(
                "overflow-x-auto",
                !isExporting && "max-h-[600px] overflow-y-auto"
              )}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr className="text-right">
                      <th className="px-5 py-3 font-black text-muted-foreground">שעה</th>
                      <th className="px-5 py-3 font-black text-muted-foreground">שומר</th>
                      {!isExporting && <th className="px-5 py-3 font-black text-muted-foreground">ניקוד</th>}
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
                          />
                        </td>
                        {!isExporting && (
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
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
