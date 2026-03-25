import { ReactNode } from "react";
import { useRoleAuth } from "../hooks/useRoleAuth";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, error, resetError } = useRoleAuth("phone", "google-signin-btn");

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
              onClick={resetError}
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
