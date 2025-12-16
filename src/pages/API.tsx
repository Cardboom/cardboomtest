import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Key, Zap, Database, Shield, Code, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      // Check wallet balance first
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

      if (wallet.balance < 30) {
        toast.error(`Insufficient wallet balance. You need $30, but have $${wallet.balance.toFixed(2)}. Please top up your wallet.`);
        navigate('/wallet');
        setLoading(false);
        return;
      }

      // Deduct $30 from wallet
      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - 30 })
        .eq('id', wallet.id);

      if (deductError) {
        toast.error('Failed to process payment');
        setLoading(false);
        return;
      }

      // Record the transaction
      await supabase.from('transactions').insert({
        wallet_id: wallet.id,
        type: 'fee',
        amount: -30,
        description: 'API Access Subscription - 1 Month'
      });

      // Create the subscription with lower rate limits (1,000/day to prevent arbitrage)
      const { data, error } = await supabase
        .from('api_subscriptions')
        .insert({
          user_id: user.id,
          plan: 'basic',
          price_monthly: 30,
          requests_limit: 1000, // Lower than RapidAPI Cardmarket to prevent arbitrage
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        // Refund if subscription creation fails
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance })
          .eq('id', wallet.id);
        throw error;
      }
      
      setSubscription(data);
      toast.success('API subscription activated! $30 deducted from wallet.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  const codeExamples = {
    curl: `curl -X GET "https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/market-api/items?category=pokemon&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`,
    javascript: `const response = await fetch(
  'https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/market-api/items?category=pokemon&limit=10',
  {
    headers: {
      'x-api-key': 'YOUR_API_KEY'
    }
  }
);
const data = await response.json();
console.log(data);`,
    python: `import requests

response = requests.get(
    'https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/market-api/items',
    params={'category': 'pokemon', 'limit': 10},
    headers={'x-api-key': 'YOUR_API_KEY'}
)
data = response.json()
print(data)`
  };

  return (
    <>
      <Helmet>
        <title>Market Data API | CardBoom</title>
        <meta name="description" content="Access real-time TCG and collectibles pricing data through CardBoom's Market Data API. Get prices, trends, and market analytics." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">API v1.0</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              CardBoom Market Data API
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Access real-time pricing data, market trends, and analytics for TCG cards and collectibles.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto mb-16">
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">API Access</CardTitle>
                <CardDescription>Full access to all endpoints</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-5xl font-bold text-foreground">$30</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="text-left space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>1,000 requests/day</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Real-time pricing data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Historical price trends</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>All categories (Pokemon, Sports, etc.)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>JSON response format</span>
                  </li>
                </ul>
                
                {subscription ? (
                  <div className="space-y-4">
                    <Badge className="bg-green-500">Active Subscription</Badge>
                    <div className="bg-background/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Your API Key:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-muted p-2 rounded text-xs overflow-hidden text-ellipsis">
                          {subscription.api_key}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(subscription.api_key, 'apikey')}
                        >
                          {copied === 'apikey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Requests today: {subscription.requests_today} / {subscription.requests_limit}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSubscribe}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : user ? 'Subscribe Now' : 'Login to Subscribe'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <Card className="bg-card/50">
              <CardContent className="pt-6 text-center">
                <Database className="h-10 w-10 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Rich Data</h3>
                <p className="text-sm text-muted-foreground">Access pricing for thousands of collectibles</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6 text-center">
                <Zap className="h-10 w-10 mx-auto mb-3 text-yellow-500" />
                <h3 className="font-semibold mb-2">Real-time</h3>
                <p className="text-sm text-muted-foreground">Live price updates as market changes</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6 text-center">
                <Shield className="h-10 w-10 mx-auto mb-3 text-green-500" />
                <h3 className="font-semibold mb-2">Reliable</h3>
                <p className="text-sm text-muted-foreground">99.9% uptime SLA guaranteed</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6 text-center">
                <Key className="h-10 w-10 mx-auto mb-3 text-purple-500" />
                <h3 className="font-semibold mb-2">Secure</h3>
                <p className="text-sm text-muted-foreground">API key authentication</p>
              </CardContent>
            </Card>
          </div>

          {/* Documentation */}
          <Card className="bg-card/50 mb-16">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Base URL</h3>
                  <code className="bg-muted p-3 rounded block">
                    https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/market-api
                  </code>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Authentication</h3>
                  <p className="text-muted-foreground mb-2">
                    Include your API key in the <code className="bg-muted px-1">x-api-key</code> header with every request.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Endpoints</h3>
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>GET</Badge>
                        <code>/items</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">List market items with optional filters</p>
                      <p className="text-xs text-muted-foreground">
                        Query params: <code>category</code>, <code>limit</code>, <code>offset</code>, <code>search</code>
                      </p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>GET</Badge>
                        <code>/item/:id</code>
                      </div>
                      <p className="text-sm text-muted-foreground">Get detailed information for a specific item</p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>GET</Badge>
                        <code>/prices</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">Get prices for multiple items at once</p>
                      <p className="text-xs text-muted-foreground">
                        Query params: <code>ids</code> (comma-separated)
                      </p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>GET</Badge>
                        <code>/categories</code>
                      </div>
                      <p className="text-sm text-muted-foreground">List all available categories</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Code Examples</h3>
                  <Tabs defaultValue="curl">
                    <TabsList>
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                    </TabsList>
                    {Object.entries(codeExamples).map(([lang, code]) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="relative">
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{code}</code>
                          </pre>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(code, lang)}
                          >
                            {copied === lang ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Response Format</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Charizard VMAX",
      "category": "pokemon",
      "current_price": 250.00,
      "change_24h": 2.5,
      "change_7d": -1.2,
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
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default API;