import type { StatusType } from "@/types/attendance";
import { STATUS_LABELS } from "@/lib/attendanceUtils";

const STATUS_INFO: Record<
  StatusType,
  { icon: string; className: string; description: string }
> = {
  "בבסיס": {
    icon: "✓",
    className: "text-status-base bg-status-base-bg border border-status-base/20",
    description: 'נמצא בבסיס / V / "1"',
  },
  "בבית": {
    icon: "⌂",
    className: "text-status-home bg-status-home-bg border border-status-home/20",
    description: 'בבית / "" / "0"',
  },
  "מחלה / גימלים": {
    icon: "⚕",
    className: "text-status-sick bg-status-sick-bg border border-status-sick/20",
    description: '"2" / גימלים',
  },
  "אחר": {
    icon: "?",
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
          return (
            <div
              key={status}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${info.className}`}
            >
              <span className="text-base leading-none">{info.icon}</span>
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
