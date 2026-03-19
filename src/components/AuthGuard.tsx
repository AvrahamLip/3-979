import { useState, useEffect, ReactNode } from "react";
import { LoadingOverlay } from "./StatusMessages";
import { cn } from "../lib/utils";

const VALIDATE_API = "https://151.145.89.228.sslip.io/webhook/validate";
const CLIENT_ID = "435530372836-c3u3vtge3v4hvrskon21ovfb1rvtkf7p.apps.googleusercontent.com";

interface AuthGuardProps {
  children: ReactNode;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT Parse error:", e);
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

      const payload = parseJwt(response.credential);
      if (!payload || !payload.email) {
        setError("שגיאה בפענוח פרטי המשתמש מ-Google");
        setIsLoading(false);
        return;
      }

      try {
        console.log("Validating user:", payload.email, "for role: phone");
        const res = await fetch(VALIDATE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: payload.email,
            role: "phone",
            credential: response.credential,
          }),
        });

        if (res.status === 200) {
          const data = await res.json();
          if (data.authorized === false) {
            setError(data.error || `אין לך הרשאה למחלקה זו (תפקיד חסר או שגוי)`);
          } else {
            setIsAuthenticated(true);
          }
        } else {
          setError(`שגיאת שרת בבדיקת הרשאות (קוד: ${res.status})`);
        }
      } catch (err) {
        console.error("Auth fetch error:", err);
        setError("לא ניתן ליצור קשר עם שרת ההרשאות. בדוק את החיבור לאינטרנט.");
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

        const btnElement = document.getElementById("google-signin-btn");
        if (btnElement) {
          // @ts-ignore
          window.google.accounts.id.renderButton(btnElement, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            width: 280,
          });
        }
        setIsLoading(false);
      } else {
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

        <div className="flex justify-center py-4 min-h-[50px]">
          <div id="google-signin-btn"></div>
          {isLoading && !error && (
            <div className="flex items-center gap-2 text-primary animate-pulse">
               <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
               <span className="text-sm font-bold">בודק...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="space-y-4">
            <div className="bg-destructive/10 text-destructive text-sm font-medium p-4 rounded-xl border border-destructive/20 animate-fade-in-up">
              {error}
            </div>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(false);
              }}
              className="px-6 py-2 bg-primary text-white rounded-full text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              נסה שוב
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
