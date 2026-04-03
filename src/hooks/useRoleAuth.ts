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
}

export function useRoleAuth(buttonId?: string) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("is_commander") === "true";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem("user_info");
    return saved ? JSON.parse(saved) : null;
  });

  const handleCredentialResponse = useCallback(async (response: any) => {
    setIsLoading(true);
    setError(null);

    try {
      // Decode JWT locally for name/email
      const base64Url = response.credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(window.atob(base64));

      // Validate with n8n
      const res = await fetch(VALIDATE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          role: "commander",
          credential: response.credential,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authorized) {
          setIsAuthenticated(true);
          const info: UserInfo = { name: payload.name, email: payload.email, role: "commander" };
          setUser(info);
          localStorage.setItem("is_commander", "true");
          localStorage.setItem("user_info", JSON.stringify(info));
          toast.success(`ברוכים הבאים, ${payload.name}`);
        } else {
          setError(data.error || "אין לך הרשאת מפקד");
          toast.error(data.error || "אין לך הרשאת מפקד");
        }
      } else {
        setError("שגיאת שרת באימות");
      }
    } catch (err) {
      setError("שגיאת תקשורת");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!buttonId || isAuthenticated) return;

    const interval = setInterval(() => {
      if ((window as any).google) {
        clearInterval(interval);
        (window as any).google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById(buttonId),
          { theme: "outline", size: "large", text: "signin_with", width: 250 }
        );
      }
    }, 100);

    return () => clearInterval(interval);
  }, [buttonId, handleCredentialResponse, isAuthenticated]);

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
    resetError: () => setError(null),
  };
}
