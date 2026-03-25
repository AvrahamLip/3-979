import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDateForApi, processRecords, getTodayIso } from "@/lib/attendanceUtils";
import type { AttendanceRecord, StatusType } from "@/types/attendance";
import StatusBadge from "@/components/StatusBadge";
import { LoadingOverlay } from "@/components/StatusMessages";
import { CalendarDays, RefreshCw, Search, Users, Building2, Briefcase, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import DatePickerBar from "@/components/DatePickerBar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getRelativeDate(isoDate: string, offset: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(isoDate: string, offset: number): string {
  const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const d = new Date(isoDate + "T12:00:00");
  const dayName = hebrewDays[d.getDay()];

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");

  let relLabel = "";
  if (offset === -1) relLabel = "אתמול";
  else if (offset === 0) relLabel = "היום";
  else if (offset === 1) relLabel = "מחר";
  else if (offset === 2) relLabel = "מחרתיים";

  return `${relLabel} — יום ${dayName} ${day}/${month}`;
}

// ─── API fetch ────────────────────────────────────────────────────────────────

const MAIN_API = "https://151.145.89.228.sslip.io/webhook/Doch-1";

async function fetchDayData(isoDate: string): Promise<AttendanceRecord[]> {
  const apiDate = formatDateForApi(isoDate);
  const res = await fetch(`${MAIN_API}?date=${encodeURIComponent(apiDate)}`);
  if (!res.ok) throw new Error(`שגיאת שרת: ${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : json.data ?? [];
  return processRecords(arr);
}

function useDayData(isoDate: string) {
  return useQuery({
    queryKey: ["work-plan", isoDate],
    queryFn: () => fetchDayData(isoDate),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Day offsets ──────────────────────────────────────────────────────────────

const DAY_OFFSETS = [-1, 0, 1, 2] as const;

// ─── Collect all unique names across all days ─────────────────────────────────

function buildNameMap(
  days: (AttendanceRecord[] | undefined)[]
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const day of days) {
    if (!day) continue;
    for (const r of day) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        names.push(r.name);
      }
    }
  }
  return names.sort((a, b) => a.localeCompare("he"));
}

// ─── Per-day panel (loads its own data) ───────────────────────────────────────

interface DayInfo {
  isoDate: string;
  offset: number;
  label: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkPlanPage() {
  const [baseDate, setBaseDate] = useState(getTodayIso());
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusType | "">("");

  const days: DayInfo[] = useMemo(
    () =>
      DAY_OFFSETS.map((offset) => {
        const isoDate = getRelativeDate(baseDate, offset);
        return { isoDate, offset, label: formatDayLabel(isoDate, offset) };
      }),
    [baseDate]
  );

  // Fetch each day separately
  const q0 = useDayData(days[0].isoDate);
  const q1 = useDayData(days[1].isoDate);
  const q2 = useDayData(days[2].isoDate);
  const q3 = useDayData(days[3].isoDate);

  const queries = [q0, q1, q2, q3];
  const allLoading = queries.some((q) => q.isLoading);
  const allData = queries.map((q) => q.data);

  // Build unified user records map from all available data
  // We'll use the record from the "anchor" day (idx 1 = Today/Selected) for base info (dept, etc.)
  const userBasics = useMemo(() => {
    const map = new Map<string, { department: string; role: string }>();
    for (const day of allData) {
      if (!day) continue;
      for (const r of day) {
        if (!map.has(r.name) || (allData[1]?.some(tr => tr.name === r.name && tr.department))) {
           map.set(r.name, { department: r.department, role: r.role });
        }
      }
    }
    return map;
  }, [allData]);

  const allNames = useMemo(() => Array.from(userBasics.keys()).sort((a,b) => a.localeCompare("he")), [userBasics]);

  // Derived filter options
  const departments = useMemo(() => 
    [...new Set(Array.from(userBasics.values()).map(v => v.department))].filter(Boolean).sort(), 
  [userBasics]);

  const roles = useMemo(() => 
    [...new Set(Array.from(userBasics.values()).map(v => v.role))].filter(Boolean).sort(), 
  [userBasics]);

  // Build lookup map: name → status per day index
  const statusMaps = useMemo(
    () =>
      allData.map((recs) => {
        const m = new Map<string, AttendanceRecord["status"]>();
        if (recs) {
          for (const r of recs) m.set(r.name, r.status);
        }
        return m;
      }),
    [allData]
  );

  // Master Filtered Names
  const filteredNames = useMemo(() => {
    return allNames.filter((name) => {
      const basic = userBasics.get(name);
      if (!basic) return false;

      // 1. Search
      if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;

      // 2. Dept
      if (deptFilter && basic.department !== deptFilter) return false;

      // 3. Role (Multi-select)
      if (roleFilter.length > 0 && !roleFilter.includes(basic.role)) return false;

      // 4. Status (Check if person has this status on the anchor day)
      if (statusFilter) {
        const statusToday = statusMaps[1].get(name);
        if (statusToday !== statusFilter) return false;
      }

      return true;
    });
  }, [allNames, userBasics, search, deptFilter, roleFilter, statusFilter, statusMaps]);

  const handleRefresh = () => {
    queries.forEach((q) => q.refetch());
  };

  const isFetching = queries.some((q) => q.isFetching);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 elevated-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-overlay">
              תוכנית עבודה
            </h1>
            <p className="text-overlay/70 text-sm mt-1">
              {allLoading
                ? "טוען..."
                : `${filteredNames.length} אנשים · 4 ימים`}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DatePickerBar value={baseDate} onChange={setBaseDate} />
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-overlay transition-colors disabled:opacity-50 border border-white/10"
              aria-label="רענן"
              title="רענן"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="חיפוש שם..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>

        <div className="relative">
          <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
          >
            <option value="">כל המחלקות</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="relative">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-between text-sm font-normal pr-9",
                  roleFilter.length === 0 && "text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  {roleFilter.length === 0
                    ? "כל התפקידים"
                    : roleFilter.length === 1
                    ? roleFilter[0]
                    : `${roleFilter.length} תפקידים`}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <ScrollArea className="h-[300px] p-2">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 px-1 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[11px] px-2 w-full justify-start"
                      onClick={() => setRoleFilter([])}
                    >
                      נקה בחירה
                    </Button>
                  </div>
                  <div className="h-px bg-border mx-1" />
                  {roles.map((r) => (
                    <div
                      key={r}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => {
                        setRoleFilter(prev =>
                          prev.includes(r)
                            ? prev.filter((it) => it !== r)
                            : [...prev, r]
                        );
                      }}
                    >
                      <Checkbox
                        checked={roleFilter.includes(r)}
                        onCheckedChange={() => {}} // handled by div click for better mobile UX
                      />
                      <span className="text-xs truncate">{r}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative">
          <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusType)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
          >
            <option value="">כל הסטטוסים ({formatDayLabel(days[1].isoDate, 0).split('—')[0].trim()})</option>
            {["בבסיס", "בבית", "מחלה / גימלים", "אחר"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Loading */}
      {allLoading && <LoadingOverlay />}

      {/* Table */}
      {!allLoading && (
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden card-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="gradient-hero text-primary-foreground">
                  {/* Name column */}
                  <th className="px-4 py-3 font-bold text-right border-l border-white/10 sticky right-0 z-20 gradient-hero elevated-shadow-left">
                    שם
                  </th>
                  {/* Day columns */}
                  {days.map((day, i) => (
                    <th
                      key={day.isoDate}
                      className={cn(
                        "px-4 py-3 font-bold text-center whitespace-nowrap transition-colors",
                        i < days.length - 1 && "border-l border-white/10",
                        i === 1 && "bg-white/15" // highlight "today"
                      )}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                          {day.label.split("—")[0]?.trim()}
                        </span>
                        <span className="text-sm">
                          {day.label.split("—")[1]?.trim()}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredNames.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground bg-muted/5 font-medium"
                    >
                      {search ? "לא נמצאו תוצאות לחיפוש" : "אין נתונים לתצוגה"}
                    </td>
                  </tr>
                ) : (
                  filteredNames.map((name, idx) => (
                    <tr
                      key={name}
                      className={cn(
                        "group border-t border-border hover:bg-muted/50 transition-colors",
                        idx % 2 === 0 ? "bg-card" : "bg-background"
                      )}
                    >
                      {/* Sticky name column */}
                      <td
                        className={cn(
                          "px-4 py-2.5 font-semibold text-right border-l border-border sticky right-0 z-10 transition-colors group-hover:bg-muted/30",
                          idx % 2 === 0 ? "bg-card" : "bg-background"
                        )}
                      >
                        {name}
                      </td>
                      {/* Status per day */}
                      {statusMaps.map((map, di) => {
                        const status = map.get(name);
                        const isLoading = queries[di].isLoading;
                        return (
                          <td
                            key={di}
                            className={cn(
                              "px-4 py-2.5 text-center transition-colors",
                              di < days.length - 1 && "border-l border-border/50",
                              di === 1 && "bg-primary/5" // today highlight
                            )}
                          >
                            {isLoading ? (
                              <span className="inline-block w-16 h-5 rounded bg-muted animate-pulse" />
                            ) : status ? (
                              <StatusBadge status={status} size="sm" showIcon={false} />
                            ) : (
                              <span className="text-muted-foreground/30 font-mono">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Legend footer */}
          <div className="border-t border-border px-4 py-3 bg-muted/30 flex flex-wrap gap-4 items-center justify-end">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">מקרא:</span>
            {[
              { status: "בבסיס", label: "בבסיס" },
              { status: "בבית", label: "בבית" },
              { status: "מחלה / גימלים", label: "מחלה" },
              { status: "אחר", label: "אחר" },
            ].map(({ status, label }) => (
              <StatusBadge
                key={status}
                status={status as AttendanceRecord["status"]}
                size="sm"
                showIcon={false}
              />
            ))}
            <div className="flex items-center gap-1.5 mr-1">
              <span className="text-muted-foreground font-mono font-bold">-</span>
              <span className="text-muted-foreground text-[11px] font-semibold">אין נתונים</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
