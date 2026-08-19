import type { StatusCounts, RoleStats } from "@/types/attendance";
import { StatusCountsRow } from "./StatusCountsRow";
import { Users, CheckCircle2 } from "lucide-react";
import { getSummaryCategory, STATUS_COLORS } from "@/lib/attendanceUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SummaryCardsProps {
  totalCounts: StatusCounts;
  roles: RoleStats[];
}

export default function SummaryCards({ totalCounts, roles }: SummaryCardsProps) {
  // Aggregate individual statuses into summary categories for the Roles Breakdown (still using getSummaryCategory)
  // For the total company card, we want the top 5 raw statuses + "אחר"
  const entries = Object.entries(totalCounts)
    .filter(([k, v]) => k !== "total" && k !== "אחר" && (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  const top5 = entries.slice(0, 5);
  const othersCount = entries.slice(5).reduce((sum, [, v]) => sum + (v as number), 0) + (totalCounts["אחר"] || 0);

  const chartData = top5.map(([name, value]) => ({ name, value: value as number }));
  if (othersCount > 0) {
    chartData.push({ name: "אחר", value: othersCount });
  }

  // Calculate actual present users count using the existing logic so the title stats stay consistent
  const presentCount = Object.entries(totalCounts).reduce((sum, [key, value]) => {
    if (key === "total") return sum;
    const cat = getSummaryCategory(key as any);
    if (cat === "נוכח") return sum + (value as number);
    return sum;
  }, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground text-xs p-2 rounded shadow-md border border-border">
          <p className="font-bold">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Total Company Card */}
      <div className="bg-card border border-border rounded-xl p-5 card-shadow flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-hero">
            <Users className="w-4 h-4 text-overlay" />
          </div>
          <div>
            <h3 className="font-bold text-sm">סיכום כולל</h3>
            <p className="text-xs text-muted-foreground">
              {presentCount}/{totalCounts.total} נוכחים
            </p>
          </div>
        </div>
        
        <div className="flex-1 min-h-[220px] flex items-center justify-center -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => {
                  const colorVar = STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || "status-other";
                  return <Cell key={`cell-${index}`} fill={`hsl(var(--${colorVar}))`} />;
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="left"
                wrapperStyle={{ fontSize: '12px', right: 0 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Roles Breakdown Card */}
      <div className="bg-card border border-border rounded-xl p-5 card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-hero">
            <CheckCircle2 className="w-4 h-4 text-overlay" />
          </div>
          <div>
            <h3 className="font-bold text-sm">פירוט לפי תפקיד</h3>
            <p className="text-xs text-muted-foreground">{roles.length} תפקידים</p>
          </div>
        </div>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {roles.map((role) => {
            const roleAggregated: Record<string, number> = { "נוכח": 0 };
            Object.entries(role.counts).forEach(([key, value]) => {
              if (key === "total") return;
              const cat = getSummaryCategory(key as any);
              if (cat === "נוכח") roleAggregated["נוכח"] += (value as number);
            });

            return (
              <div
                key={role.role}
                className="flex items-center justify-between gap-2 bg-muted/40 rounded-lg px-3 py-2"
              >
                <StatusCountsRow counts={role.counts} compact />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black text-primary px-1.5 py-0.5 bg-primary/5 rounded">
                    {role.counts.total > 0 ? Math.round((roleAggregated["נוכח"] / role.counts.total) * 100) : 0}%
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {roleAggregated["נוכח"]}/{role.counts.total}
                  </span>
                  <span className="text-sm font-semibold">{role.role || "לא מוגדר"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
