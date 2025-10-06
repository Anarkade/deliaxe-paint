import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Use HashRouter in production when served from a subpath (GitHub Pages) to avoid server-side routing issues.
          Use BrowserRouter in development for cleaner URLs. */}
      {(() => {
        const base = import.meta.env.BASE_URL || '/';
        const isProdSubpath = import.meta.env.PROD && base !== '/';
        if (isProdSubpath) {
          return (
            <HashRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          );
        }
        // development or root deployment: use BrowserRouter with correct basename
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
