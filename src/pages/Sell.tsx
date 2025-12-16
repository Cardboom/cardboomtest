import { useState, useEffect, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Plus, Package, Vault, Truck, ArrowLeftRight, Pencil, Trash2, Eye, Upload, X, Loader2, Image as ImageIcon, PieChart, Search, Shield, Info } from 'lucide-react';
import { CardScanner } from '@/components/CardScanner';
import { toast } from 'sonner';
import { CreateFractionalDialog } from '@/components/fractional/CreateFractionalDialog';

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
  image_url: string | null;
}

const categories = ['nba', 'football', 'tcg', 'figures', 'pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana', 'gamepoints'];
const conditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];

const SellPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'nba',
    condition: 'Near Mint',
    price: '',
    allowsVault: true,
    allowsTrade: true,
    allowsShipping: true,
    enableFractional: false,
    totalShares: 100,
    minShares: 10,
    dailyVerification: true,
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imageFile) return null;
    
    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
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

      // Upload image if selected
      const imageUrl = await uploadImage(session.user.id);

      const { data: listingData, error } = await supabase
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
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Create fractional listing if enabled
      if (formData.enableFractional && listingData) {
        const sharePrice = price / formData.totalShares;
        const { error: fractionalError } = await supabase
          .from('fractional_listings')
          .insert({
            listing_id: listingData.id,
            total_shares: formData.totalShares,
            available_shares: formData.totalShares,
            share_price: sharePrice,
            min_shares: formData.minShares,
            daily_verification_required: formData.dailyVerification,
            owner_id: session.user.id,
            next_verification_due: formData.dailyVerification 
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
              : null,
          });

        if (fractionalError) {
          console.error('Error creating fractional listing:', fractionalError);
          toast.error('Listing created but fractional setup failed');
        }
      }

      toast.success(formData.enableFractional ? 'Fractional listing created successfully!' : 'Listing created successfully!');
      setFormData({
        title: '',
        description: '',
        category: 'nba',
        condition: 'Near Mint',
        price: '',
        allowsVault: true,
        allowsTrade: true,
        allowsShipping: true,
        enableFractional: false,
        totalShares: 100,
        minShares: 10,
        dailyVerification: true,
      });
      clearImage();
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

  const handleViewListing = (listingId: string) => {
    navigate(`/listing/${listingId}`);
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
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                  Sell Your Cards
                </h1>
                <p className="text-muted-foreground">
                  List your collectibles in minutes. Reach thousands of verified buyers.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-lg bg-background/80 border border-border">
                  <p className="text-xs text-muted-foreground">Seller Fee</p>
                  <p className="text-lg font-bold text-foreground">6%</p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-background/80 border border-border">
                  <p className="text-xs text-muted-foreground">Active Listings</p>
                  <p className="text-lg font-bold text-foreground">{listings.filter(l => l.status === 'active').length}</p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-background/80 border border-border">
                  <p className="text-xs text-muted-foreground">Total Sold</p>
                  <p className="text-lg font-bold text-gain">{listings.filter(l => l.status === 'sold').length}</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-3 sm:flex">
              <TabsTrigger value="scanner" className="gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Card Scanner</span>
                <span className="sm:hidden">Scan</span>
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Listing</span>
                <span className="sm:hidden">Create</span>
              </TabsTrigger>
              <TabsTrigger value="listings" className="gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">My Listings ({listings.length})</span>
                <span className="sm:hidden">({listings.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scanner">
              <CardScanner
                onSelectPrice={(price, imageUrl) => {
                  setFormData({ ...formData, price: price.toString() });
                  if (imageUrl) {
                    setImagePreview(imageUrl);
                  }
                  setActiveTab('create');
                  toast.success('Price applied! Complete your listing details.');
                }}
              />
            </TabsContent>

            <TabsContent value="create">
              <Card className="border-primary/10">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Create New Listing
                  </CardTitle>
                  <CardDescription>
                    Fill in the details to list your collectible
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
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
                        <Label htmlFor="price">Your Price (USD) *</Label>
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
                        {/* Average Price Indicator */}
                        <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                          <p className="text-xs text-muted-foreground">
                            💡 <span className="font-medium">Pricing Tip:</span> Use the Card Scanner to see market average prices before setting your price.
                          </p>
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

                      {/* Image Upload */}
                      <div className="sm:col-span-2">
                        <Label>Card Image</Label>
                        <div className="mt-1.5">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                          />
                          {imagePreview ? (
                            <div className="relative w-full max-w-xs">
                              <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="w-full h-48 object-cover rounded-lg border border-border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8"
                                onClick={clearImage}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full max-w-xs h-48 flex flex-col gap-2 border-dashed"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-muted-foreground">Click to upload image</span>
                              <span className="text-xs text-muted-foreground">JPG, PNG, GIF up to 10MB</span>
                            </Button>
                          )}
                        </div>
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

                    {/* Fractional Selling Option */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent">
                        <div className="flex items-center gap-3">
                          <PieChart className="h-5 w-5 text-primary" />
                          <div>
                            <Label className="text-base font-semibold">Sell as Fractional Shares</Label>
                            <p className="text-sm text-muted-foreground">
                              Allow buyers to purchase ownership shares of this card
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={formData.enableFractional}
                          onCheckedChange={(checked) => setFormData({ ...formData, enableFractional: checked })}
                        />
                      </div>

                      {formData.enableFractional && (
                        <div className="p-4 rounded-lg border space-y-4 bg-muted/30">
                          {/* Total Shares */}
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <Label>Total Shares</Label>
                              <span className="text-sm text-muted-foreground">{formData.totalShares} shares</span>
                            </div>
                            <Slider
                              value={[formData.totalShares]}
                              onValueChange={([value]) => setFormData({ ...formData, totalShares: value })}
                              min={10}
                              max={1000}
                              step={10}
                            />
                            {formData.price && (
                              <p className="text-sm text-muted-foreground">
                                Each share = ${(parseFloat(formData.price) / formData.totalShares).toFixed(2)} ({(100/formData.totalShares).toFixed(2)}% ownership)
                              </p>
                            )}
                          </div>

                          {/* Minimum Purchase */}
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <Label>Minimum Purchase</Label>
                              <span className="text-sm text-muted-foreground">{formData.minShares} shares ({(formData.minShares/formData.totalShares*100).toFixed(1)}%)</span>
                            </div>
                            <Slider
                              value={[formData.minShares]}
                              onValueChange={([value]) => setFormData({ ...formData, minShares: value })}
                              min={1}
                              max={Math.min(100, formData.totalShares)}
                              step={1}
                            />
                            {formData.price && (
                              <p className="text-sm text-muted-foreground">
                                Minimum investment: ${((parseFloat(formData.price) / formData.totalShares) * formData.minShares).toFixed(2)}
                              </p>
                            )}
                          </div>

                          {/* Daily Verification */}
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <Shield className="h-5 w-5 text-primary" />
                              <div>
                                <Label className="text-sm">Daily Verification</Label>
                                <p className="text-xs text-muted-foreground">
                                  Upload daily photos to verify ownership
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={formData.dailyVerification}
                              onCheckedChange={(checked) => setFormData({ ...formData, dailyVerification: checked })}
                            />
                          </div>

                          {/* Info Box */}
                          <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10">
                            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-muted-foreground">
                              <p className="font-medium text-foreground mb-1">How fractional selling works:</p>
                              <ul className="list-disc list-inside space-y-0.5">
                                <li>Buyers purchase shares of your card</li>
                                <li>You retain physical possession</li>
                                <li>Daily verification builds trust with investors</li>
                                <li>Get funded faster by allowing smaller investments</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" disabled={submitting || uploading} className="w-full gap-2">
                      {(submitting || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                      {uploading ? 'Uploading Image...' : submitting ? 'Creating...' : formData.enableFractional ? 'Create Fractional Listing' : 'Create Listing'}
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
                          {listing.image_url && (
                            <img 
                              src={listing.image_url} 
                              alt={listing.title}
                              className="w-16 h-16 object-cover rounded-lg mr-4 flex-shrink-0"
                            />
                          )}
                          {!listing.image_url && (
                            <div className="w-16 h-16 bg-secondary rounded-lg mr-4 flex-shrink-0 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            {listing.status === 'active' && (
                              <CreateFractionalDialog
                                listingId={listing.id}
                                itemName={listing.title}
                                totalValue={Number(listing.price)}
                                imageUrl={listing.image_url || undefined}
                              />
                            )}
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewListing(listing.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewListing(listing.id)}
                              >
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
