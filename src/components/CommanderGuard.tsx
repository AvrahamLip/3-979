import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingOverlay } from "@/components/StatusMessages";
import { ShieldAlert, LogIn } from "lucide-react";

export function CommanderGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-8 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-3xl font-black text-foreground tracking-tight">גישת מפקדים בלבד</h2>
          <p className="text-muted-foreground leading-relaxed">
            דף זה מכיל מידע יחידתי רגיש. כדי להמשיך, עליך להזדהות באמצעות חשבון Google המורשה שלך.
          </p>
        </div>

        <div className="bg-card border border-border p-8 rounded-2xl shadow-xl w-full max-w-sm flex flex-col items-center space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
            <LogIn className="w-4 h-4" />
            התחברות מאובטחת
          </div>
          
          <div id="google-signin-btn-commander" className="w-full flex justify-center py-2"></div>
          
          <p className="text-[10px] text-muted-foreground/60 text-center">
            הגישה מנוטרת ומותרת למפקדים מורשים בלבד. <br/>
            במקרה של בעיה, פנה למנהל המערכת.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
