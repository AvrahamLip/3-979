import { useState, useMemo } from "react";
import { useMainAttendance } from "../hooks/useAttendanceData";
import { getTodayIso } from "../lib/attendanceUtils";
import { LoadingOverlay, ErrorMessage, EmptyState } from "../components/StatusMessages";
import { Search, Phone, MessageSquare, User, Filter } from "lucide-react";
import { cn } from "../lib/utils";
import AuthGuard from "../components/AuthGuard";

export default function ContactPage() {
  const [search, setSearch] = useState("");
  const date = useMemo(() => getTodayIso(), []);
  const { data, isLoading, isError, error, refetch } = useMainAttendance(date);

  const contacts = useMemo(() => {
    if (!data) return [];
    const query = search.toLowerCase().trim();
    if (!query) return data;

    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.personalNumber.toString().includes(query) ||
        r.role.toLowerCase().includes(query) ||
        r.department.toLowerCase().includes(query)
    );
  }, [data, search]);

  const formatPhone = (num: string | number) => {
    let s = String(num).replace(/\D/g, "");
    if (s.length === 9 && !s.startsWith("0")) {
      s = "0" + s;
    }
    return s;
  };

  const getWhatsAppLink = (num: string | number) => {
    let s = String(num).replace(/\D/g, "");
    if (s.startsWith("0")) {
      s = s.substring(1);
    }
    return `https://wa.me/972${s}`;
  };

  return (
    <AuthGuard>
      <div className="container mx-auto py-6 space-y-6 animate-fade-in">
        {/* Header Section */}
        <div className="gradient-hero rounded-3xl p-6 sm:p-8 elevated-shadow text-primary-foreground relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black mb-2">אנשי קשר</h1>
            <p className="text-primary-foreground/80 text-sm sm:text-base font-medium">
              חיפוש מהיר של טלפונים וקישורי וואטסאפ
            </p>
          </div>
          {/* Decorative background element */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        </div>

        {/* Search & Filters */}
        <div className="bg-card/50 backdrop-blur-md border border-border rounded-2xl p-4 card-shadow sticky top-20 z-40 transition-all duration-300">
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="חפש לפי שם, מספר אישי או תפקיד..."
              className="w-full h-12 pr-12 pl-4 rounded-xl bg-background/50 border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all duration-200 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Status Messages */}
        {isLoading && <LoadingOverlay />}
        {isError && <ErrorMessage message={(error as Error)?.message ?? "שגיאה בטעינת נתונים"} />}
        {!isLoading && !isError && contacts.length === 0 && (
          <div className="py-20 text-center space-y-4 animate-fade-in-up">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-lg font-bold text-muted-foreground">לא נמצאו תוצאות לחיפוש שלך</p>
            <button
               onClick={() => setSearch("")}
               className="text-primary font-bold hover:underline"
            >
               נקה חיפוש
            </button>
          </div>
        )}

        {/* Contacts Grid */}
        {!isLoading && !isError && contacts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {contacts.map((contact, idx) => (
              <div
                key={`${contact.name}-${idx}`}
                className="group bg-card hover:bg-card/80 border border-border hover:border-primary/30 rounded-2xl p-5 card-shadow transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
                        {contact.name}
                      </h3>
                      <p className="text-xs font-bold text-muted-foreground">
                        {contact.role} | {contact.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 bg-muted px-2 py-1 rounded-md">
                    #{contact.personalNumber}
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${formatPhone(contact.personalNumber)}`}
                    className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm hover:bg-secondary/80 transition-all active:scale-95"
                  >
                    <Phone className="w-4 h-4" />
                    <span>שיחה</span>
                  </a>
                  <a
                    href={getWhatsAppLink(contact.personalNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-status-base text-white font-bold text-sm hover:opacity-90 transition-all active:scale-95 shadow-sm shadow-status-base/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
