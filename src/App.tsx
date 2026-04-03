import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import MainPage from "./pages/MainPage";
import ZamaPage from "./pages/ZamaPage";
import WorkPlanPage from "./pages/WorkPlanPage";
import GuardAssignmentPage from "./pages/GuardAssignmentPage";
import ContactPage from "./pages/ContactPage";
import VacationPage from "./pages/VacationPage";

import { AuthProvider } from "./contexts/AuthContext";
import { CommanderGuard } from "./components/CommanderGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* Soldier routes / Main defaults */}
              <Route path="/" element={<Navigate to="/guards" replace />} />
              <Route path="/guards" element={<GuardAssignmentPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/vacation" element={<VacationPage />} />
              
              {/* Commander routes (Now public for viewing) */}
              <Route path="/main" element={<MainPage />} />
              <Route path="/zama" element={<ZamaPage />} />
              <Route path="/workplan" element={<WorkPlanPage />} />
              
              {/* Commander-only Management routes */}
              <Route 
                path="/guards/manage" 
                element={
                  <CommanderGuard requiredRoll="guard">
                    <GuardAssignmentPage mode="commander" />
                  </CommanderGuard>
                } 
              />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);



export default App;

