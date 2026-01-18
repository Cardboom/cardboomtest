import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Vault as VaultIcon, 
  Package, 
  TrendingUp, 
  ExternalLink, 
  Send, 
  Shield, 
  Clock, 
  CheckCircle, 
  Truck,
  Sparkles,
  Lock,
  BarChart3,
  X,
  MapPin,
  Copy,
  Zap
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';
import { formatCategoryName } from '@/lib/categoryFormatter';
import { SendToVaultDialog } from '@/components/SendToVaultDialog';
import { RequestReturnDialog } from '@/components/vault/RequestReturnDialog';
import { VaultToListingWizard } from '@/components/listing/VaultToListingWizard';
import { ListingSuccessModal } from '@/components/listing/ListingSuccessModal';
import { QuickSellOffer } from '@/components/vault/QuickSellOffer';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface VaultItem {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  image_url: string;
  estimated_value: number;
  status: string;
  created_at: string;
  verified_at: string | null;
  order_id: string | null; // If set, this is a purchased item awaiting seller shipment
  listing_id: string | null;
}

// Vault status progression: scanned -> in_transit -> received -> verified -> stored -> released
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  scanned: { label: 'Scanned', color: 'bg-primary/10 text-primary', icon: <Sparkles className="w-3 h-3" /> },
  pending_shipment: { label: 'Awaiting Shipment', color: 'bg-amber-500/10 text-amber-500', icon: <Clock className="w-3 h-3" /> },
  pending_seller_shipment: { label: 'Seller Shipping', color: 'bg-cyan-500/10 text-cyan-500', icon: <Truck className="w-3 h-3" /> },
  in_transit: { label: 'In Transit', color: 'bg-blue-500/10 text-blue-500', icon: <Truck className="w-3 h-3" /> },
  shipped: { label: 'In Transit', color: 'bg-blue-500/10 text-blue-500', icon: <Truck className="w-3 h-3" /> },
  received: { label: 'Received', color: 'bg-purple-500/10 text-purple-500', icon: <Package className="w-3 h-3" /> },
  verified: { label: 'Verified', color: 'bg-teal-500/10 text-teal-500', icon: <CheckCircle className="w-3 h-3" /> },
  stored: { label: 'Stored', color: 'bg-emerald-500/10 text-emerald-500', icon: <VaultIcon className="w-3 h-3" /> },
  released: { label: 'Released', color: 'bg-gray-500/10 text-gray-500', icon: <Package className="w-3 h-3" /> },
  return_requested: { label: 'Return Requested', color: 'bg-orange-500/10 text-orange-500', icon: <Truck className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-500', icon: <X className="w-3 h-3" /> },
};

const WAREHOUSE_ADDRESS = {
  name: 'BRAINBABY BİLİŞİM ANONİM ŞİRKETİ',
  address: 'İran Caddesi 55/9',
  building: '',
  district: 'Gaziosmanpaşa Mahallesi, Çankaya',
  city: 'Ankara, Türkiye',
  postalCode: '06700',
};

const VaultPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendToVaultOpen, setSendToVaultOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [addressDialogItem, setAddressDialogItem] = useState<VaultItem | null>(null);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
  const [showListingWizard, setShowListingWizard] = useState(false);
  const [selectedListingItem, setSelectedListingItem] = useState<VaultItem | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListing, setCreatedListing] = useState<{
    id: string;
    title: string;
    price: number;
    imageUrl?: string | null;
    category: string;
  } | null>(null);

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
    } catch (error) {
      console.error('Error fetching vault items:', error);
      toast.error('Failed to load vault items');
    } finally {
      setLoading(false);
    }
  };

  // Filter out cancelled items for all calculations - single source of truth
  const activeItems = items.filter(i => i.status !== 'cancelled');
  const totalValue = activeItems.reduce((sum, item) => sum + (Number(item.estimated_value) || 0), 0);
  const verifiedItems = activeItems.filter(i => i.status === 'verified');
  const pendingItems = activeItems.filter(i => i.status !== 'verified');

  const filteredItems = activeTab === 'all' ? activeItems : 
    activeTab === 'verified' ? verifiedItems : pendingItems;

  const handleCancelRequest = async (itemId: string) => {
    setCancellingItemId(itemId);
    try {
      const { error } = await supabase
        .from('vault_items')
        .update({ status: 'cancelled' })
        .eq('id', itemId);
      
      if (error) throw error;
      toast.success('Vault request cancelled');
      fetchVaultItems();
    } catch (error) {
      console.error('Error cancelling vault request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setCancellingItemId(null);
    }
  };

  const copyAddress = () => {
    const fullAddress = `${WAREHOUSE_ADDRESS.name}\n${WAREHOUSE_ADDRESS.address}\n${WAREHOUSE_ADDRESS.building}\n${WAREHOUSE_ADDRESS.district}\n${WAREHOUSE_ADDRESS.city} ${WAREHOUSE_ADDRESS.postalCode}`;
    navigator.clipboard.writeText(fullAddress);
    toast.success('Address copied to clipboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <VaultIcon className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading your vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartCount={0} onCartClick={() => {}} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8 md:p-12 mb-8"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="absolute top-4 right-4 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30">
                    <VaultIcon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                      Vault
                    </h1>
                    <p className="text-muted-foreground">
                      Private, secure storage for your collectibles
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-background/50">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Only You Can See
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-background/50">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    Fully Insured
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-background/50">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Free Storage
                  </Badge>
                </div>
              </div>

              <Button 
                size="lg" 
                onClick={() => setSendToVaultOpen(true)} 
                className="gap-2 shadow-lg shadow-primary/20"
              >
                <Send className="h-4 w-4" />
                Send to Vault
              </Button>
            </div>
          </motion.div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/20">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatPrice(totalValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-muted">
                      <Package className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                      <p className="text-2xl font-bold text-foreground">{activeItems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Verified</p>
                      <p className="text-2xl font-bold text-foreground">{verifiedItems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/20">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-foreground">{pendingItems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Grade from Vault CTA */}
          {verifiedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/20">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Grade Your Cards from Vault</h3>
                      <p className="text-sm text-muted-foreground">
                        Get CBGI certification for verified items • 20% off 2nd grading monthly
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/grading')} className="gap-2 shrink-0">
                    <Shield className="w-4 h-4" />
                    Start Grading
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Tabs & Items */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all" className="gap-2">
                <Package className="w-4 h-4" />
                All Items ({activeItems.length})
              </TabsTrigger>
              <TabsTrigger value="verified" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Verified ({verifiedItems.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="p-12 text-center border-dashed">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                      <VaultIcon className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      {activeTab === 'all' ? 'Your Vault is empty' : `No ${activeTab} items`}
                    </h2>
                    <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                      Secure your first card.
                    </p>
                    <p className="text-sm text-muted-foreground/70 mb-6 max-w-md mx-auto flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Only you can see cards in your Vault
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => setSendToVaultOpen(true)} className="gap-2">
                        <Send className="h-4 w-4" />
                        Send Card to Vault
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredItems.map((item, index) => {
                    // Determine the display status: if item has order_id and is pending_shipment, 
                    // it means buyer is waiting for SELLER to ship, not the buyer
                    const isPurchasedItem = !!item.order_id;
                    const displayStatus = (item.status === 'pending_shipment' && isPurchasedItem) 
                      ? 'pending_seller_shipment' 
                      : item.status;
                    const status = statusConfig[displayStatus] || statusConfig.pending_shipment;
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="group overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                          <div className="aspect-[3/4] bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-16 w-16 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Badge className={`absolute top-3 right-3 gap-1 ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </Badge>
                            {isPurchasedItem && item.status !== 'verified' && (
                              <Badge className="absolute top-3 left-3 gap-1 bg-primary/20 text-primary">
                                <Package className="w-3 h-3" />
                                Purchased
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                              <Badge variant="outline" className="text-xs">{formatCategoryName(item.category)}</Badge>
                              <span>•</span>
                              <span>{item.condition}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-lg font-bold text-foreground">
                                {formatPrice(item.estimated_value || 0)}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-4">
                              {(item.status === 'verified' || item.status === 'stored') ? (
                                <div className="space-y-2 w-full">
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="flex-1"
                                      onClick={() => navigate('/grading')}
                                    >
                                      <Shield className="h-4 w-4 mr-1.5" />
                                      Request Grading
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setReturnDialogOpen(true);
                                      }}
                                    >
                                      <Truck className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : item.status === 'pending_shipment' ? (
                                isPurchasedItem ? (
                                  // Purchased item - buyer is waiting for seller to ship
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex-1"
                                    onClick={() => navigate(`/order/${item.order_id}`)}
                                  >
                                    <Truck className="h-4 w-4 mr-1.5" />
                                    Track Order
                                  </Button>
                                ) : (
                                  // User's own item - they need to ship it
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="flex-1"
                                      onClick={() => setAddressDialogItem(item)}
                                    >
                                      <MapPin className="h-4 w-4 mr-1.5" />
                                      View Address
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => handleCancelRequest(item.id)}
                                      disabled={cancellingItemId === item.id}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 opacity-60"
                                  disabled
                                >
                                  {item.status === 'shipped' ? 'In Transit' : 
                                   item.status === 'received' ? 'Pending Verification' : 
                                   item.status === 'return_requested' ? 'Return Pending' :
                                   'Processing'}
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 grid md:grid-cols-3 gap-6"
          >
            <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 border-emerald-500/20">
              <CardContent className="p-6">
                <div className="p-3 rounded-xl bg-emerald-500/10 w-fit mb-4">
                  <Shield className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Fully Insured</h3>
                <p className="text-sm text-muted-foreground">
                  Every item in your vault is insured for its full market value against damage, loss, or theft.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-primary/0 border-primary/20">
              <CardContent className="p-6">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Expert Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Our team authenticates and grades every item, adding trust badges to boost your sales.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/0 border-amber-500/20">
              <CardContent className="p-6">
                <div className="p-3 rounded-xl bg-amber-500/10 w-fit mb-4">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Instant Listings</h3>
                <p className="text-sm text-muted-foreground">
                  List your vault items for sale with one click. We handle photos, shipping, and buyer protection.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <SendToVaultDialog open={sendToVaultOpen} onOpenChange={setSendToVaultOpen} />
      <RequestReturnDialog 
        open={returnDialogOpen} 
        onOpenChange={setReturnDialogOpen} 
        item={selectedItem}
        onSuccess={fetchVaultItems}
      />

      {/* Address Dialog for Pending Shipment Items */}
      <Dialog open={!!addressDialogItem} onOpenChange={(open) => !open && setAddressDialogItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Ship to This Address
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="font-semibold text-foreground">{WAREHOUSE_ADDRESS.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{WAREHOUSE_ADDRESS.address}</p>
              <p className="text-sm text-muted-foreground">{WAREHOUSE_ADDRESS.building}</p>
              <p className="text-sm text-muted-foreground">{WAREHOUSE_ADDRESS.district}</p>
              <p className="text-sm text-muted-foreground">{WAREHOUSE_ADDRESS.city} {WAREHOUSE_ADDRESS.postalCode}</p>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Important:</strong> Include "{addressDialogItem?.title}" and your username on the package.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyAddress} variant="outline" className="flex-1 gap-2">
                <Copy className="h-4 w-4" />
                Copy Address
              </Button>
              <Button 
                variant="destructive" 
                className="gap-2"
                onClick={() => {
                  if (addressDialogItem) {
                    handleCancelRequest(addressDialogItem.id);
                    setAddressDialogItem(null);
                  }
                }}
              >
                <X className="h-4 w-4" />
                Cancel Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vault to Listing Wizard */}
      <VaultToListingWizard
        open={showListingWizard}
        onOpenChange={setShowListingWizard}
        vaultItem={selectedListingItem}
        onSuccess={(listingId) => {
          setCreatedListing({
            id: listingId,
            title: selectedListingItem?.title || '',
            price: selectedListingItem?.estimated_value || 0,
            imageUrl: selectedListingItem?.image_url,
            category: selectedListingItem?.category || 'tcg',
          });
          setShowSuccessModal(true);
          setSelectedListingItem(null);
          fetchVaultItems();
        }}
      />

      {/* Listing Success Modal */}
      <ListingSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        listing={createdListing}
        onListAnother={() => {
          setShowSuccessModal(false);
        }}
      />

      <Footer />
    </div>
  );
};

export default VaultPage;