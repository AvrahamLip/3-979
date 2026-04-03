import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import MainPage from "./pages/MainPage";
import ZamaPage from "./pages/ZamaPage";
import WorkPlanPage from "./pages/WorkPlanPage";
import GuardAssignmentPage from "./pages/GuardAssignmentPage";
import ContactPage from "./pages/ContactPage";

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
        <BrowserRouter basename="/3-979/">
          <Routes>
            <Route element={<Layout />}>
              {/* Soldier routes / Main defaults */}
              <Route path="/" element={<Navigate to="/guards" replace />} />
              <Route path="/guards" element={<GuardAssignmentPage />} />
              <Route path="/contact" element={<ContactPage />} />
              
              {/* Commander-only routes */}
              <Route path="/main" element={<CommanderGuard><MainPage /></CommanderGuard>} />
              <Route path="/zama" element={<CommanderGuard><ZamaPage /></CommanderGuard>} />
              <Route path="/workplan" element={<CommanderGuard><WorkPlanPage /></CommanderGuard>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);



export default App;

