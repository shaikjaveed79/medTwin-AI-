import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import TimelinePage from "./pages/TimelinePage.tsx";
import ReportsPage from "./pages/ReportsPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import EmergencyPage from "./pages/EmergencyPage.tsx";
import MedicationsPage from "./pages/MedicationsPage.tsx";
import SimulatorPage from "./pages/SimulatorPage.tsx";
import VisualAnalysisPage from "./pages/VisualAnalysisPage.tsx";
import FollowUpsPage from "./pages/FollowUpsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/emergency" element={<EmergencyPage />} />
            <Route path="/medications" element={<MedicationsPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/visual-analysis" element={<VisualAnalysisPage />} />
            <Route path="/follow-ups" element={<FollowUpsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
