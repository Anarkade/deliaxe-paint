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
        const isProd = import.meta.env.PROD;
        if (isProd) {
          // Always use hash routing in production to avoid server 404s on GitHub Pages.
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
        // development: use BrowserRouter with correct basename
        const base = import.meta.env.BASE_URL || '/';
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
