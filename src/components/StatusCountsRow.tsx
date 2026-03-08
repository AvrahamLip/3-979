import type { StatusCounts } from "@/types/attendance";

interface StatusCountsRowProps {
  counts: StatusCounts;
  compact?: boolean;
}

export function StatusCountsRow({ counts, compact = false }: StatusCountsRowProps) {
  const items = [
    {
      label: "בבסיס",
      value: counts["בבסיס"],
      className: "text-status-base bg-status-base-bg",
    },
    {
      label: "בבית",
      value: counts["בבית"],
      className: "text-status-home bg-status-home-bg",
    },
    {
      label: "מחלה",
      value: counts["מחלה / גימלים"],
      className: "text-status-sick bg-status-sick-bg",
    },
    {
      label: "אחר",
      value: counts["אחר"],
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
