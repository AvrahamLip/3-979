import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

// The validation API for commanders
const VALIDATE_API = "https://151.145.89.228.sslip.io/webhook/validate";
const CLIENT_ID = "435530372836-c3u3vtge3v4hvrskon21ovfb1rvtkf7p.apps.googleusercontent.com";

export type UserRole = "commander" | "soldier" | "none";

interface UserInfo {
  name: string;
  email: string;
  role: UserRole;
  authorizedRolls: string[];
}

export function useRoleAuth(buttonId?: string, defaultRoll: string = "guard") {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("is_commander") === "true";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem("user_info");
    return saved ? JSON.parse(saved) : null;
  });

  const checkRollAuthorization = useCallback(async (roll: string, credential?: string): Promise<boolean> => {
    const currentEmail = user?.email;
    const currentCredential = credential || "";
    
    if (!currentEmail && !currentCredential) return false;
    
    // Check if already authorized for this roll locally
    if (user?.authorizedRolls?.includes(roll)) {
      return true;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(VALIDATE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentEmail || "", 
          roll: roll,
          credential: currentCredential,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.email || data.authorized === true) {
          const updatedRolls = Array.from(new Set([...(user?.authorizedRolls || []), roll]));
          
          setIsAuthenticated(true);
          const info: UserInfo = { 
            name: user?.name || data.name || "מפקד", 
            email: currentEmail || data.email, 
            role: "commander",
            authorizedRolls: updatedRolls
          };
          setUser(info);
          localStorage.setItem("is_commander", "true");
          localStorage.setItem("user_info", JSON.stringify(info));
          return true;
        } else {
          setError(data.error || `אין לך הרשאה מתאימה (${roll})`);
          return false;
        }
      } else {
        setError(`שגיאת שרת באימות (קוד: ${res.status})`);
        return false;
      }
    } catch (err: any) {
      setError(`שגיאת תקשורת: ${err.message || 'לא ידוע'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleCredentialResponse = useCallback(async (response: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const base64Url = response.credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(base64));

      const res = await fetch(VALIDATE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          roll: defaultRoll,
          credential: response.credential,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.email || data.authorized === true) {
          setIsAuthenticated(true);
          const info: UserInfo = { 
            name: payload.name, 
            email: payload.email, 
            role: "commander",
            authorizedRolls: [defaultRoll]
          };
          setUser(info);
          localStorage.setItem("is_commander", "true");
          localStorage.setItem("user_info", JSON.stringify(info));
          toast.success(`ברוכים הבאים, ${payload.name}`);
        } else {
          setError(data.error || "אין לך הרשאת מפקד");
          toast.error(data.error || "אין לך הרשאת מפקד");
        }
      } else {
        setError(`שגיאת שרת באימות (קוד: ${res.status})`);
        toast.error(`שגיאת שרת באימות (קוד: ${res.status})`);
      }
    } catch (err: any) {
      setError(`שגיאת תקשורת: ${err.message || 'לא ידוע'}`);
      toast.error(`שגיאת תקשורת: ${err.message || 'לא ידוע'}`);
    } finally {
      setIsLoading(false);
    }
  }, [defaultRoll]);

  useEffect(() => {
    if (!buttonId || (isAuthenticated && user?.authorizedRolls?.includes(defaultRoll))) return;

    const interval = setInterval(() => {
      const g = (window as any).google;
      const btn = document.getElementById(buttonId);

      if (g && btn) {
        clearInterval(interval);
        g.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredentialResponse,
        });
        g.accounts.id.renderButton(
          btn,
          { theme: "outline", size: "large", text: "signin_with", width: 250 }
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [buttonId, handleCredentialResponse, isAuthenticated, user, defaultRoll]);

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem("is_commander");
    localStorage.removeItem("user_info");
    toast.info("התנתקת בהצלחה");
  };

  return {
    isAuthenticated,
    isLoading,
    error,
    user,
    logout,
    checkRollAuthorization,
    resetError: () => setError(null),
  };
}
