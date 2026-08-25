import type { StatusType } from "@/types/attendance";
import { STATUS_LABELS } from "@/lib/attendanceUtils";
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

const STATUS_INFO: Record<
  StatusType,
  { icon: LucideIcon; className: string; description: string }
> = {
  "נוכח": {
    icon: Check,
    className: "text-status-base bg-status-base-bg border border-status-base/20",
    description: 'נוכח / V / "1" / "נ"',
  },
  "יצא לאפטר": {
    icon: ArrowUpRight,
    className: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20",
    description: "יצא לאפטר / יא",
  },
  "אפטר": {
    icon: Home,
    className: "text-status-home bg-status-home-bg border border-status-home/20",
    description: "באפטר / א",
  },
  "מחלה / גימלים": {
    icon: Stethoscope,
    className: "text-status-sick bg-status-sick-bg border border-status-sick/20",
    description: 'גימלים / "2"',
  },
  "מנותק קשר": {
    icon: AlertTriangle,
    className: "text-status-other bg-status-other-bg border border-status-other/20",
    description: "מנותק קשר / מק",
  },
  "קורס": {
    icon: BookOpen,
    className: "text-status-other bg-status-other-bg border border-status-other/20",
    description: "בקורס / ק",
  },
  "משתחרר": {
    icon: X,
    className: "text-status-home bg-status-home-bg border border-status-home/20",
    description: "משתחרר",
  },
  "שוחרר": {
    icon: X,
    className: "text-status-home bg-status-home-bg border border-status-home/20",
    description: "שוחרר",
  },
  "פוטנציאל נפקדות": {
    icon: AlertTriangle,
    className: "text-status-sick bg-status-sick-bg border border-status-sick/20",
    description: "פנ",
  },
  "פיצול": {
    icon: Split,
    className: "text-status-other bg-status-other-bg border border-status-other/20",
    description: "פיצול / פ",
  },
  "יציאה לפיצול": {
    icon: ArrowUpRight,
    className: "bg-indigo-500/10 text-indigo-700 border border-indigo-500/20",
    description: "יפ",
  },
  "אחר": {
    icon: HelpCircle,
    className: "text-status-other bg-status-other-bg border border-status-other/20",
    description: "ערך אחר",
  },
};

export default function LegendCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 card-shadow">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
        מקרא סטטוסים
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_LABELS.map((status) => {
          const info = STATUS_INFO[status];
          const Icon = info.icon;
          return (
            <div
              key={status}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${info.className}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold text-xs leading-tight">{status}</div>
                <div className="text-[10px] opacity-70 leading-tight">
                  {info.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
