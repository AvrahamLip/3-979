import { useState, useMemo } from "react";
import type { AttendanceRecord } from "@/types/attendance";
import StatusBadge from "./StatusBadge";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceTableProps {
  records: AttendanceRecord[];
}

type SortKey = "name" | "department" | "role" | "status" | "vacationStatus";

export default function AttendanceTable({ records }: AttendanceTableProps) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const departments = useMemo(
    () => [...new Set(records.map((r) => r.department).filter(Boolean))].sort(),
    [records]
  );
  const roles = useMemo(
    () => [...new Set(records.map((r) => r.role).filter(Boolean))].sort(),
    [records]
  );

  const filtered = useMemo(() => {
    let out = records;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q)
      );
    }
    if (deptFilter) out = out.filter((r) => r.department === deptFilter);
    if (roleFilter) out = out.filter((r) => r.role === roleFilter);
    if (statusFilter) out = out.filter((r) => r.status === statusFilter);
    return [...out].sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";

      if (sortKey === "vacationStatus") {
        const na = Number(va || 0);
        const nb = Number(vb || 0);
        return sortDir === "asc" ? na - nb : nb - na;
      }

      return sortDir === "asc"
        ? String(va).localeCompare(String(vb), "he")
        : String(vb).localeCompare(String(va), "he");
    });
  }, [records, search, deptFilter, roleFilter, statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : (
      <span className="w-3 h-3 inline-block" />
    );

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="חיפוש שם / תפקיד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">כל המחלקות</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">כל התפקידים</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">כל הסטטוסים</option>
          {["בבסיס", "בבית", "מחלה / גימלים", "אחר"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="gradient-hero text-primary-foreground">
                {([
                  { key: "name", label: "שם" },
                  { key: "department", label: "מחלקה" },
                  { key: "role", label: "תפקיד" },
                  { key: "vacationStatus", label: "% בית" },
                  { key: "status", label: "סטטוס" },
                ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-right px-4 py-3 font-bold cursor-pointer select-none hover:bg-white/10 transition-colors"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      <SortIcon col={key} />
                      {label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground">
                    לא נמצאו תוצאות
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr
                    key={`${r.name}-${idx}`}
                    className={cn(
                      "border-t border-border transition-colors hover:bg-muted/50",
                      idx % 2 === 0 ? "bg-card" : "bg-background"
                    )}
                  >
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.role}</td>
                    <td className="px-4 py-3 font-medium text-center">
                      {r.vacationStatus != null && r.vacationStatus !== "" ? (() => {
                        const raw = Number(r.vacationStatus);
                        const pct = Math.round(raw * 100);
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full bg-muted/50",
                              pct > 80 ? "text-red-600 font-bold" : "text-foreground"
                            )}>
                              {pct}%
                            </span>
                            <div className="w-12 h-1 bg-muted rounded-full overflow-hidden hidden sm:block">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  pct > 80 ? "bg-red-500" : "bg-primary/60"
                                )} 
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })() : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 bg-muted/30 text-xs text-muted-foreground text-left">
          מציג {filtered.length} מתוך {records.length} רשומות
        </div>
      </div>
    </div>
  );
}
