import { Loader2 } from "lucide-react";

export function LoadingOverlay({ message = "טוען נתונים..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 text-destructive text-2xl">
        ✕
      </div>
      <p className="font-bold text-destructive">שגיאה בטעינת הנתונים</p>
      <p className="text-sm text-muted-foreground text-center max-w-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ date }: { date: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="text-5xl">📋</div>
      <p className="font-bold text-foreground text-lg">לא נמצאו נתונים</p>
      <p className="text-sm text-muted-foreground">לא נמצאו נתוני נוכחות לתאריך {date}</p>
    </div>
  );
}
