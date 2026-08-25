import { cn } from "@/lib/utils";
import type { StatusType } from "@/types/attendance";
import {
  Check,
  ArrowUpRight,
  Home,
  Stethoscope,
  AlertTriangle,
  BookOpen,
  X,
  Split,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; className: string; icon: LucideIcon }
> = {
  "נוכח": {
    label: "נוכח",
    className: "bg-status-base-bg text-status-base border border-status-base/20",
    icon: Check,
  },
  "יצא לאפטר": {
    label: "יצא לאפטר",
    className: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20",
    icon: ArrowUpRight,
  },
  "אפטר": {
    label: "אפטר",
    className: "bg-status-home-bg text-status-home border border-status-home/20",
    icon: Home,
  },
  "מחלה / גימלים": {
    label: "גימלים",
    className: "bg-status-sick-bg text-status-sick border border-status-sick/20",
    icon: Stethoscope,
  },
  "מנותק קשר": {
    label: "מק",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: AlertTriangle,
  },
  "קורס": {
    label: "קורס",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: BookOpen,
  },
  "משתחרר": {
    label: "משתחרר",
    className: "bg-status-home-bg text-status-home border border-status-home/20",
    icon: X,
  },
  "שוחרר": {
    label: "שוחרר",
    className: "bg-status-home-bg text-status-home border border-status-home/20",
    icon: X,
  },
  "פוטנציאל נפקדות": {
    label: "פנ",
    className: "bg-status-sick-bg text-status-sick border border-status-sick/20",
    icon: AlertTriangle,
  },
  "פיצול": {
    label: "פיצול",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: Split,
  },
  "יציאה לפיצול": {
    label: "יציאה לפיצול",
    className: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20",
    icon: ArrowUpRight,
  },
  "אחר": {
    label: "אחר",
    className: "bg-status-other-bg text-status-other border border-status-other/20",
    icon: HelpCircle,
  },
};

const iconSize: Record<"sm" | "md" | "lg", string> = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
};

export default function StatusBadge({
  status,
  size = "md",
  showIcon = true,
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
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
      {showIcon && <Icon className={iconSize[size]} />}
      {status}
    </span>
  );
}
