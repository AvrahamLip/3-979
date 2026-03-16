import type { StatusCounts, RoleStats } from "@/types/attendance";
import { StatusCountsRow } from "./StatusCountsRow";
import { Users, CheckCircle2 } from "lucide-react";

interface SummaryCardsProps {
  totalCounts: StatusCounts;
  roles: RoleStats[];
}

function StatPill({
  label,
  value,
  total,
  colorClass,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`flex flex-col items-center p-3 rounded-xl ${colorClass}`}>
      <span className="text-2xl font-black leading-tight">{value}</span>
      <span className="text-xs font-semibold mt-0.5 opacity-80">{label}</span>
      <span className="text-[10px] opacity-60">{pct}%</span>
    </div>
  );
}

export default function SummaryCards({ totalCounts, roles }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Total Company Card */}
      <div className="bg-card border border-border rounded-xl p-5 card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div>
            <h3 className="font-bold text-sm">סיכום כולל</h3>
            <p className="text-xs text-muted-foreground">
              {totalCounts["בבסיס"]}/{totalCounts.total} בבסיס
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          <StatPill label="בבסיס" value={totalCounts["בבסיס"]} total={totalCounts.total} colorClass="text-status-base bg-status-base-bg" />
          <StatPill label="בבית" value={totalCounts["בבית"]} total={totalCounts.total} colorClass="text-status-home bg-status-home-bg" />
          <StatPill label="מחלה" value={totalCounts["מחלה / גימלים"]} total={totalCounts.total} colorClass="text-status-sick bg-status-sick-bg" />
          <StatPill label="פיצול" value={totalCounts["פיצול"]} total={totalCounts.total} colorClass="text-status-split bg-status-split-bg" />
          <StatPill label="שחרור" value={totalCounts["שחרור"]} total={totalCounts.total} colorClass="text-status-released bg-status-released-bg" />
          <StatPill label="אחר" value={totalCounts["אחר"]} total={totalCounts.total} colorClass="text-status-other bg-status-other-bg" />
        </div>
        {/* Total bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>סה&quot;כ {totalCounts.total} אנשים</span>
            <span>
              {totalCounts.total > 0
                ? Math.round((totalCounts["בבסיס"] / totalCounts.total) * 100)
                : 0}
              % בבסיס
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-status-base rounded-full transition-all duration-700"
              style={{
                width:
                  totalCounts.total > 0
                    ? `${(totalCounts["בבסיס"] / totalCounts.total) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Roles Breakdown Card */}
      <div className="bg-card border border-border rounded-xl p-5 card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div>
            <h3 className="font-bold text-sm">פירוט לפי תפקיד</h3>
            <p className="text-xs text-muted-foreground">{roles.length} תפקידים</p>
          </div>
        </div>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {roles.map((role) => (
            <div
              key={role.role}
              className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2"
            >
              <StatusCountsRow counts={role.counts} compact />
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground font-medium">
                  {role.counts["בבסיס"]}/{role.counts.total}
                </span>
                <span className="text-sm font-semibold">{role.role || "לא מוגדר"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
