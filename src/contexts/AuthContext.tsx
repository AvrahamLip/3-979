import React, { createContext, useContext, ReactNode } from "react";
import { useRoleAuth, UserRole } from "@/hooks/useRoleAuth";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  logout: () => void;
  checkPermission: (roll: string) => Promise<boolean>;
  role: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useRoleAuth("google-signin-btn-commander", "guard");

  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || 
                 hostname === "127.0.0.1" || 
                 hostname.startsWith("192.168.") || 
                 hostname.startsWith("10.") || 
                 hostname.startsWith("172.");
  
  const mockUser = {
    name: "מפתח מקומי",
    email: "local@dev.test",
    authorizedRolls: ["guard"]
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: isLocal || auth.isAuthenticated,
        isLoading: isLocal ? false : auth.isLoading,
        user: isLocal ? mockUser : auth.user,
        logout: auth.logout,
        checkPermission: isLocal ? async () => true : auth.checkRollAuthorization,
        role: (isLocal || auth.isAuthenticated) ? "commander" : "soldier",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
