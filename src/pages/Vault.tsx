import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vault as VaultIcon, Package, TrendingUp, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface VaultItem {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  image_url: string;
  estimated_value: number;
  created_at: string;
}

const VaultPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      fetchVaultItems();
    };
    checkAuth();
  }, [navigate]);

  const fetchVaultItems = async () => {
    try {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setItems(data || []);
      const total = (data || []).reduce((sum, item) => sum + (Number(item.estimated_value) || 0), 0);
      setTotalValue(total);
    } catch (error) {
      console.error('Error fetching vault items:', error);
      toast.error('Failed to load vault items');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                My Vault
              </h1>
              <p className="text-muted-foreground">
                Your securely stored collectibles
              </p>
            </div>
            <Card className="px-6 py-4 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-gold" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Vault Items Grid */}
          {items.length === 0 ? (
            <Card className="p-12 text-center">
              <VaultIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Your vault is empty
              </h2>
              <p className="text-muted-foreground mb-6">
                When you buy cards and choose vault storage, they'll appear here.
              </p>
              <Button onClick={() => navigate('/')}>
                Browse Marketplace
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="aspect-[3/4] bg-muted relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-gold text-gold-foreground">
                      In Vault
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span>{item.condition}</span>
                    </div>
                    {item.estimated_value && (
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(item.estimated_value)}
                      </p>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        List for Sale
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Section */}
          <Card className="mt-8 p-6 bg-muted/30">
            <div className="flex items-start gap-4">
              <VaultIcon className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Free Vault Storage</h3>
                <p className="text-sm text-muted-foreground">
                  All vault storage is completely free. Your cards are securely stored, insured, 
                  and can be listed for sale or shipped to you at any time. We handle authentication 
                  and grading verification.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VaultPage;
