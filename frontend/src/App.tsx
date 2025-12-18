import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transfer from "./pages/Transfer";
import Wallet from "./pages/Wallet";
import PublicDashboard from "./pages/PublicDashboard";
import Merchant from "./pages/Merchant";
import Navigation from "./components/Navigation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <div className="pb-20 md:pl-20">
                  <Dashboard />
                  <Navigation />
                </div>
              } 
            />
            <Route 
              path="/transfer" 
              element={
                <div className="pb-20 md:pl-20">
                  <Transfer />
                  <Navigation />
                </div>
              } 
            />
            <Route 
              path="/merchant" 
              element={
                <div className="pb-20 md:pl-20">
                  <Merchant />
                  <Navigation />
                </div>
              } 
            />
            <Route 
              path="/wallet" 
              element={
                <div className="pb-20 md:pl-20">
                  <Wallet />
                  <Navigation />
                </div>
              } 
            />
            <Route 
              path="/public" 
              element={
                <div className="pb-20 md:pl-20">
                  <PublicDashboard />
                  <Navigation />
                </div>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
