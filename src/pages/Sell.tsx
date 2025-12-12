import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, Vault, Truck, ArrowLeftRight, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  status: string;
  allows_vault: boolean;
  allows_trade: boolean;
  allows_shipping: boolean;
  created_at: string;
}

const categories = ['nba', 'football', 'tcg', 'figures'];
const conditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];

const SellPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'nba',
    condition: 'Near Mint',
    price: '',
    allowsVault: true,
    allowsTrade: true,
    allowsShipping: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      fetchListings();
    };
    checkAuth();
  }, [navigate]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const price = parseFloat(formData.price);
    if (!price || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!formData.allowsVault && !formData.allowsTrade && !formData.allowsShipping) {
      toast.error('Please select at least one delivery option');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('listings')
        .insert({
          seller_id: session.user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          condition: formData.condition,
          price: price,
          allows_vault: formData.allowsVault,
          allows_trade: formData.allowsTrade,
          allows_shipping: formData.allowsShipping,
        });

      if (error) throw error;

      toast.success('Listing created successfully!');
      setFormData({
        title: '',
        description: '',
        category: 'nba',
        condition: 'Near Mint',
        price: '',
        allowsVault: true,
        allowsTrade: true,
        allowsShipping: true,
      });
      fetchListings();
      setActiveTab('listings');
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Listing deleted');
      fetchListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-gain text-gain-foreground">Active</Badge>;
      case 'sold':
        return <Badge className="bg-primary text-primary-foreground">Sold</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Sell Your Cards
          </h1>
          <p className="text-muted-foreground mb-8">
            List your collectibles for sale. 6% seller fee applies when sold.
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="create" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Listing
              </TabsTrigger>
              <TabsTrigger value="listings" className="gap-2">
                <Package className="h-4 w-4" />
                My Listings ({listings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>New Listing</CardTitle>
                  <CardDescription>
                    Fill in the details about your collectible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          placeholder="e.g., 2023 Panini Prizm LeBron James Silver"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="mt-1.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat.toUpperCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="condition">Condition</Label>
                        <Select
                          value={formData.condition}
                          onValueChange={(value) => setFormData({ ...formData, condition: value })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {conditions.map((cond) => (
                              <SelectItem key={cond} value={cond}>
                                {cond}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="price">Price (USD) *</Label>
                        <div className="relative mt-1.5">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="price"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="pl-7"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe your item, include any notable features or defects..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="mt-1.5"
                          rows={4}
                        />
                      </div>
                    </div>

                    {/* Delivery Options */}
                    <div>
                      <Label className="mb-3 block">Delivery Options *</Label>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <label
                          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            formData.allowsVault ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <Checkbox
                            checked={formData.allowsVault}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, allowsVault: checked as boolean })
                            }
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Vault className="h-4 w-4 text-primary" />
                              <span className="font-medium">Vault Storage</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              We store the card in our secure vault
                            </p>
                          </div>
                        </label>

                        <label
                          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            formData.allowsTrade ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <Checkbox
                            checked={formData.allowsTrade}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, allowsTrade: checked as boolean })
                            }
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <ArrowLeftRight className="h-4 w-4 text-primary" />
                              <span className="font-medium">Trade Online</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Digital ownership transfer
                            </p>
                          </div>
                        </label>

                        <label
                          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                            formData.allowsShipping ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <Checkbox
                            checked={formData.allowsShipping}
                            onCheckedChange={(checked) => 
                              setFormData({ ...formData, allowsShipping: checked as boolean })
                            }
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-primary" />
                              <span className="font-medium">Shipping</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Ship directly to buyer
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? 'Creating...' : 'Create Listing'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="listings">
              {listings.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    No listings yet
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Create your first listing to start selling.
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Listing
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <Card key={listing.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{listing.title}</h3>
                              {getStatusBadge(listing.status)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <span>{listing.category.toUpperCase()}</span>
                              <span>•</span>
                              <span>{listing.condition}</span>
                              <span>•</span>
                              <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                              {formatCurrency(Number(listing.price))}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {listing.allows_vault && (
                                <Badge variant="outline" className="text-xs">
                                  <Vault className="h-3 w-3 mr-1" /> Vault
                                </Badge>
                              )}
                              {listing.allows_trade && (
                                <Badge variant="outline" className="text-xs">
                                  <ArrowLeftRight className="h-3 w-3 mr-1" /> Trade
                                </Badge>
                              )}
                              {listing.allows_shipping && (
                                <Badge variant="outline" className="text-xs">
                                  <Truck className="h-3 w-3 mr-1" /> Ship
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => handleDelete(listing.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SellPage;
