import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMainAttendance } from "@/hooks/useAttendanceData";
import { getTodayIso, formatDateForApi, normalizeNameStr, getComputedPresence } from "@/lib/attendanceUtils";
import type { AttendanceRecord } from "@/types/attendance";
import DatePickerBar from "@/components/DatePickerBar";
import { LoadingOverlay, ErrorMessage } from "@/components/StatusMessages";
import { RefreshCw, Shield, Bus, Users, Save, Camera, Check, ChevronDown, Shuffle, UserCheck, Trash2 } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import html2canvas from "html2canvas";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HapakMember {
  id: number;
  name: string; // e.g. "חפ\"ק מ\"פ - מפקד"
  assignedTo: string;
}

interface TeamData {
  id: number;
  commander: string;
  soldiers: string[];
  medic: string;
}

interface PlatoonData {
  id: string; // "1" or "3"
  commander: string;
  teams: TeamData[];
}

interface BusAssignmentData {
  hapaks: HapakMember[];
  platoons: PlatoonData[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HAPAK_MISSIONS = [
  { id: 1, name: "מ\"פ", key: "מפ" },
  { id: 2, name: "1ג", key: "1ג" },
  { id: 3, name: "2ג", key: "2ג" },
  { id: 4, name: "3ג", key: "3ג" }
];

const PLATOONS = ["1", "3"];

// ─── Logic ────────────────────────────────────────────────────────────────────

function generateBusAssignment(records: AttendanceRecord[], hapakRegistryRows: any[]): BusAssignmentData {
  const assignedNames = new Set<string>();

  const getStatus = (name: string) => {
    const p = records.find(r => normalizeNameStr(r.name) === normalizeNameStr(name));
    return getComputedPresence(p);
  };

  // 1. Generate Hapaks (Using GuardAssignmentPage's robust logic)
  const hapaks: HapakMember[] = [];
  const rows = (Array.isArray(hapakRegistryRows) ? hapakRegistryRows : []).filter(r => r && typeof r === 'object');

  for (const mission of HAPAK_MISSIONS) {
    // 1. Mandatory Commander (All missions)
    const commanderRow = rows.find(r => String(r["תפקיד"] || "").trim().includes("מפקד") && !String(r["תפקיד"] || "").includes("2"));
    const commander2Row = rows.find(r => String(r["תפקיד"] || "").trim().includes("מפקד2"));
    
    let commanderName = "";
    
    if (commanderRow && commanderRow[mission.key]) {
      const name = String(commanderRow[mission.key]);
      if (name && name !== "טרם שובץ" && getStatus(name) !== "none") {
        commanderName = name.trim();
      }
    }
    
    if (!commanderName && commander2Row && commander2Row[mission.key]) {
      const name = String(commander2Row[mission.key]);
      if (name && name !== "טרם שובץ" && getStatus(name) !== "none") {
        commanderName = name.trim();
      }
    }

    if (commanderName) assignedNames.add(normalizeNameStr(commanderName));
    hapaks.push({ id: mission.id, name: `חפ"ק ${mission.name} - מפקד`, assignedTo: commanderName });

    // 2. Specialists (Drivers, Engineers, etc.)
    const specialistLimit = (mission.key === "מפ" || mission.key === "אנוח") ? 3 : 2;
    let specCount = 0;

    for (const row of rows) {
      if (specCount >= specialistLimit) break;
      const role = String(row["תפקיד"] || "").trim();
      if (role.includes("מפקד")) continue;

      const name = String(row[mission.key] || "");
      if (name && name !== "טרם שובץ" && getStatus(name) !== "none" && !assignedNames.has(normalizeNameStr(name))) {
        assignedNames.add(normalizeNameStr(name));
        hapaks.push({ 
          id: mission.id, 
          name: `חפ"ק ${mission.name} - ${role}`, 
          assignedTo: name.trim() 
        });
        specCount++;
      }
    }
  }

  // 2. Generate Platoons (Dynamic Teams)
  const platoons: PlatoonData[] = PLATOONS.map(pId => {
    // Available personnel in this platoon not in Hapak
    const platoonRecords = records.filter(r => 
      (r.department || "").includes(pId) && 
      !assignedNames.has(normalizeNameStr(r.name)) &&
      getStatus(r.name) !== "none"
    );

    // Pick Platoon Commander (Usually Officer/Sergeant)
    const platoonCommander = platoonRecords.find(r => 
      ((r.role || "").includes("קצין") || (r.role || "").includes("סמל")) &&
      !assignedNames.has(normalizeNameStr(r.name))
    );
    if (platoonCommander) assignedNames.add(normalizeNameStr(platoonCommander.name));

    // Dynamic Team Counting
    // Rule: Team commander must have "מפקד" in role
    const remaining = platoonRecords.filter(r => !assignedNames.has(normalizeNameStr(r.name)));
    const eligibleTeamCommanders = remaining.filter(r => (r.role || "").includes("מפקד"));
    const eligibleSoldiers = remaining.filter(r => !(r.role || "").includes("מפקד"));

    // Number of teams = Number of available commanders (minimun 1 if platoon has soldiers)
    const teamCount = eligibleTeamCommanders.length;
    const shuffledSoldiers = [...eligibleSoldiers].sort(() => Math.random() - 0.5);
    const shuffledCommanders = [...eligibleTeamCommanders].sort(() => Math.random() - 0.5);

    const teams: TeamData[] = [];
    for (let i = 0; i < teamCount; i++) {
      const tCmd = shuffledCommanders.pop();
      if (tCmd) assignedNames.add(normalizeNameStr(tCmd.name));

      const tSoldiers: string[] = [];
      // Calculate how many soldiers per team (remaining soldiers / remaining teams)
      const soldiersNeeded = Math.ceil(shuffledSoldiers.length / (teamCount - i));
      for (let j = 0; j < soldiersNeeded; j++) {
        const s = shuffledSoldiers.pop();
        if (s) {
          tSoldiers.push(s.name);
          assignedNames.add(normalizeNameStr(s.name));
        }
      }

      // Check for medic in the team's soldiers or remaining
      let tMedic = "";
      const medicInTeam = tSoldiers.find(sName => {
        const p = records.find(r => r.name === sName);
        return (p?.role || "").includes("חובש");
      });

      if (medicInTeam) {
        tMedic = medicInTeam;
      } else {
        const medicIdx = shuffledSoldiers.findIndex(r => (r.role || "").includes("חובש"));
        if (medicIdx > -1) {
          const m = shuffledSoldiers.splice(medicIdx, 1)[0];
          tMedic = m.name;
          assignedNames.add(normalizeNameStr(m.name));
        }
      }

      teams.push({
        id: i + 1,
        commander: tCmd?.name || "",
        soldiers: tSoldiers.filter(s => s !== tMedic), // Don't duplicate if medic is a soldier
        medic: tMedic
      });
    }

    return {
      id: pId,
      commander: platoonCommander?.name || "",
      teams
    };
  });

  return { hapaks, platoons };
}

// ─── Components ───────────────────────────────────────────────────────────────

function PersonnelSwap({
  currentName,
  allPersonnel,
  onSwap,
  readonly,
  filterDept,
  allowEmpty = true
}: {
  currentName: string;
  allPersonnel: AttendanceRecord[];
  onSwap: (newName: string) => void;
  readonly?: boolean;
  filterDept?: string;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    let list = allPersonnel.filter(p => getComputedPresence(p) !== "none");
    if (filterDept) {
      list = list.filter(p => (p.department || "").includes(filterDept));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }, [allPersonnel, filterDept]);

  const person = allPersonnel.find(p => p.name === currentName);
  const presence = getComputedPresence(person);

  const statusDot = useMemo(() => {
    if (!currentName || currentName === "" || currentName === "טרם שובץ") return null;
    let color = "bg-green-500";
    if (presence === "leaving") color = "bg-amber-500";
    else if (presence === "returning") color = "bg-blue-500";
    return <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", color)} />;
  }, [currentName, presence]);

  if (readonly) {
    return (
      <div className="flex items-center gap-1.5 font-bold text-sm">
        {statusDot}
        <span>{currentName || "-"}</span>
      </div>
    );
  }

  const content = (
    <Command className="border-none">
      <CommandInput placeholder="חפש חייל..." className="h-9 text-right" dir="rtl" autoFocus={!isMobile} />
      <CommandList className={cn("overflow-y-auto", isMobile ? "max-h-[50vh]" : "max-h-[300px]")}>
        <CommandEmpty>לא נמצאו תוצאות.</CommandEmpty>
        <CommandGroup>
          {allowEmpty && (
            <CommandItem 
              value="empty-selection" 
              onSelect={() => { onSwap(""); setOpen(false); }} 
              className="italic text-muted-foreground py-2 px-3 text-right"
            >
              (ריק) - ללא שיבוץ
            </CommandItem>
          )}
          {filtered.map(p => {
             const pPresence = getComputedPresence(p);
             const pStatusDot = (
               <div className={cn(
                 "w-1.5 h-1.5 rounded-full shrink-0",
                 pPresence === "leaving" ? "bg-amber-500" : 
                 pPresence === "returning" ? "bg-blue-500" : "bg-green-500"
               )} />
             );
             
             return (
              <CommandItem 
                key={p.name} 
                value={p.name}
                onSelect={() => { onSwap(p.name); setOpen(false); }}
                className="flex items-center justify-between py-2 px-3 border-b border-border/40 last:border-0"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 text-right" dir="rtl">
                  {pStatusDot}
                  <span className="font-bold truncate text-sm">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground mr-auto bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                    {p.role}
                  </span>
                </div>
                {currentName === p.name && <Check className="w-3 h-3 text-primary ml-2 shrink-0" />}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const trigger = (
    <button className={cn(
      "flex items-center gap-1.5 hover:text-primary transition-colors text-right group",
      (!currentName || currentName === "") && "text-muted-foreground italic font-normal"
    )}>
      {statusDot}
      <span className="text-sm font-bold truncate max-w-[120px]">
        {currentName || "בחר..."}
      </span>
      <ChevronDown className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
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
                <button className="p-2 rounded-full hover:bg-muted ml-2"><X className="w-4 h-4"/></button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            {content}
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
      <PopoverContent className="p-0 w-[220px]" align="start">
        {content}
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function BusAssignmentPage() {
  const { user, isAuthenticated } = useAuth();
  const [date, setDate] = useState(getTodayIso());
  
  const { data, isLoading, isError, error, refetch, isFetching } = useMainAttendance(date);
  const [hapakRegistry, setHapakRegistry] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<BusAssignmentData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchRegistry = async () => {
    try {
      const res = await fetch("https://151.145.89.228.sslip.io/webhook/hapak-eligible");
      if (res.ok) {
        const json = await res.json();
        setHapakRegistry(Array.isArray(json) ? json : []);
      }
    } catch(e) { console.error(e); }
  };

  const loadSaved = async (targetDate: string) => {
    try {
      const res = await fetch(`https://151.145.89.228.sslip.io/webhook/load-bus?date=${formatDateForApi(targetDate)}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.status !== "not_found") {
          return json as BusAssignmentData;
        }
      }
    } catch(e) { console.error(e); }
    return null;
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!data) return;
      const saved = await loadSaved(date);
      if (saved) {
        setAssignments(saved);
        setIsSaved(true);
      } else {
        // Auto-generate if not found
        const gen = generateBusAssignment(data, hapakRegistry);
        setAssignments(gen);
        setIsSaved(false);
      }
    };
    init();
  }, [date, data, hapakRegistry]);

  const handleSave = async () => {
    if (!assignments) return;
    setIsSaving(true);
    try {
      const res = await fetch("https://151.145.89.228.sslip.io/webhook/save-bus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDateForApi(date),
          assignment: assignments
        })
      });
      if (res.ok) {
        toast.success("השיבוץ נשמר בהצלחה");
        setIsSaved(true);
      } else {
        toast.error("שגיאה בשמירת השיבוץ");
      }
    } catch(e) {
      toast.error("שגיאה בתקשורת עם השרת");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!assignments) return;
    const element = document.getElementById("bus-assignment-content");
    if (!element) return;

    try {
      setIsExporting(true);
      toast.info("מכין תמונה להורדה...");
      
      // Wait for React to re-render in export mode
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8fafc", // matches slate-50
        windowWidth: 1200, // force desktop-like layout for export
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("bus-assignment-content");
          if (el) {
            el.style.padding = "20px";
            el.style.width = "1200px";
          }
        }
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `bus-assignment-${date}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("התמונה נשמרה בהצלחה");
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בייצור התמונה");
    } finally {
      setIsExporting(false);
    }
  };

  const updateHapak = (id: number, name: string, val: string) => {
    setAssignments(prev => {
      if (!prev) return null;
      return {
        ...prev,
        hapaks: prev.hapaks.map(h => (h.id === id && h.name === name) ? { ...h, assignedTo: val } : h)
      };
    });
    setIsSaved(false);
  };

  const updatePlatoonCmd = (pId: string, val: string) => {
    setAssignments(prev => {
      if (!prev) return null;
      return {
        ...prev,
        platoons: prev.platoons.map(p => p.id === pId ? { ...p, commander: val } : p)
      };
    });
    setIsSaved(false);
  };

  const updateTeam = (pId: string, tId: number, field: "commander" | "medic" | "soldier", val: string, sIdx?: number) => {
    setAssignments(prev => {
      if (!prev) return null;
      return {
        ...prev,
        platoons: prev.platoons.map(p => {
          if (p.id !== pId) return p;
          return {
            ...p,
            teams: p.teams.map(t => {
              if (t.id !== tId) return t;
              if (field === "commander") return { ...t, commander: val };
              if (field === "medic") return { ...t, medic: val };
              if (field === "soldier" && sIdx !== undefined) {
                const newSoldiers = [...t.soldiers];
                newSoldiers[sIdx] = val;
                return { ...t, soldiers: newSoldiers };
              }
              return t;
            })
          };
        })
      };
    });
    setIsSaved(false);
  };

  if (isLoading && !assignments) return <LoadingOverlay />;
  if (isError) return <ErrorMessage message={(error as Error)?.message} />;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-500 text-right" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Bus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black">שיבוץ מפקדים וניוד</h1>
            <p className="text-xs text-muted-foreground font-black">ניהול חפ"קים ומחלקות יומי (תקף מהשעה 18:00)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap justify-center" data-html2canvas-ignore>
          <DatePickerBar value={date} onChange={setDate} />
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl h-10"
          >
            <RefreshCw className={cn("w-4 h-4 ml-2", isFetching && "animate-spin")} />
            {isFetching ? "מרענן..." : "רענן נתונים"}
          </Button>

          {isAuthenticated && (
            <Button 
              variant={isSaved ? "outline" : "default"} 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
              className={cn("rounded-xl h-10", !isSaved && "animate-pulse-subtle")}
            >
              <Save className="w-4 h-4 ml-2" />
              {isSaving ? "שומר..." : "שמור שיבוץ"}
            </Button>
          )}

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleExport}
            className="rounded-xl h-10"
          >
            <Camera className="w-4 h-4 ml-2" />
            ייצוא תמונה
          </Button>
        </div>
      </div>

      {!assignments ? (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-3xl opacity-50">
          לא נמצאו נתונים לתאריך זה. נסה לרענן או לבחור תאריך אחר.
        </div>
      ) : (
        <div id="bus-assignment-content" className="bg-slate-50 rounded-3xl p-6">
          {/* Export-only header */}
          <div className={cn("hidden mb-8 border-b-4 border-primary pb-4", isExporting && "block")}>
            <h1 className="text-4xl font-black text-primary">שיבוץ מפקדים וניוד</h1>
            <p className="text-xl text-muted-foreground font-bold">טווח: {(() => {
              const d1 = date.split('-').reverse().slice(0, 2).join('/');
              const nextDateObj = new Date(date);
              nextDateObj.setDate(nextDateObj.getDate() + 1);
              const d2 = nextDateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
              return `${d1} - ${d2}`;
            })()}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Hapaks Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-black underline decoration-primary/30 decoration-4 underline-offset-4">חפ"קים (נוכחות בבסיס)</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {HAPAK_MISSIONS.map(mission => (
                <div key={mission.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden card-shadow hover:shadow-md transition-all">
                  <div className="p-3 bg-muted/30 border-b border-border text-right" dir="rtl">
                    <h3 className="text-sm font-black text-primary flex items-center gap-2">
                       <Shield className="w-4 h-4" />
                       חפ"ק {mission.name}
                    </h3>
                  </div>
                  <div className="p-3 space-y-2">
                    {assignments.hapaks.filter(h => h.id === mission.id)
                      .map((h, hIdx) => {
                         const parts = h.name.split(' - ');
                         const displayRole = parts.length > 1 ? parts[1].trim() : h.name;
                         const isCommander = displayRole.includes("מפקד");
                         return (
                           <div key={`${h.id}-${hIdx}`} className={cn("flex items-center justify-between p-2 rounded-lg text-xs", isCommander ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/30")}>
                             <span className={cn("font-medium max-w-[100px] break-words text-right", isCommander ? "text-amber-700 font-black" : "text-muted-foreground")}>{displayRole}</span>
                             <div className="flex items-center gap-1.5 flex-row-reverse text-right">
                               <PersonnelSwap 
                                 currentName={h.assignedTo}
                                 allPersonnel={data || []}
                                 onSwap={(v) => updateHapak(h.id, h.name, v)}
                                 readonly={isExporting || !isAuthenticated}
                               />
                             </div>
                           </div>
                         );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platoons Column (Main) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 px-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-black underline decoration-primary/30 decoration-4 underline-offset-4">סד"כ מחלקות (מחלקה 1 ו-3)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignments.platoons.map(p => (
                <div key={p.id} className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl">
                    <div className="flex items-center justify-between mb-3 border-b border-primary/10 pb-2">
                      <span className="font-black text-primary">מחלקה {p.id}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">מפקד מחלקה:</span>
                        <PersonnelSwap 
                          currentName={p.commander}
                          allPersonnel={data || []}
                          filterDept={`מחלקה ${p.id}`}
                          onSwap={(v) => updatePlatoonCmd(p.id, v)}
                          readonly={isExporting || !isAuthenticated}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {p.teams.map(t => (
                        <div key={t.id} className="bg-white p-3 rounded-xl border border-border/50 shadow-sm">
                          <div className="flex items-center justify-between mb-2 text-xs font-bold text-muted-foreground border-b border-border/30 pb-1">
                            <span>צוות {t.id}</span>
                            <div className="flex items-center gap-2">
                              <span>מפקד:</span>
                              <PersonnelSwap 
                                currentName={t.commander}
                                allPersonnel={data || []}
                                filterDept={`מחלקה ${p.id}`}
                                onSwap={(v) => updateTeam(p.id, t.id, "commander", v)}
                                readonly={isExporting || !isAuthenticated}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {t.soldiers.map((s, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-2 pr-2 border-r-2 border-border/30">
                                <span className="text-[10px] text-muted-foreground w-4">#{sIdx+1}</span>
                                <PersonnelSwap 
                                  currentName={s}
                                  allPersonnel={data || []}
                                  filterDept={`מחלקה ${p.id}`}
                                  onSwap={(v) => updateTeam(p.id, t.id, "soldier", v, sIdx)}
                                  readonly={isExporting || !isAuthenticated}
                                />
                              </div>
                            ))}
                            
                            <div className="mt-2 pt-2 border-t border-dashed border-border/50 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-orange-600/70">חובש:</span>
                              <PersonnelSwap 
                                currentName={t.medic}
                                allPersonnel={data || []}
                                filterDept={`מחלקה ${p.id}`}
                                onSwap={(v) => updateTeam(p.id, t.id, "medic", v)}
                                readonly={isExporting || !isAuthenticated}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Legend / Info */}
            <div className="bg-muted/50 p-4 rounded-xl border border-border flex items-center gap-6 justify-center text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>נוכח</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>יוצא היום</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>חוזר היום</span>
              </div>
              <div className="mr-auto opacity-50">
                * השיבוץ מתאפס בכל יום מחדש אם לא נשמר.
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
