import { useState, useEffect, ReactNode } from "react";
import { LoadingOverlay, ErrorMessage } from "./StatusMessages";
import { cn } from "../lib/utils";

const VALIDATE_API = "https://151.145.89.228.sslip.io/webhook/validate";
const CLIENT_ID = "435530372836-c3u3vtge3v4hvrskon21ovfb1rvtkf7p.apps.googleusercontent.com";

interface AuthGuardProps {
  children: ReactNode;
}

// Helper to decode JWT (Google ID Token) without special library
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // @ts-ignore
    window.handleCredentialResponse = async (response: any) => {
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch(VALIDATE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: parseJwt(response.credential)?.email,
            role: "phone",
            credential: response.credential,
          }),
        });

        if (res.status === 200) {
          const data = await res.json();
          // If the backend returns authorized: false explicitly, reject.
          // Otherwise, if status is 200, we consider it authorized (matches update.html behavior)
          if (data.authorized === false) {
            setError(data.error || "אין לך הרשאה לגשת לדף זה");
          } else {
            setIsAuthenticated(true);
          }
        } else if (res.status === 401 || res.status === 403) {
          setError("אין לך הרשאה לגשת לדף זה");
        } else {
          setError("שגיאת שרת בבדיקת ההרשאות");
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError("שגיאה בתהליך ההתחברות");
      } finally {
        setIsLoading(false);
      }
    };

    const initializeGoogleSignIn = () => {
      // @ts-ignore
      if (window.google) {
        // @ts-ignore
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          // @ts-ignore
          callback: window.handleCredentialResponse,
        });

        // @ts-ignore
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", text: "signin_with", width: 280 }
        );
        setIsLoading(false);
      } else {
        // If not loaded yet, check again in 100ms
        setTimeout(initializeGoogleSignIn, 100);
      }
    };

    initializeGoogleSignIn();
  }, []);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 elevated-shadow text-center space-y-6">
        <div>
          <h2 className="text-2xl font-black text-primary mb-2">כניסה למערכת</h2>
          <p className="text-muted-foreground text-sm">התחבר עם חשבון Google כדי לצפות באנשי קשר</p>
        </div>

        <div className="flex justify-center py-4">
          <div id="google-signin-btn"></div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-primary font-semibold">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>בודק הרשאות...</span>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm font-bold p-3 rounded-xl border border-destructive/20 animate-fade-in-up">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
