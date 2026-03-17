import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, FileText, Truck, Phone } from "lucide-react";
import { cn } from "../lib/utils";

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
              <span className="text-xl font-black text-primary-foreground tracking-wide">
                דוח-1
              </span>
            </div>

            {/* Nav links */}
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 -my-2 flex-nowrap shrink-0 max-w-[calc(100vw-140px)] sm:max-w-none">
              <NavLink
                to="/main"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                       ? "bg-accent text-accent-foreground shadow-md"
                      : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                  )
                }
              >
                <FileText className="w-4 h-4 hidden xs:block" />
                <span>דוח נוכחות</span>
              </NavLink>
              <NavLink
                to="/zama"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                       ? "bg-accent text-accent-foreground shadow-md"
                      : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                  )
                }
              >
                <Truck className="w-4 h-4 hidden xs:block" />
                <span>צמ&quot;ה</span>
              </NavLink>
              <NavLink
                to="/contacts"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive
                       ? "bg-accent text-accent-foreground shadow-md"
                      : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
                  )
                }
              >
                <Phone className="w-4 h-4 hidden xs:block" />
                <span>טלפונים</span>
              </NavLink>
              <a
                href="update.html"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
              >
                <span>עדכן נתונים</span>
              </a>
            </nav>

            {/* Theme toggle & Mobile menu placeholder */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 transition-all duration-200"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-4 bg-muted/20">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-semibold text-foreground/80">דוח-1 — מערכת נוכחות יומי</span>
            <span>כל הזכויות שמורות &copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-col items-center md:items-center gap-1">
            <span>ליצירת קשר: <a href="mailto:lip.avi@gmail.com" className="hover:text-primary transition-all duration-200 underline decoration-primary/30 underline-offset-4">lip.avi@gmail.com</a></span>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1">
            <span>גרסה: 1.2.0</span>
            <span>עדכון אחרון: {new Date().toLocaleDateString('he-IL')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
