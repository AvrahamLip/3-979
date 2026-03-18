import { useState, useMemo } from "react";
import { useMainAttendance } from "../hooks/useAttendanceData";
import {
  buildStatusCounts,
  buildRoleStats,
  buildDepartmentStats,
  getTodayIso,
} from "../lib/attendanceUtils";
import DatePickerBar from "../components/DatePickerBar";
import LegendCard from "../components/LegendCard";
import SummaryCards from "../components/SummaryCards";
import DepartmentAccordion from "../components/DepartmentAccordion";
import AttendanceTable from "../components/AttendanceTable";
import { LoadingOverlay, ErrorMessage, EmptyState } from "../components/StatusMessages";
import { RefreshCw } from "lucide-react";
import PWAInstallButton from "../components/PWAInstallButton";

export default function MainPage() {
  const [date, setDate] = useState(getTodayIso());
  const { data, isLoading, isError, error, refetch, isFetching } =
    useMainAttendance(date);

  const records = data ?? [];

  const totalCounts = useMemo(() => buildStatusCounts(records), [records]);
  const globalRoles = useMemo(() => buildRoleStats(records), [records]);
  const departments = useMemo(() => buildDepartmentStats(records), [records]);

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="gradient-hero rounded-2xl p-6 shadow-card header-accent-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary-foreground">
              דוח נוכחות פלוגה ג'
            </h1>
            <p className="text-primary-foreground/70 text-sm mt-1">
              {isLoading ? "טוען..." : `${records.length} אנשים`}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DatePickerBar value={date} onChange={setDate} />
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-primary-foreground transition-colors disabled:opacity-50"
              title="רענן"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>
      
      {/* PWA Install Promo */}
      <div className="flex justify-center">
        <PWAInstallButton />
      </div>

      {/* Loading */}
      {isLoading && <LoadingOverlay />}

      {/* Error */}
      {isError && !isLoading && (
        <ErrorMessage message={(error as Error)?.message ?? "שגיאה לא ידועה"} />
      )}

      {/* Empty */}
      {!isLoading && !isError && records.length === 0 && (
        <EmptyState date={date} />
      )}

      {/* Content */}
      {!isLoading && !isError && records.length > 0 && (
        <>
          {/* Summary Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-black text-foreground">סיכום</h2>
            <LegendCard />
            <SummaryCards totalCounts={totalCounts} roles={globalRoles} />
          </section>

          {/* Departments Accordion */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground">פירוט לפי מחלקה</h2>
              <span className="text-sm text-muted-foreground">
                {departments.length} מחלקות
              </span>
            </div>
            <DepartmentAccordion departments={departments} />
          </section>

          {/* Details Table */}
          <section className="space-y-3">
            <h2 className="text-lg font-black text-foreground">פירוט שמי</h2>
            <AttendanceTable records={records} />
          </section>
        </>
      )}
    </div>
  );
}
