import { useState } from "react";
import { ChevronDown, ChevronUp, Building2 } from "lucide-react";
import type { DepartmentStats } from "@/types/attendance";
import { StatusCountsRow } from "./StatusCountsRow";
import { motion, AnimatePresence } from "framer-motion";

interface DepartmentAccordionProps {
  departments: DepartmentStats[];
}

function DeptCard({ dept, index }: { dept: DepartmentStats; index: number }) {
  const [open, setOpen] = useState(false);
  const pct = dept.counts.total > 0
    ? Math.round((dept.counts["בבסיס"] / dept.counts.total) * 100)
    : 0;

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden card-shadow animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
        <div className="flex-1 text-right mr-3">
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <StatusCountsRow counts={dept.counts} compact />
            <span className="text-xs font-bold text-muted-foreground">
              {dept.counts["בבסיס"]}/{dept.counts.total}
            </span>
          </div>
          <div className="flex items-center gap-1.5 justify-end mt-0.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-bold text-sm">{dept.department}</span>
          </div>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-muted mx-4 mb-0 rounded-full overflow-hidden">
        <div
          className="h-full bg-status-base rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-border mt-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                פירוט לפי תפקיד
              </p>
              <div className="space-y-1.5">
                {dept.roles.map((role) => (
                  <div
                    key={role.role}
                    className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2"
                  >
                    <StatusCountsRow counts={role.counts} compact />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {role.counts["בבסיס"]}/{role.counts.total}
                      </span>
                      <span className="text-sm font-semibold">{role.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DepartmentAccordion({ departments }: DepartmentAccordionProps) {
  return (
    <div className="space-y-2">
      {departments.map((dept, idx) => (
        <DeptCard key={dept.department} dept={dept} index={idx} />
      ))}
    </div>
  );
}
