import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Wallet from "./pages/Wallet";
import Vault from "./pages/Vault";
import Sell from "./pages/Sell";
import VerifiedSeller from "./pages/VerifiedSeller";
import Markets from "./pages/Markets";
import Explorer from "./pages/Explorer";
import ItemDetail from "./pages/ItemDetail";
import ListingDetail from "./pages/ListingDetail";
import Messages from "./pages/Messages";
import Portfolio from "./pages/Portfolio";
import Trades from "./pages/Trades";
import Deals from "./pages/Deals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <LanguageProvider>
      <CurrencyProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/vault" element={<Vault />} />
                <Route path="/sell" element={<Sell />} />
                <Route path="/verified-seller" element={<VerifiedSeller />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/explorer" element={<Explorer />} />
                <Route path="/item/:id" element={<ItemDetail />} />
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/trades" element={<Trades />} />
                <Route path="/deals" element={<Deals />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <CookieConsent />
          </TooltipProvider>
        </QueryClientProvider>
      </CurrencyProvider>
    </LanguageProvider>
  </ErrorBoundary>
);

export default App;
