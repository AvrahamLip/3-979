import { Loader2, ClipboardList, X } from "lucide-react";

export function LoadingOverlay({ message = "טוען נתונים..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] py-12 gap-4">
      <div className="relative">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-muted-foreground font-medium text-sm sm:text-base">{message}</p>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
        <X className="w-7 h-7 text-destructive" />
      </div>
      <p className="font-bold text-destructive">שגיאה בטעינת הנתונים</p>
      <p className="text-sm text-muted-foreground text-center max-w-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ date }: { date: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <ClipboardList className="w-12 h-12 text-muted-foreground/50" />
      <p className="font-bold text-foreground text-lg">לא נמצאו נתונים</p>
      <p className="text-sm text-muted-foreground">לא נמצאו נתוני נוכחות לתאריך {date}</p>
    </div>
  );
}
