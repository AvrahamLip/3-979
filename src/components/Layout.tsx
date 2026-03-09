import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, FileText, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 gradient-hero border-b border-primary/20 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-accent-foreground font-black text-lg shadow">
                ד-1
              </div>
              <span className="text-xl font-black text-primary-foreground tracking-wide hidden sm:block">
                דוח-1
              </span>
            </div>

            {/* Nav links */}
            <nav className="flex items-center gap-1">
              <NavLink
                to="/main"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
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
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                  )
                }
              >
                <Truck className="w-4 h-4" />
                <span>צמ&quot;ה</span>
              </NavLink>
            </nav>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 transition-all duration-200"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3 px-4 text-center text-xs text-muted-foreground">
        <span>דוח-1 — מערכת נוכחות יומי</span>
      </footer>
    </div>
  );
}
