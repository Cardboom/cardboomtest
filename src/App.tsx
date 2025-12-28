import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { PriceProvider } from "@/contexts/PriceContext";
import { AchievementProvider } from "@/contexts/AchievementContext";
import { DebugProvider } from "@/contexts/DebugContext";
import { CookieConsent } from "@/components/CookieConsent";
import { LoadingScreen } from "@/components/LoadingScreen";
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
import CardSalePage from "./pages/CardSalePage";
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
import LegacyCardRedirect from "./components/LegacyCardRedirect";
import PublicProfile from "./pages/PublicProfile";
import OrderSuccess from "./pages/OrderSuccess";
import SellerProfile from "./pages/SellerProfile";
import HallOfFame from "./pages/HallOfFame";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import Press from "./pages/Press";
import Help from "./pages/Help";
import Safety from "./pages/Safety";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import KVKK from "./pages/KVKK";
import UserAgreement from "./pages/UserAgreement";
import DistanceSalesContract from "./pages/DistanceSalesContract";
import API from "./pages/API";
import Article from "./pages/Article";
import Achievements from "./pages/Achievements";
import Pricing from "./pages/Pricing";
import Circle from "./pages/Circle";
import CreatorPage from "./pages/CreatorPage";
import CreatorInvite from "./pages/CreatorInvite";
import Reels from "./pages/Reels";
import Grading from "./pages/Grading";
import GradingNew from "./pages/GradingNew";
import GradingOrders from "./pages/GradingOrders";
import GradingOrderDetail from "./pages/GradingOrderDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for initial app load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
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
          <Route path="/card/:id" element={<CardSalePage />} />
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
          <Route path="/seller/:sellerId" element={<SellerProfile />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          {/* SEO Card Pages - New canonical structure */}
          <Route path="/cards/:category/:slug" element={<CardPage />} />
          {/* Legacy routes - redirect to canonical */}
          <Route path="/:category/:slug" element={<LegacyCardRedirect />} />
          <Route path="/:category/:slug/:grade" element={<LegacyCardRedirect />} />
          <Route path="/order-success/:orderId" element={<OrderSuccess />} />
          <Route path="/about" element={<About />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/press" element={<Press />} />
          <Route path="/help" element={<Help />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/kvkk" element={<KVKK />} />
          <Route path="/kullanici-sozlesmesi" element={<UserAgreement />} />
          <Route path="/mesafeli-satis-sozlesmesi" element={<DistanceSalesContract />} />
          <Route path="/api" element={<API />} />
          <Route path="/blog/:slug" element={<Article />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/circle" element={<Circle />} />
          <Route path="/reels" element={<Reels />} />
          {/* Grading Routes */}
          <Route path="/grading" element={<Grading />} />
          <Route path="/grading/new" element={<GradingNew />} />
          <Route path="/grading/orders" element={<GradingOrders />} />
          <Route path="/grading/orders/:id" element={<GradingOrderDetail />} />
          {/* Creator Routes */}
          <Route path="/@:username" element={<CreatorPage />} />
          <Route path="/creators" element={<CreatorInvite />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <CookieConsent />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <PriceProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <AchievementProvider>
                  <AppContent />
                </AchievementProvider>
              </TooltipProvider>
            </QueryClientProvider>
          </PriceProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
