import { Outlet, NavLink, useLocation, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Sun, Moon, FileText, Truck, Edit, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import PWAInstallButton from "./PWAInstallButton";

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
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 group" aria-label="Go to home">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-accent-foreground font-black text-lg shadow-md group-hover:shadow-accent/20">
                ד!
              </div>
              <span className="text-xl font-black text-overlay tracking-wide hidden sm:block">
                דוח!
              </span>
            </Link>

            {/* Nav links */}
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
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
                <span className="hidden sm:inline">דוח נוכחות</span>
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
                <span className="hidden sm:inline">צמ&quot;ה</span>
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
                <span className="hidden sm:inline">טלפונים</span>
              </NavLink>
              <a
                href="/3-979/update.html"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-overlay/80 hover:text-overlay hover:bg-white/10 whitespace-nowrap"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">עדכון נתונים</span>
              </a>
            </nav>

            <div className="flex items-center gap-2">
              {/* PWA Install Button */}
              <PWAInstallButton variant="header" />

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-overlay/80 hover:text-overlay hover:bg-white/10 transition-all duration-200"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 transition-transform group-hover:rotate-12" />
                ) : (
                  <Moon className="w-5 h-5 transition-transform group-hover:-rotate-12" />
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
      <footer className="border-t border-border py-4 px-4 text-center text-xs text-muted-foreground bg-muted/30">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <a href="mailto:lip.avi@gmail.com" className="hover:text-primary transition-colors font-bold underline decoration-dotted underline-offset-4">צור קשר</a>
            <span className="opacity-30">|</span>
            <a href="tel:050-88533548" className="hover:text-primary transition-colors font-bold">050-0000000</a>
            <span className="opacity-30">|</span>
            <span className="font-mono">גרסה 1.2.2</span>
          </div>
          <span className="opacity-70 font-medium">דוח! — מערכת נוכחות יומי</span>
        </div>
      </footer>
    </div>
  );
}
