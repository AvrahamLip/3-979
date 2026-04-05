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
  "נוכח": {
    label: "נוכח",
    className: "bg-status-base-bg text-status-base border border-status-base/20",
    icon: "✓",
  },
  "יצא לאפטר": {
    label: "יצא לאפטר",
    className: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20",
    icon: "↗",
  },
  "אפטר": {
    label: "אפטר",
    className: "bg-status-home-bg text-status-home border border-status-home/20",
    icon: "⌂",
  },
  "מחלה / גימלים": {
    label: "גימלים",
    className: "bg-status-sick-bg text-status-sick border border-status-sick/20",
    icon: "⚕",
  },
  "מנותק קשר": {
    label: "מק",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: "!",
  },
  "קורס": {
    label: "קורס",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: "✍",
  },
  "משתחרר": {
    label: "משתחרר",
    className: "bg-status-home-bg text-status-home border border-status-home/20",
    icon: "✖",
  },
  "שוחרר": {
    label: "שוחרר",
    className: "bg-status-home-bg text-status-home border border-status-home/20",
    icon: "✖",
  },
  "פוטנציאל נפקדות": {
    label: "פנ",
    className: "bg-status-sick-bg text-status-sick border border-status-sick/20",
    icon: "!",
  },
  "פיצול": {
    label: "פיצול",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: "÷",
  },
  "יציאה לפיצול": {
    label: "יציאה לפיצול",
    className: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20",
    icon: "↗",
  },
  "אחר": {
    label: "אחר",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: "?",
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
      {showIcon && <span className="opacity-80">{cfg.icon}</span>}
      {status}
    </span>
  );
}
