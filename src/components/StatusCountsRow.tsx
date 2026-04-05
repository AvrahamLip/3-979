import type { StatusCounts } from "@/types/attendance";
import { getSummaryCategory } from "@/lib/attendanceUtils";

interface StatusCountsRowProps {
  counts: StatusCounts;
  compact?: boolean;
}

export function StatusCountsRow({ counts, compact = false }: StatusCountsRowProps) {
  // Aggregate individual statuses into summary categories
  const aggregated: Record<string, number> = {
    "נוכח": 0,
    "אפטר": 0,
    "מחלה / גימלים": 0,
    "אחר": 0,
  };

  // We iterate through all keys in counts except 'total'
  Object.entries(counts).forEach(([key, value]) => {
    if (key === "total") return;
    const cat = getSummaryCategory(key as any);
    aggregated[cat] += value;
  });

  const items = [
    {
      label: "נוכח",
      value: aggregated["נוכח"],
      className: "text-status-base bg-status-base-bg",
    },
    {
      label: "אפטר",
      value: aggregated["אפטר"],
      className: "text-status-home bg-status-home-bg",
    },
    {
      label: "מחלה",
      value: aggregated["מחלה / גימלים"],
      className: "text-status-sick bg-status-sick-bg",
    },
    {
      label: "אחר",
      value: aggregated["אחר"],
      className: "text-status-other bg-status-other-bg",
    },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex items-center gap-1 rounded-md font-semibold ${item.className} ${
            compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
          }`}
        >
          <span className={compact ? "text-[10px]" : "text-xs"}>{item.value}</span>
          <span className="opacity-75">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
