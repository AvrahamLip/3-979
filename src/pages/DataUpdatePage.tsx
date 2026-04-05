import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMainAttendance } from "@/hooks/useAttendanceData";
import { getTodayIso, formatDateForApi } from "@/lib/attendanceUtils";
import DatePickerBar from "@/components/DatePickerBar";
import { LoadingOverlay, ErrorMessage, EmptyState } from "@/components/StatusMessages";
import { Search, Edit, RefreshCw, Filter, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const UPDATE_API = "https://151.145.89.228.sslip.io/webhook/update-status";

const STATUS_OPTIONS = [
  { value: "נ", label: "נוכח", color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  { value: "יא", label: "יצא לאפטר", color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" },
  { value: "א", label: "אפטר", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  { value: "ג", label: "גימלים", color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  { value: "מק", label: "מנותק קשר", color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  { value: "ק", label: "קורס", color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  { value: "מ", label: "משתחרר", color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800" },
  { value: "ש", label: "שוחרר", color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800" },
  { value: "פנ", label: "פוטנציאל נפקדות", color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  { value: "פ", label: "פיצול", color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  { value: "יפ", label: "יציאה לפיצול", color: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800" },
  { value: "3", label: "אחר", color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  { value: "empty", label: "---", color: "bg-muted text-muted-foreground border-border" },
];

function normalizeValue(val: any): string {
  const v = String(val ?? "").trim().toUpperCase();
  if (v === "נ" || v === "V" || v === "1" || v === "4") return "נ";
  if (v === "יא") return "יא";
  if (v === "א" || v === "0") return "א";
  if (v === "ג" || v === "2" || v === "גימלים") return "ג";
  if (v === "מק") return "מק";
  if (v === "ק") return "ק";
  if (v === "מ") return "מ";
  if (v === "ש") return "ש";
  if (v === "פנ") return "פנ";
  if (v === "פ") return "פ";
  if (v === "יפ") return "יפ";
  if (v === "" || v === "EMPTY") return "empty";
  return "3";
}

export default function DataUpdatePage() {
  const { checkPermission, user, isAuthenticated } = useAuth();
  const [date, setDate] = useState(getTodayIso());
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useMainAttendance(date);

  const records = data ?? [];

  const departments = useMemo(
    () => [...new Set(records.map((r) => r.department).filter(Boolean))].sort(),
    [records]
  );

  const filtered = useMemo(() => {
    let out = records.filter(r => r.name && r.name.trim() !== "");
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(r => r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q));
    }
    if (deptFilter) {
      out = out.filter(r => r.department === deptFilter);
    }
    return out;
  }, [records, search, deptFilter]);

  const handleStatusUpdate = async (name: string, newStatus: string) => {
    const updateId = `${name}-${date}`;
    setUpdatingId(updateId);
    
    try {
      const res = await fetch(UPDATE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status: newStatus === "empty" ? "" : newStatus,
          date: formatDateForApi(date)
        })
      });

      if (res.ok) {
        toast.success(`הסטטוס של ${name} עודכן בהצלחה`);
        refetch(); // Refresh data to show newest state
      } else {
        throw new Error(`שגיאת שרת: ${res.status}`);
      }
    } catch (err: any) {
      console.error("Update failed:", err);
      toast.error(`עדכון נכשל: ${err.message || 'שגיאת תקשורת'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in pb-20">
      {/* Page Header */}
      <div className="gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 elevated-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white">
              <Edit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-overlay">עדכון פירוט שמי</h1>
              <p className="text-overlay/70 text-sm mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                מחובר כ: {user?.name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DatePickerBar value={date} onChange={setDate} />
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-overlay transition-colors disabled:opacity-50"
              title="רענן"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 card-shadow grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="חיפוש שם..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="relative">
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
          >
            <option value="">כל המחלקות</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingOverlay message="טוען נתונים..." />
      ) : isError ? (
        <ErrorMessage message={(error as Error)?.message || "שגיאה בטעינת נתונים"} />
      ) : filtered.length === 0 ? (
        <EmptyState date={date} />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden card-shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 font-bold text-muted-foreground">שם</th>
                  <th className="px-4 py-3 font-bold text-muted-foreground hidden sm:table-cell">מחלקה</th>
                  <th className="px-4 py-3 font-bold text-muted-foreground hidden md:table-cell">תפקיד</th>
                  <th className="px-4 py-3 font-bold text-muted-foreground">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((record, idx) => {
                  const currentCode = normalizeValue(record.todayValue);
                  const isUpdating = updatingId === `${record.name}-${date}`;
                  
                  return (
                    <tr key={`${record.name}-${idx}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{record.name}</div>
                        <div className="text-[10px] text-muted-foreground sm:hidden">{record.department}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{record.department}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{record.role}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={currentCode}
                            disabled={isUpdating}
                            onChange={(e) => handleStatusUpdate(record.name, e.target.value)}
                            className={cn(
                              "text-xs font-black px-3 py-1.5 rounded-full border shadow-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all cursor-pointer disabled:opacity-50",
                              STATUS_OPTIONS.find(opt => opt.value === currentCode)?.color
                            )}
                          >
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value} className="bg-background text-foreground">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground border-t border-border flex justify-between">
            <span>מציג {filtered.length} רשומות</span>
            <span>סך הכל {records.length} רשומות</span>
          </div>
        </div>
      )}
    </div>
  );
}
