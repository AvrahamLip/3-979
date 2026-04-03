import { useState } from "react";
import { Outlet, NavLink, useLocation, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, FileText, Truck, Edit, Phone, Menu, X, CalendarDays, Shield, LogOut, LayoutDashboard, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";
import PWAInstallButton from "./PWAInstallButton";
import pkg from "../../package.json";
import { useAuth } from "@/contexts/AuthContext";

export default function Layout() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Always show nav now, but items are conditional
  const showNav = true;

  // Determine if we should point to the commander version of the guards page
  const isCommanderView = location.pathname.startsWith("/main") || 
                          location.pathname.startsWith("/zama") || 
                          location.pathname.startsWith("/workplan");
  
  const guardsTarget = isCommanderView ? "/guards?mode=commander" : "/guards";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 gradient-hero border-b border-primary/20 shadow-lg">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 group shrink-0" aria-label="Go to home">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent text-accent-foreground font-black text-base sm:text-lg shadow-md group-hover:shadow-accent/20">
                ד!
              </div>
              <span className="text-lg sm:text-xl font-black text-overlay tracking-wide hidden sm:block">
                דוח!
              </span>
            </Link>

            {/* Desktop Nav links */}
            {showNav && (
              <nav className="hidden md:flex items-center gap-1 py-2">
                <NavLink
                  to="/main"
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
                <NavLink
                  to="/zama"
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
                </NavLink>
                <NavLink
                  to="/workplan"
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
                  to={guardsTarget}
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
                  <span>שיבוץ שמירות</span>
                </NavLink>
                <NavLink
                  to="/contact"
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
                  to="/vacation"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                      isActive
                        ? "bg-accent text-accent-foreground shadow-md"
                        : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                    )
                  }
                >
                  <Palmtree className="w-4 h-4 text-accent" />
                  <span>תוכנית חופשים</span>
                </NavLink>
                
                <a
                  href="https://avrahamlip.github.io/3-979/update.html"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-overlay/80 hover:text-overlay hover:bg-white/10 whitespace-nowrap"
                >
                  <Edit className="w-4 h-4" />
                  <span>עדכון נתונים</span>
                </a>
              </nav>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Commander Profile / Logout */}
              {isAuthenticated && (
                <div className="hidden sm:flex items-center gap-2 mr-2 border-r border-white/20 pr-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-tighter leading-none mb-0.5">מפקד מחובר</span>
                    <span className="text-[11px] font-medium text-white/90 leading-none truncate max-w-[80px]">{user?.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
                    title="התנתק"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Enter Commander Mode (Hidden trigger for Soldiers) */}
              {!isAuthenticated && (
                <a
                  href="https://avrahamlip.github.io/3-979/#/main"
                  className="p-2 rounded-lg text-white/40 hover:text-white transition-colors"
                  title="גישת מפקדים"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </a>
              )}

              {/* PWA Install Button */}
              <PWAInstallButton variant="header" />

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-overlay/80 hover:text-overlay hover:bg-white/10 transition-all duration-200"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:rotate-12" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-rotate-12" />
                )}
              </button>

              {/* Mobile hamburger menu */}
              {showNav && (
                <button
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg text-overlay/80 hover:text-overlay hover:bg-white/10 transition-all duration-200"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>

          {/* Mobile dropdown nav */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-3 pt-1 border-t border-white/10 space-y-1 animate-fade-in px-2">
              <NavLink
                to="/main"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <FileText className="w-5 h-5" />
                <span>דוח נוכחות</span>
              </NavLink>
              <NavLink
                to="/zama"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <Truck className="w-5 h-5" />
                <span>צמ&quot;ה</span>
              </NavLink>
              <NavLink
                to="/workplan"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <CalendarDays className="w-5 h-5" />
                <span>תוכנית עבודה</span>
              </NavLink>

              <NavLink
                to={guardsTarget}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <Shield className="w-5 h-5" />
                <span>שיבוץ שמירות</span>
              </NavLink>
              <NavLink
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <Phone className="w-5 h-5" />
                <span>טלפונים</span>
              </NavLink>
              <NavLink
                to="/vacation"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-overlay/80 hover:text-overlay hover:bg-white/10"
                  )
                }
              >
                <Palmtree className="w-5 h-5 text-accent" />
                <span>תוכנית חופשים</span>
              </NavLink>
              
                <>
                  <a
                    href="https://avrahamlip.github.io/3-979/update.html"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-overlay/80 hover:text-overlay hover:bg-white/10"
                  >
                    <Edit className="w-5 h-5" />
                    <span>עדכון נתונים</span>
                  </a>
                  {isAuthenticated && (
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-red-200 hover:bg-red-500/20 w-full text-right"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>התנתקות מפקד</span>
                    </button>
                  )}
                </>
            </nav>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3 sm:py-4 px-3 sm:px-4 text-center text-xs text-muted-foreground bg-muted/30">
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
            <a href="mailto:lip.avi@gmail.com" className="hover:text-primary transition-colors font-bold underline decoration-dotted underline-offset-4">צור קשר</a>
            <span className="opacity-30">|</span>
            <a href="tel:050-88533548" className="hover:text-primary transition-colors font-bold">050-88533548</a>
            <span className="opacity-30">|</span>
            <span className="font-mono">גרסה {pkg.version}</span>
          </div>
          <span className="opacity-70 font-medium">דוח! — מערכת נוכחות יומי</span>
        </div>
      </footer>
    </div>
  );
}
