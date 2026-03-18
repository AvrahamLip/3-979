import { useState, useEffect } from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";
import { cn } from "../lib/utils";

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setIsVisible(false);
    });

    // On iOS or if we want it to be persistent, we can show it after a short delay
    const timer = setTimeout(() => {
      if (!isInstalled) {
        setIsVisible(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsVisible(false);
      }
    } else {
      // Manual instructions for other browsers
      alert("כדי להתקין את האפליקציה: לחץ על שלוש הנקודות בדפדפן ובחר 'התקן אפליקציה' או 'הוסף למסך הבית'");
    }
  };

  if (isInstalled || !isVisible) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm sm:text-base",
          "bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300",
          "hover:scale-[1.02] active:scale-95 elevated-shadow animate-fade-in-up"
        )}
      >
        <Download className="w-5 h-5 animate-bounce" />
        <span>התקן את האפליקציה לגישה מהירה</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 relative border border-border animate-fade-in-up">
            <button 
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-primary">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black">התקנה ב-iPhone</h3>
              <p className="text-muted-foreground text-sm">בצע את השלבים הבאים כדי להוסיף את האפליקציה למסך הבית:</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-2xl">
                <div className="bg-white dark:bg-zinc-800 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm text-blue-500">
                  <Share className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold">1. לחץ על כפתור ה-'שתף' (Share) בדפדפן ספארי</p>
              </div>

              <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-2xl">
                <div className="bg-white dark:bg-zinc-800 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold">2. גלול למטה ובחר ב-'הוסף למסך הבית'</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black hover:opacity-90 transition-all"
            >
              הבנתי, תודה!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
