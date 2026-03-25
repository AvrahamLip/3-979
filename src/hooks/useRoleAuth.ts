import { useState, useEffect } from "react";

const VALIDATE_API = "https://151.145.89.228.sslip.io/webhook/validate";
const CLIENT_ID = "435530372836-c3u3vtge3v4hvrskon21ovfb1rvtkf7p.apps.googleusercontent.com";

export function parseJwt(token: string) {
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

export function useRoleAuth(role: string, buttonContainerId: string = "google-signin-btn") {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cachedAuthKey = `auth_${role}`;
    
    // 1. Check for cached session
    const cached = localStorage.getItem(cachedAuthKey);
    if (cached) {
      try {
        const { credential } = JSON.parse(cached);
        const payload = parseJwt(credential);
        const now = Date.now();
        
        // Google JWTs expire after 1 hour. If it's still physically valid, we trust our previous validation.
        // We could also enforce a custom max session length using validatedAt if we wanted to.
        if (payload && payload.exp * 1000 > now) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return; // Skip rendering google signin button entirely
        } else {
          localStorage.removeItem(cachedAuthKey); // Expired
        }
      } catch (e) {
        localStorage.removeItem(cachedAuthKey);
      }
    }

    // 2. Setup Google Sign In
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
        console.log("Validating user:", payload.email, "for role:", role);
        const res = await fetch(VALIDATE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: payload.email,
            role,
            credential: response.credential,
          }),
        });

        if (res.status === 200) {
          const data = await res.json();
          if (data.authorized === false) {
            setError(data.error || `אין לך הרשאה למחלקה זו (תפקיד חסר או שגוי)`);
          } else {
            // Caching successful validation
            localStorage.setItem(cachedAuthKey, JSON.stringify({
              credential: response.credential,
              validatedAt: Date.now()
            }));
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

        const btnElement = document.getElementById(buttonContainerId);
        if (btnElement) {
          // @ts-ignore
          window.google.accounts.id.renderButton(btnElement, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            width: btnElement.getAttribute('data-width') ? parseInt(btnElement.getAttribute('data-width')!) : 280,
          });
        }
        setIsLoading(false);
      } else {
        setTimeout(initializeGoogleSignIn, 100);
      }
    };

    // If script isn't loaded, we could dynamically load it, but assuming it's in index.html like before
    initializeGoogleSignIn();
  }, [role, buttonContainerId]);

  const resetError = () => {
    setError(null);
    setIsLoading(false);
  };

  return { isAuthenticated, isLoading, error, resetError };
}
