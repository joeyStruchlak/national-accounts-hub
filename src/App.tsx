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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bas-review" element={<BASReview />} />
          <Route path="/job-pipeline" element={<JobPipeline />} />
          <Route path="/productivity" element={<Productivity />} />
          <Route path="/payroll-rec" element={<PayrollRec />} />
          <Route path="/super-rec" element={<SuperRec />} />
          <Route path="/clients" element={<ClientRecords />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
