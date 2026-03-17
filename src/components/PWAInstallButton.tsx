import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      setIsInstalled(true);
      setIsVisible(false);
      console.log("PWA was installed");
    });

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
       setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (isInstalled) {
     return null; // Don't show anything if already installed
  }

  if (!isVisible) return null;

  return (
    <button
      onClick={handleInstallClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm sm:text-base",
        "bg-white/10 hover:bg-white/20 text-primary-foreground border border-white/20 transition-all duration-300",
        "hover:scale-[1.02] active:scale-95 elevated-shadow backdrop-blur-md animate-fade-in-up"
      )}
    >
      <Download className="w-5 h-5 animate-bounce" />
      <span>התקן אפליקציה לגישה מהירה</span>
    </button>
  );
}
