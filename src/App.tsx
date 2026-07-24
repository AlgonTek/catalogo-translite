import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QuoteCartProvider } from "@/context/QuoteCartContext.tsx";
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Auth from "./pages/Auth.tsx";
import Admin from "./pages/Admin.tsx";
import Contactos from "./pages/Contactos.tsx";
import NotFound from "./pages/NotFound.tsx";
import { MobileBottomNav } from "./components/MobileBottomNav.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <QuoteCartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="pb-16 sm:pb-0 min-h-screen flex flex-col bg-background text-foreground">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/produto/:id" element={<ProductDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/contactos" element={<Contactos />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileBottomNav />
          </div>
        </BrowserRouter>
      </QuoteCartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
