import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Use Vite's BASE_URL as the router basename so routes resolve when served from a subpath (GitHub Pages) */}
      {(() => {
        const base = import.meta.env.BASE_URL || '/';
        // remove trailing slash except for root '/'
        const basename = base === '/' ? '/' : base.replace(/\/$/, '');
        return (
          <BrowserRouter basename={basename}>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        );
      })()}
      
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
