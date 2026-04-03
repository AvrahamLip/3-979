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

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: auth.isAuthenticated,
        isLoading: auth.isLoading,
        user: auth.user,
        logout: auth.logout,
        checkPermission: auth.checkRollAuthorization,
        role: auth.isAuthenticated ? "commander" : "soldier",
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
