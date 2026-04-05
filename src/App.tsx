import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import SoldierLayout from "./components/layouts/SoldierLayout";
import CommanderLayout from "./components/layouts/CommanderLayout";
import MainPage from "./pages/MainPage";
import ZamaPage from "./pages/ZamaPage";
import WorkPlanPage from "./pages/WorkPlanPage";
import GuardAssignmentPage from "./pages/GuardAssignmentPage";
import ContactPage from "./pages/ContactPage";
import VacationPage from "./pages/VacationPage";
import DataUpdatePage from "./pages/DataUpdatePage";
import BusAssignmentPage from "./pages/BusAssignmentPage";

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
            <Route path="/" element={<Navigate to="/guards" replace />} />
            
            {/* Soldier System */}
            <Route path="/guards" element={<SoldierLayout />}>
              <Route index element={<GuardAssignmentPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="vacation" element={<VacationPage />} />
            </Route>
            
            {/* Commander System */}
            <Route path="/main" element={<CommanderLayout />}>
              <Route index element={<MainPage />} />
              <Route path="zama" element={<ZamaPage />} />
              <Route path="workplan" element={<WorkPlanPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route 
                path="update" 
                element={
                  <CommanderGuard requiredRoll="update">
                    <DataUpdatePage />
                  </CommanderGuard>
                } 
              />
              <Route 
                path="guards/manage" 
                element={
                  <CommanderGuard requiredRoll="guard">
                    <GuardAssignmentPage mode="commander" />
                  </CommanderGuard>
                } 
              />
              <Route path="bus" element={<BusAssignmentPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);



export default App;

