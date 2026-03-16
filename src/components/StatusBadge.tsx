import { cn } from "@/lib/utils";
import type { StatusType } from "@/types/attendance";

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; className: string; icon: string }
> = {
  "בבסיס": {
    label: "בבסיס",
    className: "bg-status-base-bg text-status-base border border-status-base/20",
    icon: "🪖",
  },
  "בבית": {
    label: "בבית",
    className: "bg-status-home-bg text-status-home border border-status-home/20",
    icon: "🏠",
  },
  "מחלה / גימלים": {
    label: "מחלה",
    className: "bg-status-sick-bg text-status-sick border border-status-sick/20",
    icon: "🤒",
  },
  "פיצול": {
    label: "פיצול",
    className: "bg-status-split-bg text-status-split border border-status-split/20",
    icon: "⚖️",
  },
  "שחרור": {
    label: "שחרור",
    className: "bg-status-released-bg text-status-released border border-status-released/20",
    icon: "🚪",
  },
  "אחר": {
    label: "אחר",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: "❓",
  },
};

export default function StatusBadge({
  status,
  size = "md",
  showIcon = true,
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-semibold",
        cfg.className,
        size === "sm" && "text-xs px-2 py-0.5",
        size === "md" && "text-xs px-2.5 py-1",
        size === "lg" && "text-sm px-3 py-1.5"
      )}
    >
      {status}
    </span>
  );
}
