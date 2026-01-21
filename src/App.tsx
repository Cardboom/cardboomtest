import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { GemsProvider } from "@/contexts/GemsContext";
import { PriceProvider } from "@/contexts/PriceContext";
import { AchievementProvider } from "@/contexts/AchievementContext";
import { DebugProvider } from "@/contexts/DebugContext";
import { CookieConsent } from "@/components/CookieConsent";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SocialProofPopup } from "@/components/SocialProofPopup";
import { SellerShippingNotifier } from "@/components/seller/SellerShippingNotifier";
import { OnboardingChecklist } from "@/components/growth";
import { NavigationProgress } from "@/components/NavigationProgress";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SignUpSuccess from "./pages/SignUpSuccess";
import Wallet from "./pages/Wallet";
import Vault from "./pages/Vault";
import Sell from "./pages/Sell";
import VerifiedSeller from "./pages/VerifiedSeller";
import Markets from "./pages/Markets";

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
import CollectiveMarket from "./pages/CollectiveMarket";
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
import News from "./pages/News";
import NewsArticle from "./pages/NewsArticle";
import Insights from "./pages/Insights";
import InsightArticle from "./pages/InsightArticle";
import Press from "./pages/Press";
import Help from "./pages/Help";
import Safety from "./pages/Safety";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import KVKK from "./pages/KVKK";
import UserAgreement from "./pages/UserAgreement";
import DistanceSalesContract from "./pages/DistanceSalesContract";
import ConsignmentAgreement from "./pages/ConsignmentAgreement";
import API from "./pages/API";
import Article from "./pages/Article";
import Achievements from "./pages/Achievements";
import Pricing from "./pages/Pricing";
import Circle from "./pages/Circle";
import Thread from "./pages/Thread";
import CreatorPage from "./pages/CreatorPage";
import CreatorInvite from "./pages/CreatorInvite";
import Reels from "./pages/Reels";
import Grading from "./pages/Grading";
import GradingNew from "./pages/GradingNew";
import GradingOrders from "./pages/GradingOrders";
import GradingOrderDetail from "./pages/GradingOrderDetail";
import GradingCreditsPage from "./pages/GradingCreditsPage";
import GradingSuccess from "./pages/GradingSuccess";
import GradingFailed from "./pages/GradingFailed";
import GradingCanceled from "./pages/GradingCanceled";
import NotFound from "./pages/NotFound";
import CardWars from "./pages/CardWars";
import CardBoomPass from "./pages/CardBoomPass";
import BuyOrders from "./pages/BuyOrders";
import StorefrontPage from "./pages/StorefrontPage";
import MyStorefrontPage from "./pages/MyStorefrontPage";
import Cardswap from "./pages/Cardswap";
import OrderDetail from "./pages/OrderDetail";
import Purchases from "./pages/Purchases";
import Orders from "./pages/Orders";
import AccountSettings from "./pages/AccountSettings";
import Sitemap from "./pages/Sitemap";
import BuyCategoryPage from "./pages/BuyCategoryPage";
import LongtailLandingPage from "./pages/LongtailLandingPage";
import BoomPacks from "./pages/BoomPacks";
import CoinsPage from "./pages/CoinsPage";
import Fees from "./pages/Fees";
import CatalogCardPage from "./pages/CatalogCardPage";
import CatalogExplorer from "./pages/CatalogExplorer";

// AI Research & Citation Pages (AEO Strategy)
import CardGradingGuide from "./pages/ai/CardGradingGuide";
import PSAvsCompetitors from "./pages/ai/PSAvsCompetitors";
import HowCardGradingWorks from "./pages/ai/HowCardGradingWorks";
import CardGradingCosts from "./pages/ai/CardGradingCosts";
import AICardGradingExplained from "./pages/ai/AICardGradingExplained";
import BestCardGradingCompanies from "./pages/ai/BestCardGradingCompanies";
import IsCardBoomLegit from "./pages/ai/questions/IsCardBoomLegit";
import HowAccurateIsAIGrading from "./pages/ai/questions/HowAccurateIsAIGrading";
import CardGradingQuestionsIndex from "./pages/ai/CardGradingQuestionsIndex";
import AIGradingFAQIndex from "./pages/ai/AIGradingFAQIndex";
import ResearchIndex from "./pages/ai/ResearchIndex";

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
        <NavigationProgress />
        <OnboardingChecklist />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup-success" element={<SignUpSuccess />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/verified-seller" element={<VerifiedSeller />} />
          <Route path="/markets" element={<Markets />} />
          {/* Explorer redirects to Markets */}
          <Route path="/explorer" element={<Markets />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/card/:id" element={<CardSalePage />} />
          {/* SEO-friendly listing URLs */}
          <Route path="/listing/:category/:slug" element={<ListingDetail />} />
          {/* Legacy UUID-based listing URLs (redirects to SEO URL) */}
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/cardswap" element={<Cardswap />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
          {/* Collective/Fractional feature temporarily disabled */}
          <Route path="/gaming" element={<Gaming />} />
          <Route path="/seller/:sellerId" element={<SellerProfile />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          {/* SEO Card Pages - New canonical structure */}
          <Route path="/cards/:category/:slug" element={<CardPage />} />
          {/* Catalog Card Pages - Canonical pricing with clean separation */}
          <Route path="/catalog" element={<CatalogExplorer />} />
          <Route path="/catalog/:game" element={<CatalogExplorer />} />
          <Route path="/catalog/:game/:canonicalKey" element={<CatalogCardPage />} />
          {/* Legacy routes - redirect to canonical */}
          <Route path="/:category/:slug" element={<LegacyCardRedirect />} />
          <Route path="/:category/:slug/:grade" element={<LegacyCardRedirect />} />
          <Route path="/order-success/:orderId" element={<OrderSuccess />} />
          <Route path="/about" element={<About />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/blog" element={<Insights />} />
          <Route path="/news" element={<Insights />} />
          <Route path="/news/:slug" element={<InsightArticle />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/:slug" element={<InsightArticle />} />
          <Route path="/press" element={<Press />} />
          <Route path="/help" element={<Help />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/kvkk" element={<KVKK />} />
          <Route path="/kullanici-sozlesmesi" element={<UserAgreement />} />
          <Route path="/mesafeli-satis-sozlesmesi" element={<DistanceSalesContract />} />
          <Route path="/consignment-agreement" element={<ConsignmentAgreement />} />
          <Route path="/api" element={<API />} />
          <Route path="/blog/:slug" element={<Article />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/circle" element={<Circle />} />
          <Route path="/circle/:id" element={<Thread />} />
          <Route path="/card-wars" element={<CardWars />} />
          <Route path="/pass" element={<CardBoomPass />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/boom-packs" element={<BoomPacks />} />
          <Route path="/coins" element={<CoinsPage />} />
          {/* Grading Routes */}
          <Route path="/grading" element={<Grading />} />
          <Route path="/grading/new" element={<GradingNew />} />
          <Route path="/grading/orders" element={<GradingOrders />} />
          <Route path="/grading/orders/:id" element={<GradingOrderDetail />} />
          <Route path="/grading/credits" element={<GradingCreditsPage />} />
          <Route path="/grading/success" element={<GradingSuccess />} />
          <Route path="/grading/failed" element={<GradingFailed />} />
          <Route path="/grading/canceled" element={<GradingCanceled />} />
          {/* Creator Routes */}
          <Route path="/@:username" element={<CreatorPage />} />
          <Route path="/creators" element={<CreatorInvite />} />
          <Route path="/store/:slug" element={<StorefrontPage />} />
          <Route path="/my-storefront" element={<MyStorefrontPage />} />
          {/* SEO Category Pages */}
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/buy/:category" element={<BuyCategoryPage />} />
          {/* Long-tail SEO Landing Pages */}
          <Route path="/deals/:slug" element={<LongtailLandingPage />} />
          {/* Buy Orders */}
          <Route path="/buy-orders" element={<BuyOrders />} />
          {/* Order & Purchases */}
          <Route path="/order/:orderId" element={<OrderDetail />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/purchases" element={<Orders />} /> {/* Redirect legacy purchases URL */}
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/settings" element={<AccountSettings />} />
          {/* AI Research & Citation Pages (AEO Strategy) */}
          <Route path="/ai" element={<ResearchIndex />} />
          <Route path="/ai/card-grading-questions" element={<CardGradingQuestionsIndex />} />
          <Route path="/ai/ai-grading-faq" element={<AIGradingFAQIndex />} />
          <Route path="/ai/card-grading-guide" element={<CardGradingGuide />} />
          <Route path="/ai/psa-vs-bgs-vs-cgc-vs-cardboom" element={<PSAvsCompetitors />} />
          <Route path="/ai/how-card-grading-works" element={<HowCardGradingWorks />} />
          <Route path="/ai/card-grading-costs-2026" element={<CardGradingCosts />} />
          <Route path="/ai/ai-card-grading-explained" element={<AICardGradingExplained />} />
          <Route path="/ai/best-card-grading-companies" element={<BestCardGradingCompanies />} />
          <Route path="/ai/questions/is-cardboom-legit" element={<IsCardBoomLegit />} />
          <Route path="/ai/questions/how-accurate-is-ai-grading" element={<HowAccurateIsAIGrading />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SocialProofPopup />
        <CookieConsent />
        <SellerShippingNotifier />
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <GemsProvider>
            <PriceProvider>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                  <AchievementProvider>
                    <DebugProvider>
                      <AppContent />
                    </DebugProvider>
                  </AchievementProvider>
                </TooltipProvider>
              </QueryClientProvider>
            </PriceProvider>
          </GemsProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
