import { useState, useMemo } from "react";
import { useZamaAttendance, ZAMA_DEPTS } from "@/hooks/useAttendanceData";
import {
  buildStatusCounts,
  buildRoleStats,
  getTodayIso,
} from "@/lib/attendanceUtils";
import type { AttendanceRecord } from "@/types/attendance";
import DatePickerBar from "@/components/DatePickerBar";
import LegendCard from "@/components/LegendCard";
import { StatusCountsRow } from "@/components/StatusCountsRow";
import StatusBadge from "@/components/StatusBadge";
import { LoadingOverlay, ErrorMessage, EmptyState } from "@/components/StatusMessages";
import { ChevronDown, ChevronUp, Building2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function ZamaDeptSection({
  deptName,
  records,
  index,
}: {
  deptName: string;
  records: AttendanceRecord[];
  index: number;
}) {
  const [open, setOpen] = useState(true);
  const counts = useMemo(() => buildStatusCounts(records), [records]);
  const roles = useMemo(() => buildRoleStats(records), [records]);
  const pct = counts.total > 0 ? Math.round((counts["בבסיס"] / counts.total) * 100) : 0;

  return (
    <div
      className="bg-card border border-border rounded-xl sm:rounded-2xl overflow-hidden card-shadow animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Dept Header */}
      <button
        className="w-full flex items-center justify-between p-3 sm:p-5 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
        <div className="flex-1 text-right mr-3">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-sm text-muted-foreground font-semibold">
              {counts["בבסיס"]}/{counts.total} בבסיס
            </span>
            <span
              className={cn(
                "text-sm font-black px-2.5 py-0.5 rounded-lg",
                "text-status-base bg-status-base-bg"
              )}
            >
              {pct}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-end mt-1">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="font-black text-base">{deptName}</span>
          </div>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted mx-5">
        <div
          className="h-full bg-status-base rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Body */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="p-3 sm:p-5 border-t border-border space-y-4 sm:space-y-5">
              {/* Overview counts */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  סיכום כולל
                </p>
                <StatusCountsRow counts={counts} />
              </div>

              {/* Roles breakdown */}
              {roles.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    פירוט לפי תפקיד
                  </p>
                  <div className="space-y-1.5">
                    {roles.map((role) => (
                      <div
                        key={role.role}
                        className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2"
                      >
                        <StatusCountsRow counts={role.counts} compact />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {role.counts["בבסיס"]}/{role.counts.total}
                          </span>
                          <span className="text-sm font-semibold">{role.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* People table */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  פירוט שמי
                </p>
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="gradient-hero text-overlay text-right">
                          <th className="px-4 py-2.5 font-bold">שם</th>
                          <th className="px-4 py-2.5 font-bold">תפקיד</th>
                          <th className="px-4 py-2.5 font-bold">סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-muted-foreground">
                              אין נתונים
                            </td>
                          </tr>
                        ) : (
                          records.map((r, idx) => (
                            <tr
                              key={`${r.name}-${idx}`}
                              className={cn(
                                "border-t border-border hover:bg-muted/40 transition-colors",
                                idx % 2 === 0 ? "bg-card" : "bg-background"
                              )}
                            >
                              <td className="px-4 py-2.5 font-semibold">{r.name}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{r.role}</td>
                              <td className="px-4 py-2.5">
                                <StatusBadge status={r.status} size="sm" />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ZamaPage() {
  const [date, setDate] = useState(getTodayIso());
  const { data, isLoading, isError, error, refetch, isFetching } =
    useZamaAttendance(date);

  const totalRecords = useMemo(() => {
    if (!data) return 0;
    return Object.values(data).reduce((sum, recs) => sum + recs.length, 0);
  }, [data]);

  const isEmpty =
    !isLoading &&
    !isError &&
    data &&
    Object.values(data).every((recs) => recs.length === 0);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 elevated-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-overlay">
              דוח נוכחות — צמ&quot;ה
            </h1>
            <p className="text-overlay/70 text-sm mt-1">
              {isLoading ? "טוען..." : `${totalRecords} אנשים ב-${ZAMA_DEPTS.length} יחידות`}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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

      {isLoading && <LoadingOverlay />}

      {isError && !isLoading && (
        <ErrorMessage message={(error as Error)?.message ?? "שגיאה לא ידועה"} />
      )}

      {isEmpty && <EmptyState date={date} />}

      {!isLoading && !isError && data && totalRecords > 0 && (
        <>
          <LegendCard />
          <div className="space-y-4">
            {ZAMA_DEPTS.map((dept, idx) => (
              <ZamaDeptSection
                key={dept}
                deptName={dept}
                records={data[dept] ?? []}
                index={idx}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
