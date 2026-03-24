import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import MainPage from "./pages/MainPage";
import ZamaPage from "./pages/ZamaPage";
import WorkPlanPage from "./pages/WorkPlanPage";

import ContactPage from "./pages/ContactPage";

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
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/3-979/">
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/main" replace />} />
            <Route path="/main" element={<MainPage />} />
            <Route path="/zama" element={<ZamaPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/workplan" element={<WorkPlanPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);



export default App;

