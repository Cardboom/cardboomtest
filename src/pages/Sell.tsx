import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { Plus, Package, Vault, Truck, ArrowLeftRight, Pencil, Trash2, Eye, Upload, X, Loader2, Image as ImageIcon, PieChart, Search, Shield, Info, Zap, DollarSign, Sparkles, Camera } from 'lucide-react';
import { CardScanner } from '@/components/CardScanner';
import { CardPricingIntelligence } from '@/components/CardPricingIntelligence';
import { CardScannerUpload } from '@/components/CardScannerUpload';
import { toast } from 'sonner';
import { CreateCollectiveDialog } from '@/components/collective';
import { useAchievementTriggers } from '@/hooks/useAchievementTriggers';
import { useCardAnalysis, CardAnalysis } from '@/hooks/useCardAnalysis';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { BulkImportDialog } from '@/components/seller/BulkImportDialog';
import { BulkImageImportDialog } from '@/components/seller/BulkImageImportDialog';
import { SmartPriceSuggestion } from '@/components/listing/SmartPriceSuggestion';
import { ListingSuccessModal } from '@/components/listing/ListingSuccessModal';
import { VaultToListingWizard } from '@/components/listing/VaultToListingWizard';
import { CardReviewModal, ReviewedCardData } from '@/components/card-scan/CardReviewModal';
import { useCardIndexer } from '@/hooks/useCardIndexer';
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
  const location = useLocation();
  const { checkListingAchievements } = useAchievementTriggers();
  const { analysis, isAnalyzing, analyzeImage, clearAnalysis } = useCardAnalysis();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [instantSelling, setInstantSelling] = useState(false);
  const [showInstantSellDialog, setShowInstantSellDialog] = useState(false);
  const [instantSellData, setInstantSellData] = useState<{
    title: string;
    category: string;
    condition: string;
    marketPrice: number;
    instantPrice: number;
    imageUrl: string | null;
  } | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListing, setCreatedListing] = useState<{
    id: string;
    title: string;
    price: number;
    imageUrl?: string | null;
    category: string;
  } | null>(null);
  const [showVaultWizard, setShowVaultWizard] = useState(false);
  const [selectedVaultItem, setSelectedVaultItem] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showAIScanner, setShowAIScanner] = useState(true);
  const [scannedAnalysis, setScannedAnalysis] = useState<CardAnalysis | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewedCardData, setReviewedCardData] = useState<ReviewedCardData | null>(null);
  const { createListing } = useCardIndexer();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'nba',
    condition: 'Near Mint',
    price: '',
    setName: '',
    setCode: '',
    cardNumber: '',
    rarity: '',
    language: 'English',
    allowsVault: true,
    allowsTrade: true,
    allowsShipping: true,
    enableFractional: false,
    totalShares: 100,
    minShares: 10,
    dailyVerification: true,
    boostTier: 'none' as 'none' | '24h' | '7d' | 'top_category',
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
      fetchListings();
    };
    checkAuth();
  }, [navigate]);

  // Handle vault-to-listing navigation
  useEffect(() => {
    const state = location.state as { fromVault?: boolean; vaultItem?: any } | null;
    if (state?.fromVault && state?.vaultItem) {
      setSelectedVaultItem(state.vaultItem);
      setShowVaultWizard(true);
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      
      // Trigger AI analysis
      const result = await analyzeImage(base64);
      
      // Auto-fill form if card was detected
      if (result?.detected) {
        setFormData(prev => ({
          ...prev,
          title: result.cardName || prev.title,
          category: result.category || prev.category,
          condition: result.estimatedCondition || prev.condition,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    clearAnalysis();
    setScannedAnalysis(null);
    setShowAIScanner(true);
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

      // Prepare card data for indexing - use reviewed data if available
      const cardData = reviewedCardData ? {
        cardName: reviewedCardData.cardName,
        cardNameEnglish: reviewedCardData.cardNameEnglish,
        category: reviewedCardData.category || formData.category,
        setName: reviewedCardData.setName || formData.setName,
        setCode: reviewedCardData.setCode || formData.setCode,
        cardNumber: reviewedCardData.cardNumber || formData.cardNumber,
        rarity: reviewedCardData.rarity || formData.rarity,
        language: reviewedCardData.language || formData.language,
        confidence: reviewedCardData.confidence || 0,
        cviKey: reviewedCardData.cviKey,
      } : {
        cardName: formData.title,
        cardNameEnglish: formData.title,
        category: formData.category,
        setName: formData.setName,
        setCode: formData.setCode,
        cardNumber: formData.cardNumber,
        rarity: formData.rarity,
        language: formData.language,
        confidence: 0,
        cviKey: formData.setCode && formData.cardNumber 
          ? `${formData.category}|${formData.setCode}|${formData.cardNumber}|${formData.language}`
          : null,
      };

      // Use the card indexer to create listing linked to market_items
      const { listing: listingData, marketItem } = await createListing({
        userId: session.user.id,
        cardData,
        imageUrl: imageUrl || undefined,
        price,
        condition: formData.condition,
        description: formData.description,
        allowsVault: formData.allowsVault,
        allowsTrade: formData.allowsTrade,
        allowsShipping: formData.allowsShipping,
      });

      if (!listingData) throw new Error('Failed to create listing');

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

      // Check listing achievements
      try {
        await checkListingAchievements(session.user.id);
      } catch (achievementError) {
        console.error('Error checking achievements:', achievementError);
      }

      // Show success modal instead of toast
      setCreatedListing({
        id: listingData.id,
        title: formData.title,
        price: price,
        imageUrl: imageUrl,
        category: formData.category,
      });
      setShowSuccessModal(true);

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'nba',
        condition: 'Near Mint',
        price: '',
        setName: '',
        setCode: '',
        cardNumber: '',
        rarity: '',
        language: 'English',
        allowsVault: true,
        allowsTrade: true,
        allowsShipping: true,
        enableFractional: false,
        totalShares: 100,
        minShares: 10,
        dailyVerification: true,
        boostTier: 'none',
      });
      clearImage();
      fetchListings();
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
      setSelectedListings(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      fetchListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedListings.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedListings.size} listing(s)?`)) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .in('id', Array.from(selectedListings));

      if (error) throw error;
      toast.success(`${selectedListings.size} listing(s) deleted`);
      setSelectedListings(new Set());
      fetchListings();
    } catch (error) {
      console.error('Error bulk deleting listings:', error);
      toast.error('Failed to delete listings');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectListing = (id: string) => {
    setSelectedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedListings.size === listings.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(listings.map(l => l.id)));
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

  // Prepare instant sell with current form data
  const prepareInstantSell = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title for the card');
      return;
    }

    const price = parseFloat(formData.price);
    if (!price || price <= 0) {
      toast.error('Please enter the market price first');
      return;
    }

    const instantPrice = Math.round(price * 0.80 * 100) / 100; // 80% of market price
    
    setInstantSellData({
      title: formData.title,
      category: formData.category,
      condition: formData.condition,
      marketPrice: price,
      instantPrice: instantPrice,
      imageUrl: imagePreview,
    });
    setShowInstantSellDialog(true);
  };

  // Execute instant sell to CardBoom
  const executeInstantSell = async () => {
    if (!instantSellData) return;

    setInstantSelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (walletError || !wallet) {
        throw new Error('Wallet not found. Please contact support.');
      }

      // Upload image if exists
      let uploadedImageUrl = instantSellData.imageUrl;
      if (imageFile) {
        uploadedImageUrl = await uploadImage(session.user.id);
      }

      // Generate idempotency key
      const idempotencyKey = `instant_sell_${session.user.id}_${Date.now()}`;

      // Convert to cents for ledger
      const amountCents = Math.round(instantSellData.instantPrice * 100);

      // Post ledger entry to credit seller (using 'sale' type for instant sales)
      const { data: ledgerEntry, error: ledgerError } = await supabase.rpc('post_ledger_entry', {
        p_wallet_id: wallet.id,
        p_delta_cents: amountCents,
        p_currency: 'USD',
        p_entry_type: 'sale',
        p_reference_type: 'instant_sale',
        p_reference_id: null,
        p_description: `Instant sale to CardBoom: ${instantSellData.title}`,
        p_idempotency_key: idempotencyKey,
      });

      if (ledgerError) {
        console.error('Ledger error:', ledgerError);
        throw new Error('Failed to process payment. Please try again.');
      }

      // Create a vault item record for CardBoom's inventory (optional tracking)
      const { error: vaultError } = await supabase
        .from('vault_items')
        .insert({
          owner_id: session.user.id, // Will be transferred to system account
          title: `[CardBoom Inventory] ${instantSellData.title}`,
          description: `Instant purchase from seller at $${instantSellData.instantPrice.toFixed(2)} (80% of $${instantSellData.marketPrice.toFixed(2)})`,
          category: instantSellData.category,
          condition: instantSellData.condition,
          estimated_value: instantSellData.marketPrice,
          image_url: uploadedImageUrl,
        });

      if (vaultError) {
        console.error('Vault item creation failed:', vaultError);
        // Non-critical - payment already processed
      }

      toast.success(`Sold! $${instantSellData.instantPrice.toFixed(2)} has been added to your wallet.`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'nba',
        condition: 'Near Mint',
        price: '',
        setName: '',
        setCode: '',
        cardNumber: '',
        rarity: '',
        language: 'English',
        allowsVault: true,
        allowsTrade: true,
        allowsShipping: true,
        enableFractional: false,
        totalShares: 100,
        minShares: 10,
        dailyVerification: true,
        boostTier: 'none',
      });
      clearImage();
      setShowInstantSellDialog(false);
      setInstantSellData(null);

      // Check achievements
      try {
        await checkListingAchievements(session.user.id);
      } catch (achievementError) {
        console.error('Error checking achievements:', achievementError);
      }

    } catch (error: any) {
      console.error('Error executing instant sell:', error);
      toast.error(error.message || 'Failed to complete instant sale');
    } finally {
      setInstantSelling(false);
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

            {/* AI Scanner Upload Section */}
            {activeTab === 'create' && showAIScanner && !imagePreview && (
              <div className="mb-6">
              <CardScannerUpload
                  mode="sell"
                  onScanComplete={(scanAnalysis, file, previewUrl) => {
                    setScannedAnalysis(scanAnalysis);
                    setImageFile(file);
                    setImagePreview(previewUrl);
                    setShowAIScanner(false);
                    
                    // Always show review modal for user verification
                    if (scanAnalysis.detected) {
                      // Pre-fill pricing if available
                      if (scanAnalysis.pricing?.medianSold) {
                        setFormData(prev => ({
                          ...prev,
                          price: scanAnalysis.pricing?.medianSold?.toFixed(2) || prev.price,
                          condition: scanAnalysis.estimatedCondition || prev.condition,
                        }));
                      }
                      // Always show review modal so user can verify/edit before form is filled
                      setShowReviewModal(true);
                    }
                  }}
                  onSkip={() => setShowAIScanner(false)}
                />
              </div>
            )}

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
                  {/* AI Identified Badge */}
                  {scannedAnalysis?.detected && (
                    <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">AI Identified</span>
                        {formData.title && (
                          <span className="text-sm text-muted-foreground">• {formData.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={scannedAnalysis.confidence >= 0.75 ? "default" : "secondary"}>
                          {Math.round(scannedAnalysis.confidence * 100)}% confidence
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setShowReviewModal(true)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                  
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
                      </div>

                      {/* Smart Price Suggestions */}
                      {formData.title.length >= 3 && (
                        <div className="sm:col-span-2">
                          <SmartPriceSuggestion
                            itemName={formData.title}
                            category={formData.category}
                            condition={formData.condition}
                            currentPrice={formData.price ? parseFloat(formData.price) : undefined}
                            onPriceSelect={(price) => setFormData({ ...formData, price: price.toFixed(2) })}
                          />
                        </div>
                      )}

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

                      {/* AI Pricing Intelligence */}
                      {(imagePreview || isAnalyzing) && (
                        <div className="sm:col-span-2">
                          <CardPricingIntelligence
                            analysis={analysis}
                            isLoading={isAnalyzing}
                            userId={userId}
                            onAutoList={(price) => {
                              setFormData(prev => ({ ...prev, price: price.toString() }));
                              toast.success(`Price set to $${price.toFixed(2)}`);
                            }}
                            onApplyPrice={(price) => {
                              setFormData(prev => ({ ...prev, price: price.toString() }));
                              toast.success(`Price applied: $${price.toFixed(2)}`);
                            }}
                          />
                        </div>
                      )}
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

                    <div className="flex flex-col gap-3">
                      <Button type="submit" disabled={submitting || uploading} className="w-full gap-2">
                        {(submitting || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
                        {uploading ? 'Uploading Image...' : submitting ? 'Creating...' : formData.enableFractional ? 'Create Fractional Listing' : 'Create Listing'}
                      </Button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">or</span>
                        </div>
                      </div>

                      {/* Instant Sell to CardBoom Option */}
                      <Button 
                        type="button" 
                        variant="outline"
                        disabled={instantSelling || !formData.title || !formData.price}
                        onClick={prepareInstantSell}
                        className="w-full gap-2 border-gold/50 bg-gradient-to-r from-gold/10 to-transparent hover:from-gold/20 hover:border-gold"
                      >
                        <Zap className="h-4 w-4 text-gold" />
                        <span>Instant Sell to CardBoom @ 80%</span>
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Get paid instantly! We buy your card at 80% of market price - no waiting for buyers.
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="listings">
              {/* Bulk Import Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">Your Listings</h3>
                  {listings.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedListings.size === listings.length && listings.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                        Select All ({selectedListings.size}/{listings.length})
                      </Label>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedListings.size > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                    >
                      {bulkDeleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete {selectedListings.size} Selected
                    </Button>
                  )}
                  <BulkImageImportDialog onImportComplete={fetchListings} />
                  <BulkImportDialog onImportComplete={fetchListings} />
                </div>
              </div>

              {listings.length === 0 ? (
                <Card className="p-12 text-center">
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    No listings yet
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Create your first listing or use bulk import to add multiple cards at once.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={() => setActiveTab('create')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Listing
                    </Button>
                    <BulkImageImportDialog onImportComplete={fetchListings} />
                    <BulkImportDialog onImportComplete={fetchListings} />
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <Card key={listing.id} className={selectedListings.has(listing.id) ? 'ring-2 ring-primary' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedListings.has(listing.id)}
                            onCheckedChange={() => toggleSelectListing(listing.id)}
                            className="mt-1"
                          />
                          <div className="flex items-start justify-between flex-1">
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
                                <CreateCollectiveDialog
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

      {/* Instant Sell Confirmation Dialog */}
      <Dialog open={showInstantSellDialog} onOpenChange={setShowInstantSellDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-gold" />
              Instant Sell to CardBoom
            </DialogTitle>
            <DialogDescription>
              Sell your card instantly at 80% of market price. Funds will be credited to your wallet immediately.
            </DialogDescription>
          </DialogHeader>
          
          {instantSellData && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center gap-4">
                  {instantSellData.imageUrl && (
                    <img 
                      src={instantSellData.imageUrl} 
                      alt={instantSellData.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{instantSellData.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {instantSellData.category.toUpperCase()} • {instantSellData.condition}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Market Price</span>
                    <span className="font-medium">${instantSellData.marketPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CardBoom Rate (80%)</span>
                    <span className="text-muted-foreground">×0.80</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">You Receive</span>
                    <span className="font-bold text-lg text-gain">${instantSellData.instantPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-gold/10 border border-gold/20">
                <Shield className="h-5 w-5 text-gold flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Your wallet will be credited immediately upon confirmation. This sale cannot be reversed.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setShowInstantSellDialog(false)}
              disabled={instantSelling}
            >
              Cancel
            </Button>
            <Button 
              onClick={executeInstantSell}
              disabled={instantSelling}
              className="gap-2 bg-gradient-to-r from-gold to-gold/80 text-background hover:from-gold/90"
            >
              {instantSelling && <Loader2 className="h-4 w-4 animate-spin" />}
              {instantSelling ? 'Processing...' : `Sell for $${instantSellData?.instantPrice.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Listing Success Modal */}
      <ListingSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        listing={createdListing}
        onListAnother={() => {
          setShowSuccessModal(false);
          setActiveTab('create');
        }}
      />

      {/* Vault to Listing Wizard */}
      <VaultToListingWizard
        open={showVaultWizard}
        onOpenChange={setShowVaultWizard}
        vaultItem={selectedVaultItem}
        onSuccess={(listingId) => {
          setCreatedListing({
            id: listingId,
            title: selectedVaultItem?.title || '',
            price: parseFloat(selectedVaultItem?.estimated_value) || 0,
            imageUrl: selectedVaultItem?.image_url,
            category: selectedVaultItem?.category || 'tcg',
          });
          setShowSuccessModal(true);
          setSelectedVaultItem(null);
          fetchListings();
        }}
      />

      {/* Card Review Modal */}
      <CardReviewModal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        analysis={scannedAnalysis}
        imagePreview={imagePreview}
        onConfirm={(reviewedData) => {
          setReviewedCardData(reviewedData);
          setFormData(prev => ({
            ...prev,
            title: reviewedData.cardNameEnglish || reviewedData.cardName,
            category: reviewedData.category,
            setName: reviewedData.setName,
            setCode: reviewedData.setCode,
            cardNumber: reviewedData.cardNumber,
            rarity: reviewedData.rarity,
            language: reviewedData.language,
          }));
          setShowReviewModal(false);
          toast.success('Card details confirmed! Complete your listing.');
        }}
      />

      <Footer />
    </div>
  );
};

export default SellPage;
