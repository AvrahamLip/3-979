import { useState } from "react";
import { Outlet, NavLink, Link, Navigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, FileText, Truck, Edit, Phone, Menu, X, CalendarDays, Shield, LogOut, Palmtree, Bus } from "lucide-react";
import { cn } from "@/lib/utils";
import PWAInstallButton from "../PWAInstallButton";
import pkg from "../../../package.json";
import { useAuth } from "@/contexts/AuthContext";
import { isCommanderDashboardAllowed } from "@/lib/deployment";

export default function CommanderLayout() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const allowed = isCommanderDashboardAllowed();

  if (!allowed) {
    console.warn("Commander dashboard access restricted on this domain. Redirecting...");
    return <Navigate to="/guards" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 gradient-hero border-b border-primary/20 shadow-lg">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/main" className="flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 group shrink-0" aria-label="לדף הבית">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent text-accent-foreground font-black text-base sm:text-lg shadow-md group-hover:shadow-accent/20">
                ד!
              </div>
              <span className="text-lg sm:text-xl font-black text-overlay tracking-wide hidden sm:block">
                המפקד!
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 py-2">
              <NavLink
                to="/main"
                end
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <FileText className="w-4 h-4" />
                <span>דוח נוכחות</span>
              </NavLink>
              {/* <NavLink
                to="/main/zama"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <Truck className="w-4 h-4" />
                <span>צמ&quot;ה</span>
              </NavLink> */}
              <NavLink
                to="/main/workplan"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <CalendarDays className="w-4 h-4" />
                <span>תוכנית עבודה</span>
              </NavLink>
              <NavLink
                to="/main/guards/manage"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <Shield className="w-4 h-4" />
                <span>ניהול שמירות</span>
              </NavLink>

              <NavLink
                to="/main/contact"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <Phone className="w-4 h-4" />
                <span>טלפונים</span>
              </NavLink>

              <NavLink
                to="/main/update"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <Edit className="w-4 h-4" />
                <span>עדכון נתונים</span>
              </NavLink>
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-2 mr-2 border-r border-white/20 pr-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-tighter leading-none mb-0.5">מפקד מחובר</span>
                    <span className="text-[11px] font-medium text-white/90 leading-none truncate max-w-[80px]">{user?.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
                    title="התנתק"
                    aria-label="התנתק"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center mr-2 border-r border-white/20 pr-2">
                  <div id="google-signin-btn-secondary" className="bg-white rounded-lg p-0.5 overflow-hidden h-8 flex items-center justify-center min-w-[120px]">
                  </div>
                </div>
              )}

              <PWAInstallButton variant="header" />

              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
                className="flex items-center justify-center w-11 h-11 rounded-lg text-overlay/80 hover:text-overlay hover:bg-white/10 transition-all duration-200"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? "סגור תפריט" : "פתח תפריט"}
                className="flex md:hidden items-center justify-center w-11 h-11 rounded-lg text-overlay/80 hover:text-overlay hover:bg-white/10 transition-all duration-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden pb-3 pt-1 border-t border-white/10 space-y-1 animate-fade-in px-2">
              <div className="px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">ניהול מפקדים</div>
              <NavLink
                to="/main"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                    isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                  )
                }
              >
                <FileText className="w-5 h-5" />
                <span>דוח נוכחות</span>
              </NavLink>
              {/* <NavLink
                to="/main/zama"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                    isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                  )
                }
              >
                <Truck className="w-5 h-5" />
                <span>צמ&quot;ה</span>
              </NavLink> */}
              <NavLink
                to="/main/workplan"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                    isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                  )
                }
              >
                <CalendarDays className="w-5 h-5" />
                <span>תוכנית עבודה</span>
              </NavLink>
              <NavLink
                to="/main/guards/manage"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                    isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                  )
                }
              >
                <Shield className="w-5 h-5 text-accent" />
                <span>ניהול שמירות</span>
              </NavLink>

              <NavLink
                to="/main/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                    isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                  )
                }
              >
                <Phone className="w-5 h-5" />
                <span>טלפונים</span>
              </NavLink>

              <div className="h-px bg-white/10 my-2 mx-4" />

              <NavLink
                to="/main/update"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                    isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                  )
                }
              >
                <Edit className="w-5 h-5" />
                <span>עדכון נתונים</span>
              </NavLink>
              {isAuthenticated && (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-200 w-full text-right"
                >
                  <LogOut className="w-5 h-5" />
                  <span>התנתקות מפקד</span>
                </button>
              )}
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-3 sm:py-4 px-3 sm:px-4 text-center text-xs text-muted-foreground bg-muted/30">
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
            <span className="font-mono">גרסה {pkg.version}</span>
          </div>
          <span className="opacity-70 font-medium">המערכת למפקד — דוח! נוכחות</span>
        </div>
      </footer>
    </div>
  );
}
