import { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, Phone, Menu, X, Shield, Palmtree } from "lucide-react";
import { cn } from "@/lib/utils";
import PWAInstallButton from "../PWAInstallButton";
import pkg from "../../../package.json";
import { isCommanderDashboardAllowed } from "@/lib/deployment";

export default function SoldierLayout() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showCommanderLink = isCommanderDashboardAllowed();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 gradient-hero border-b border-primary/20 shadow-lg">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/guards" className="flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 group shrink-0" aria-label="לדף הבית">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent text-accent-foreground font-black text-base sm:text-lg shadow-md group-hover:shadow-accent/20">
                ד1
              </div>
              <span className="text-lg sm:text-xl font-black text-overlay tracking-wide hidden sm:block">
                דוח 1
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 py-2">
              <NavLink
                to="/guards"
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
                <Shield className="w-4 h-4" />
                <span>שיבוץ שמירות</span>
              </NavLink>
              <NavLink
                to="/guards/contact"
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

              {showCommanderLink && (
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
                  <Shield className="w-4 h-4 text-accent" />
                  <span>פורטל מפקדים</span>
                </NavLink>
              )}
              {/*
              <NavLink
                to="/guards/vacation"
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
              */}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
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
              <NavLink
                to="/guards"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                    isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                  )
                }
              >
                <Shield className="w-5 h-5" />
                <span>שיבוץ שמירות</span>
              </NavLink>
              <NavLink
                to="/guards/contact"
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

              {showCommanderLink && (
                <NavLink
                  to="/main"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                      isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                    )
                  }
                >
                  <Shield className="w-5 h-5 text-accent" />
                  <span>פורטל מפקדים</span>
                </NavLink>
              )}
              {/*
              <NavLink
                to="/guards/vacation"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold",
                    isActive ? "bg-accent text-accent-foreground" : "text-overlay/70"
                  )
                }
              >
                <Palmtree className="w-5 h-5 text-accent" />
                <span>תוכנית חופשים</span>
              </NavLink>
              */}
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-4 px-4 text-center text-xs text-muted-foreground bg-muted/30 mt-auto">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
            <a href="mailto:lip.avi@gmail.com" className="hover:text-primary transition-colors font-bold underline decoration-dotted underline-offset-4">lip.avi@gmail.com</a>
            <span className="opacity-30">|</span>
            <a href="https://getbetter.games" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-bold text-primary/80">
              © Developed by getbetter.games
            </a>
            <span className="opacity-30">|</span>
            <span className="font-mono">גרסה {pkg.version}</span>
          </div>
          <span className="opacity-70 font-medium">מערכת ניהול דוח 1</span>
        </div>
      </footer>
    </div>
  );
}
