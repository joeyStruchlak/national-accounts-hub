import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "./pages/Dashboard";
import BASReview from "./pages/BASReview";
import JobPipeline from "./pages/JobPipeline";
import Productivity from "./pages/Productivity";
import PayrollRec from "./pages/PayrollRec";
import SuperRec from "./pages/SuperRec";
import ClientRecords from "./pages/ClientRecords";
import AIAutomation from "./pages/AIAutomation";
import Login from "./pages/login";
import Terms from "./pages/terms";
import NotFound from "./pages/NotFound";
import { AuthGuard } from "./components/AuthGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/bas-review" element={<AuthGuard><BASReview /></AuthGuard>} />
          <Route path="/job-pipeline" element={<AuthGuard><JobPipeline /></AuthGuard>} />
          <Route path="/productivity" element={<AuthGuard><Productivity /></AuthGuard>} />
          <Route path="/payroll-rec" element={<AuthGuard><PayrollRec /></AuthGuard>} />
          <Route path="/super-rec" element={<AuthGuard><SuperRec /></AuthGuard>} />
          <Route path="/clients" element={<AuthGuard><ClientRecords /></AuthGuard>} />
          <Route path="/automation" element={<AuthGuard><AIAutomation /></AuthGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;