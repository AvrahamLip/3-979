import type { StatusCounts, RoleStats } from "@/types/attendance";
import { StatusCountsRow } from "./StatusCountsRow";
import { Users, CheckCircle2 } from "lucide-react";
import { getSummaryCategory, STATUS_COLORS } from "@/lib/attendanceUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SummaryCardsProps {
  totalCounts: StatusCounts;
  roles: RoleStats[];
}

export default function SummaryCards({ totalCounts, roles }: SummaryCardsProps) {
  // Aggregate individual statuses into summary categories for the Roles Breakdown
  const entries = Object.entries(totalCounts)
    .filter(([k, v]) => k !== "total" && k !== "אחר" && (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  const top5 = entries.slice(0, 5);
  const othersCount = entries.slice(5).reduce((sum, [, v]) => sum + (v as number), 0) + (totalCounts["אחר"] || 0);

  const chartData = top5.map(([name, value]) => ({ name, value: value as number }));
  if (othersCount > 0) {
    chartData.push({ name: "אחר", value: othersCount });
  }

  // Calculate actual present users count
  const presentCount = Object.entries(totalCounts).reduce((sum, [key, value]) => {
    if (key === "total") return sum;
    const cat = getSummaryCategory(key as any);
    if (cat === "נוכח") return sum + (value as number);
    return sum;
  }, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalCounts.total > 0 ? Math.round((data.value / totalCounts.total) * 100) : 0;
      const colorVar = STATUS_COLORS[data.name as keyof typeof STATUS_COLORS] || "status-other";
      return (
        <div className="bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-4 flex flex-col gap-2 min-w-[140px] animate-fade-in ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: `hsl(var(--${colorVar}))` }} />
            <span className="font-bold text-sm text-foreground/90">{data.name}</span>
          </div>
          <div className="flex items-end justify-between mt-1">
             <span className="text-3xl font-black leading-none bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">{data.value}</span>
             <span className="text-xs font-bold text-foreground/60 bg-muted/50 px-2 py-1 rounded-lg shadow-sm">{pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Total Company Card */}
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 card-shadow flex flex-col hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-hero shadow-lg">
            <Users className="w-5 h-5 text-overlay" />
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight">סיכום כולל</h3>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="text-foreground font-bold">{presentCount}</span> מתוך <span className="text-foreground font-bold">{totalCounts.total}</span> נוכחים
            </p>
          </div>
        </div>
        
        <div className="flex-1 flex flex-row items-center justify-between gap-6">
          {/* Chart Donut */}
          <div className="relative w-36 h-36 shrink-0 drop-shadow-xl">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  cornerRadius={8}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => {
                    const colorVar = STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || "status-other";
                    return <Cell key={`cell-${index}`} fill={`hsl(var(--${colorVar}))`} className="hover:opacity-80 transition-opacity duration-200 cursor-pointer" />;
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70 tracking-tighter -mb-1">{totalCounts.total}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">סה״כ</span>
            </div>
          </div>

          {/* Custom Sleek Legend */}
          <div className="flex flex-col gap-2.5 flex-1 justify-center max-w-[180px]">
            {chartData.map((entry, index) => {
              const colorVar = STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || "status-other";
              const pct = totalCounts.total > 0 ? Math.round((entry.value / totalCounts.total) * 100) : 0;
              return (
                <div key={index} className="flex items-center justify-between text-sm group hover:bg-muted/30 p-1.5 -mx-1.5 rounded-lg transition-colors duration-200">
                  <div className="flex items-center gap-2.5">
                     <span 
                       className="w-3.5 h-3.5 rounded-full shadow-inner ring-2 ring-background group-hover:scale-110 transition-transform duration-200" 
                       style={{ backgroundColor: `hsl(var(--${colorVar}))` }} 
                     />
                     <span className="font-semibold text-foreground/80 group-hover:text-foreground transition-colors truncate max-w-[80px]" title={entry.name}>
                       {entry.name}
                     </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                     <span className="font-black text-foreground">{entry.value}</span>
                     <span className="text-[10px] font-bold opacity-60 w-5 text-left bg-muted/50 px-1 rounded">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Roles Breakdown Card */}
      <div className="bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 card-shadow hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-hero shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-overlay" />
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight">פירוט לפי תפקיד</h3>
            <p className="text-sm font-medium text-muted-foreground">{roles.length} תפקידים מוגדרים</p>
          </div>
        </div>
        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
          {roles.map((role) => {
            const roleAggregated: Record<string, number> = { "נוכח": 0 };
            Object.entries(role.counts).forEach(([key, value]) => {
              if (key === "total") return;
              const cat = getSummaryCategory(key as any);
              if (cat === "נוכח") roleAggregated["נוכח"] += (value as number);
            });

            const pct = role.counts.total > 0 ? Math.round((roleAggregated["נוכח"] / role.counts.total) * 100) : 0;

            return (
              <div
                key={role.role}
                className="flex items-center justify-between gap-3 bg-muted/30 hover:bg-muted/50 rounded-xl px-3.5 py-2.5 transition-colors duration-200"
              >
                <StatusCountsRow counts={role.counts} compact />
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-foreground">{role.role || "לא מוגדר"}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {roleAggregated["נוכח"]}/{role.counts.total} נוכחים
                    </span>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-black text-xs shadow-sm ring-1 ring-primary/20">
                    {pct}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
