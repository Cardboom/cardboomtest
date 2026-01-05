import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Key, Zap, Database, Shield, Code, ArrowRight, Sparkles, Award, TrendingUp, Globe, Clock, Target, Cpu, Eye, BarChart3, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

const API_PRICE = 99;

const API = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data } = await supabase
          .from('api_subscriptions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single();
        setSubscription(data);
      }
    };
    checkAuth();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    setLoading(true);
    try {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();

      if (walletError || !wallet) {
        toast.error('Could not find your wallet');
        setLoading(false);
        return;
      }

      if (wallet.balance < API_PRICE) {
        toast.error(`Insufficient wallet balance. You need $${API_PRICE}, but have $${wallet.balance.toFixed(2)}. Please top up your wallet.`);
        navigate('/wallet');
        setLoading(false);
        return;
      }

      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - API_PRICE })
        .eq('id', wallet.id);

      if (deductError) {
        toast.error('Failed to process payment');
        setLoading(false);
        return;
      }

      await supabase.from('transactions').insert({
        wallet_id: wallet.id,
        type: 'fee',
        amount: -API_PRICE,
        description: 'API Access Subscription - 1 Month'
      });

      const { data, error } = await supabase
        .from('api_subscriptions')
        .insert({
          user_id: user.id,
          plan: 'pro',
          price_monthly: API_PRICE,
          requests_limit: 10000,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance })
          .eq('id', wallet.id);
        throw error;
      }
      
      setSubscription(data);
      toast.success(`API subscription activated! $${API_PRICE} deducted from wallet.`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  const marketApiExamples = {
    curl: `curl -X GET "https://api.cardboom.com/v1/items?category=pokemon&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`,
    javascript: `const response = await fetch(
  'https://api.cardboom.com/v1/items?category=pokemon&limit=10',
  {
    headers: {
      'x-api-key': 'YOUR_API_KEY'
    }
  }
);
const data = await response.json();`,
    python: `import requests

response = requests.get(
    'https://api.cardboom.com/v1/items',
    params={'category': 'pokemon', 'limit': 10},
    headers={'x-api-key': 'YOUR_API_KEY'}
)
data = response.json()`
  };

  const gradingApiExamples = {
    curl: `curl -X POST "https://api.cardboom.com/v1/grading" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"front_image_url": "https://...", "back_image_url": "https://...", "category": "pokemon"}'`,
    javascript: `const response = await fetch('https://api.cardboom.com/v1/grading', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    front_image_url: 'https://your-image.jpg',
    back_image_url: 'https://your-image-back.jpg',
    category: 'pokemon'
  })
});
const gradingResult = await response.json();`,
    python: `import requests

response = requests.post(
    'https://api.cardboom.com/v1/grading',
    headers={'x-api-key': 'YOUR_API_KEY'},
    json={
        'front_image_url': 'https://your-image.jpg',
        'back_image_url': 'https://your-image-back.jpg',
        'category': 'pokemon'
    }
)
grading_result = response.json()`
  };

  const features = [
    { icon: Database, label: 'Market Data', description: 'Real-time prices for 500K+ TCG cards', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Award, label: 'AI Grading', description: 'CardBoom Grading Index via API', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: TrendingUp, label: 'Price History', description: '7d, 30d, 90d, 1y price trends', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: Globe, label: 'Multi-Currency', description: 'USD, EUR, TRY support', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { icon: Zap, label: 'Fast Response', description: '<100ms average latency', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { icon: Shield, label: '99.9% Uptime', description: 'Enterprise-grade reliability', color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  const useCases = [
    { title: 'Collection Apps', description: 'Build portfolio trackers with real-time valuations' },
    { title: 'Marketplaces', description: 'Power your TCG marketplace with accurate pricing' },
    { title: 'Grading Services', description: 'Integrate AI grading into your platform' },
    { title: 'Price Alerts', description: 'Create price monitoring and alert systems' },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "CardBoom API",
    "applicationCategory": "DeveloperApplication",
    "description": "TCG market data API and AI card grading API. Access real-time prices for Pokemon, MTG, Yu-Gi-Oh, One Piece cards and integrate AI-powered card grading.",
    "url": "https://cardboom.com/api",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": API_PRICE,
      "priceCurrency": "USD",
      "priceValidUntil": "2026-12-31"
    },
    "provider": {
      "@type": "Organization",
      "name": "CardBoom",
      "url": "https://cardboom.com"
    }
  };

  return (
    <>
      <Helmet>
        <title>TCG Card Grading API & Market Data API | CardBoom Developer API</title>
        <meta name="description" content="Professional TCG API for developers. AI card grading API ($10/card), real-time market prices for Pokemon, MTG, Yu-Gi-Oh!, One Piece cards. 10K requests/month, 99.9% uptime." />
        <meta name="keywords" content="TCG API, card grading API, Pokemon card API, MTG API, Yu-Gi-Oh API, trading card API, card price API, AI grading API, collectibles API, sports card API, One Piece card API, card market data, TCG price data" />
        <link rel="canonical" href="https://cardboom.com/api" />
        
        <meta property="og:title" content="TCG Card Grading API & Market Data API | CardBoom" />
        <meta property="og:description" content="Professional TCG API for developers. AI card grading, real-time prices for 500K+ cards. Perfect for building collection apps, marketplaces, and grading services." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cardboom.com/api" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TCG Card Grading API & Market Data API" />
        <meta name="twitter:description" content="Professional TCG API for developers. AI card grading, real-time prices for Pokemon, MTG, Yu-Gi-Oh!, sports cards." />
        
        <meta name="robots" content="index, follow" />
        
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main>
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.05),transparent_40%)]" />
            
            <div className="container mx-auto px-4 py-12 md:py-20 relative">
              <div className="max-w-4xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-primary/10 rounded-full text-sm font-semibold text-primary border border-primary/20">
                    <Code className="w-4 h-4" />
                    Developer API v1.0
                  </div>
                  
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
                    TCG Market Data &
                    <span className="block text-primary">AI Grading API</span>
                  </h1>
                  
                  <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                    Build powerful TCG applications with real-time pricing for 500K+ cards and AI-powered card grading. Perfect for collection apps, marketplaces, and grading services.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                    <Button 
                      size="lg" 
                      className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-bold rounded-xl gap-2"
                      onClick={handleSubscribe}
                      disabled={loading || !!subscription}
                    >
                      {loading ? 'Processing...' : subscription ? 'Active Subscription' : user ? `Get API Access - $${API_PRICE}/mo` : 'Login to Subscribe'}
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                    
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-semibold rounded-xl"
                      onClick={() => document.getElementById('documentation')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      View Documentation
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                      <span>10K requests/month</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                      <span>AI Grading Included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                      <span>99.9% Uptime SLA</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Active Subscription Banner */}
          {subscription && (
            <section className="py-6 bg-emerald-500/10 border-y border-emerald-500/20">
              <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto">
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-emerald-500">Active</Badge>
                      <span className="font-semibold">Your API Key</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <code className="flex-1 bg-background p-3 rounded-lg text-xs font-mono overflow-hidden text-ellipsis border">
                        {subscription.api_key}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(subscription.api_key, 'apikey')}
                      >
                        {copied === 'apikey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center sm:text-right">
                    Requests today: {subscription.requests_today} / {subscription.requests_limit}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Features Grid */}
          <section className="py-16 md:py-20 border-b border-border/50">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-black mb-3">Everything You Need</h2>
                <p className="text-muted-foreground">Comprehensive API for TCG developers</p>
              </motion.div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="p-4 md:p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
                  >
                    <div className={`p-2 md:p-3 rounded-xl ${feature.bg} w-fit mb-3`}>
                      <feature.icon className={`w-5 h-5 md:w-6 md:h-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-bold text-sm md:text-base mb-1">{feature.label}</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section className="py-16 md:py-20 bg-muted/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-black mb-3">Simple, Transparent Pricing</h2>
                <p className="text-muted-foreground">One plan with everything included</p>
              </motion.div>
              
              <div className="max-w-lg mx-auto">
                <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                  <CardHeader className="text-center relative">
                    <Badge className="w-fit mx-auto mb-2">Pro API</Badge>
                    <CardTitle className="text-3xl md:text-4xl">
                      <span className="text-5xl md:text-6xl font-black">${API_PRICE}</span>
                      <span className="text-muted-foreground text-lg">/month</span>
                    </CardTitle>
                    <CardDescription>Full access to all API endpoints</CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <ul className="space-y-3 mb-6">
                      {[
                        '10,000 API requests/month',
                        'Real-time market data for 500K+ cards',
                        'AI Card Grading API ($10/card)',
                        'Price history & trends',
                        'All TCG categories supported',
                        'Multi-currency (USD, EUR, TRY)',
                        'Webhook support',
                        '99.9% uptime SLA',
                        'Priority email support',
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full h-12 text-lg font-bold rounded-xl" 
                      size="lg"
                      onClick={handleSubscribe}
                      disabled={loading || !!subscription}
                    >
                      {loading ? 'Processing...' : subscription ? 'Active Subscription' : user ? 'Subscribe Now' : 'Login to Subscribe'}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Billed monthly. Cancel anytime.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-16 md:py-20 border-b border-border/50">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-black mb-3">Built for Developers</h2>
                <p className="text-muted-foreground">Power your TCG applications</p>
              </motion.div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {useCases.map((useCase, i) => (
                  <motion.div
                    key={useCase.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="p-4 md:p-6 rounded-2xl bg-card border border-border text-center"
                  >
                    <h3 className="font-bold text-sm md:text-base mb-2">{useCase.title}</h3>
                    <p className="text-muted-foreground text-xs">{useCase.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Documentation */}
          <section id="documentation" className="py-16 md:py-20">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-2xl md:text-3xl font-black mb-3">API Documentation</h2>
                <p className="text-muted-foreground">Get started in minutes</p>
              </motion.div>
              
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Authentication */}
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Key className="h-5 w-5 text-primary" />
                      Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Include your API key in the <code className="bg-muted px-2 py-1 rounded text-xs">x-api-key</code> header with every request.
                    </p>
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-xs sm:text-sm break-all">x-api-key: cb_live_xxxxxxxxxxxxxxxxxx</code>
                    </div>
                  </CardContent>
                </Card>

                {/* Market Data Endpoints */}
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Database className="h-5 w-5 text-blue-500" />
                      Market Data Endpoints
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {[
                        { method: 'GET', path: '/v1/items', desc: 'List market items with filters', params: 'category, limit, offset, search' },
                        { method: 'GET', path: '/v1/items/:id', desc: 'Get item details', params: null },
                        { method: 'GET', path: '/v1/prices', desc: 'Bulk price lookup', params: 'ids (comma-separated)' },
                        { method: 'GET', path: '/v1/categories', desc: 'List all categories', params: null },
                        { method: 'GET', path: '/v1/trending', desc: 'Top movers & trending', params: 'period (24h, 7d, 30d)' },
                      ].map((endpoint, i) => (
                        <div key={i} className="bg-muted/50 p-3 sm:p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{endpoint.method}</Badge>
                            <code className="text-xs sm:text-sm font-semibold">{endpoint.path}</code>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">{endpoint.desc}</p>
                          {endpoint.params && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Params: <code className="bg-background px-1 rounded">{endpoint.params}</code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      <h4 className="font-semibold mb-3 text-sm">Code Examples</h4>
                      <Tabs defaultValue="curl">
                        <TabsList className="mb-2">
                          <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                          <TabsTrigger value="javascript" className="text-xs">JavaScript</TabsTrigger>
                          <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
                        </TabsList>
                        {Object.entries(marketApiExamples).map(([lang, code]) => (
                          <TabsContent key={lang} value={lang}>
                            <div className="relative">
                              <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto text-xs">
                                <code>{code}</code>
                              </pre>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 h-8 w-8"
                                onClick={() => copyToClipboard(code, `market-${lang}`)}
                              >
                                {copied === `market-${lang}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>
                  </CardContent>
                </Card>

                {/* Grading API Endpoints */}
                <Card className="bg-card/50 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="h-5 w-5 text-purple-500" />
                      AI Grading API
                      <Badge variant="outline" className="ml-2 text-purple-500 border-purple-500/50">$10/card</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      Integrate CardBoom's AI-powered card grading into your application. Get detailed grades for corners, edges, surface, and centering.
                    </p>
                    
                    <div className="space-y-3">
                      {[
                        { method: 'POST', path: '/v1/grading', desc: 'Submit card for AI grading', params: 'front_image_url, back_image_url, category' },
                        { method: 'GET', path: '/v1/grading/:id', desc: 'Get grading result', params: null },
                        { method: 'GET', path: '/v1/grading/orders', desc: 'List your grading orders', params: 'status, limit, offset' },
                      ].map((endpoint, i) => (
                        <div key={i} className="bg-purple-500/5 border border-purple-500/20 p-3 sm:p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className="bg-purple-500 text-xs">{endpoint.method}</Badge>
                            <code className="text-xs sm:text-sm font-semibold">{endpoint.path}</code>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">{endpoint.desc}</p>
                          {endpoint.params && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Body: <code className="bg-background px-1 rounded">{endpoint.params}</code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      <h4 className="font-semibold mb-3 text-sm">Code Examples</h4>
                      <Tabs defaultValue="curl">
                        <TabsList className="mb-2">
                          <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                          <TabsTrigger value="javascript" className="text-xs">JavaScript</TabsTrigger>
                          <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
                        </TabsList>
                        {Object.entries(gradingApiExamples).map(([lang, code]) => (
                          <TabsContent key={lang} value={lang}>
                            <div className="relative">
                              <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto text-xs">
                                <code>{code}</code>
                              </pre>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 h-8 w-8"
                                onClick={() => copyToClipboard(code, `grading-${lang}`)}
                              >
                                {copied === `grading-${lang}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>

                    {/* Grading Response */}
                    <div className="pt-4">
                      <h4 className="font-semibold mb-3 text-sm">Grading Response</h4>
                      <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "cbgi_score": 9.2,
    "estimated_psa_range": "PSA 9-10",
    "subgrades": {
      "corners": 9.5,
      "edges": 9.0,
      "surface": 9.0,
      "centering": 9.5
    },
    "card_details": {
      "name": "Charizard VMAX",
      "set": "Champions Path",
      "number": "074/073"
    },
    "estimated_value_raw": 45.00,
    "estimated_value_graded": 120.00
  }
}`}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                {/* Response Format */}
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-emerald-500" />
                      Response Format
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-3 sm:p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Charizard VMAX",
      "category": "pokemon",
      "set_name": "Champions Path",
      "current_price": 250.00,
      "change_24h": 2.5,
      "change_7d": -1.2,
      "volume_24h": 45,
      "liquidity": "high",
      "image_url": "https://..."
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0,
    "total": 1
  }
}`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 md:py-20 bg-muted/30 border-t border-border/50">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-black mb-4">Ready to Build?</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get started with CardBoom API today and power your TCG application.
              </p>
              <Button 
                size="lg" 
                className="h-12 px-8 text-lg font-bold rounded-xl"
                onClick={handleSubscribe}
                disabled={loading || !!subscription}
              >
                {subscription ? 'View Dashboard' : `Get API Access - $${API_PRICE}/mo`}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default API;