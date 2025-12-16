import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { PriceProvider } from "@/contexts/PriceContext";
import { CookieConsent } from "@/components/CookieConsent";
import { HelmetProvider } from "react-helmet-async";
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
import Referrals from "./pages/Referrals";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import FractionalMarket from "./pages/FractionalMarket";
import Gaming from "./pages/Gaming";
import CardPage from "./pages/CardPage";
import PublicProfile from "./pages/PublicProfile";
import OrderSuccess from "./pages/OrderSuccess";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import Press from "./pages/Press";
import Help from "./pages/Help";
import Safety from "./pages/Safety";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <PriceProvider>
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
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/u/:username" element={<PublicProfile />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/fractional" element={<FractionalMarket />} />
                  <Route path="/gaming" element={<Gaming />} />
                  {/* SEO Card Pages */}
                  <Route path="/:category/:slug" element={<CardPage />} />
                  <Route path="/:category/:slug/:grade" element={<CardPage />} />
                  <Route path="/order-success/:orderId" element={<OrderSuccess />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/press" element={<Press />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/safety" element={<Safety />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              <CookieConsent />
            </TooltipProvider>
            </QueryClientProvider>
          </PriceProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
