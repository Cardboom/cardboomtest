import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingDown, Sparkles, Search,
  ArrowLeftRight, Flame, Percent
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ArbitrageView } from '@/components/deals/ArbitrageView';
import { AutoMatchEngine } from '@/components/marketplace/AutoMatchEngine';

const Deals = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Best Deals | Cardboom - Trading Cards Below Market Value</title>
        <meta name="description" content="Find trading cards listed below market value. Real-time deal detection for Pokemon, sports cards, and collectibles. Discover hidden treasures and arbitrage opportunities." />
        <meta name="keywords" content="trading card deals, cheap trading cards, card arbitrage, Pokemon deals, sports card deals, below market value, card discounts" />
        <link rel="canonical" href="https://cardboom.com/deals" />
        <meta property="og:title" content="Best Deals | Cardboom" />
        <meta property="og:description" content="Find trading cards listed below market value. Real-time deal detection." />
        <meta property="og:url" content="https://cardboom.com/deals" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header cartCount={cartItems.length} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-gain/20 text-gain px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Live Deal Discovery</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Find Hidden <span className="text-primary">Treasures</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Real-time deal detection finds cards listed below market value with live price updates
          </p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
          >
            <Flame className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-muted-foreground text-sm">Active Deals</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
          >
            <Percent className="w-6 h-6 mx-auto mb-2 text-gain" />
            <p className="text-2xl font-bold text-gain">0%</p>
            <p className="text-muted-foreground text-sm">Avg Discount</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
          >
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-foreground">0%</p>
            <p className="text-muted-foreground text-sm">Best Deal</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-4 text-center"
          >
            <ArrowLeftRight className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-muted-foreground text-sm">Arbitrage Opps</p>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="deals" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <TabsList className="bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="deals" className="rounded-lg gap-2">
                <Sparkles className="w-4 h-4" />
                Hot Deals
              </TabsTrigger>
              <TabsTrigger value="match" className="rounded-lg gap-2">
                <Search className="w-4 h-4" />
                Auto-Match
              </TabsTrigger>
              <TabsTrigger value="arbitrage" className="rounded-lg gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Arbitrage
              </TabsTrigger>
            </TabsList>

            {/* Search & Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border/30"
                />
              </div>
            </div>
          </div>

          <TabsContent value="deals" className="space-y-4">
            <div className="text-center py-16">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No deals available yet</h3>
              <p className="text-muted-foreground mb-4">Deals will appear here based on your listings and market activity</p>
              <Button onClick={() => navigate('/sell')}>
                Create a Listing
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="match">
            <AutoMatchEngine />
          </TabsContent>

          <TabsContent value="arbitrage">
            <ArbitrageView />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Deals;
