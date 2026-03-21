import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { he } from "date-fns/locale";

interface DatePickerBarProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
}

export default function DatePickerBar({ value, onChange, label }: DatePickerBarProps) {
  const [open, setOpen] = useState(false);

  const date = parseISO(value);
  const display = format(date, "EEEE, d בMMMM yyyy", { locale: he });

  const prev = () => onChange(format(subDays(date, 1), "yyyy-MM-dd"));
  const next = () => onChange(format(addDays(date, 1), "yyyy-MM-dd"));

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {label && (
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 card-shadow">
        <button
          onClick={next}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4 rtl-flip" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs sm:text-sm font-semibold text-center">
              {display}
            </span>
          </button>
          {open && (
            <div className="absolute top-full mt-1 right-0 z-50 bg-card border border-border rounded-xl shadow-xl p-2">
              <input
                type="date"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setOpen(false);
                }}
                className="block p-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>

        <button
          onClick={prev}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 rtl-flip" />
        </button>
      </div>
    </div>
  );
}
