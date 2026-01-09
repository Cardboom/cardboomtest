import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Vault, Truck, ArrowLeftRight, ShoppingCart, Loader2, MapPin, Package, Wallet, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { usePurchase } from '@/hooks/usePurchase';
import { useGeliverShipping } from '@/hooks/useGeliverShipping';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { WalletTopUpDialog } from '@/components/WalletTopUpDialog';

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    price: number;
    currency?: string;
    seller_id: string;
    allows_vault: boolean;
    allows_shipping: boolean;
    allows_trade: boolean;
    category: string;
    condition: string;
    image_url?: string | null;
  };
}

// Turkish cities
const turkishCities = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 
  'Gaziantep', 'Mersin', 'Diyarbakır', 'Kayseri', 'Eskişehir', 'Samsun',
  'Denizli', 'Şanlıurfa', 'Malatya', 'Trabzon', 'Erzurum', 'Van'
];

export const PurchaseDialog = ({ open, onOpenChange, listing }: PurchaseDialogProps) => {
  const [deliveryOption, setDeliveryOption] = useState<'vault' | 'ship' | 'trade'>('vault');
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
  });
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  
  // Wallet & Gems state
  const [walletBalance, setWalletBalance] = useState(0);
  const [gemBalance, setGemBalance] = useState(0);
  const [useGems, setUseGems] = useState(false);
  const [gemAmount, setGemAmount] = useState(0);
  const [showTopUp, setShowTopUp] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(true);
  
  const { purchase, loading, calculateFeesSync } = usePurchase();
  const { loading: shippingLoading, offers, getShippingPrices } = useGeliverShipping();

  const fees = calculateFeesSync(listing.price);
  const selectedOffer = offers.find(o => o.id === selectedCarrier);
  const shippingCost = selectedOffer?.price || 0;
  
  // Calculate gem discount (1 gem = $0.01)
  const gemDiscountUSD = gemAmount / 100;
  const totalBeforeGems = fees.totalBuyerPays + (deliveryOption === 'ship' ? shippingCost : 0);
  const maxGemsUsable = Math.min(gemBalance, Math.floor(totalBeforeGems * 100));
  const totalAfterGems = Math.max(0, totalBeforeGems - gemDiscountUSD);
  
  const hasEnoughBalance = walletBalance >= totalAfterGems;

  // Fetch wallet and gem balances
  const fetchBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (wallet) {
        setWalletBalance(Number(wallet.balance) || 0);
      }

      // Fetch gem balance
      const { data: gems } = await supabase
        .from('cardboom_points')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (gems) {
        setGemBalance(gems.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchBalances();
    }
  }, [open, fetchBalances]);

  useEffect(() => {
    if (deliveryOption === 'ship') {
      setShowShippingForm(true);
    } else {
      setShowShippingForm(false);
      setSelectedCarrier('');
    }
  }, [deliveryOption]);

  // Reset gem amount when toggling off or when max changes
  useEffect(() => {
    if (!useGems) {
      setGemAmount(0);
    } else {
      setGemAmount(Math.min(gemAmount, maxGemsUsable));
    }
  }, [useGems, maxGemsUsable]);

  const handleGetShippingQuotes = async () => {
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || 
        !shippingAddress.city || !shippingAddress.district || !shippingAddress.postalCode) {
      return;
    }
    await getShippingPrices(shippingAddress, 0.5);
  };

  const handlePurchase = async () => {
    const result = await purchase({
      listingId: listing.id,
      sellerId: listing.seller_id,
      price: listing.price,
      listingCurrency: (listing.currency as 'USD' | 'EUR' | 'TRY') || 'USD',
      deliveryOption,
      title: listing.title,
      category: listing.category,
      condition: listing.condition,
      imageUrl: listing.image_url,
      shippingAddress: deliveryOption === 'ship' ? shippingAddress : undefined,
      gemsUsed: useGems ? gemAmount : 0,
    });

    if (result.success) {
      onOpenChange(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Checkout
            </DialogTitle>
            <DialogDescription>
              Complete your purchase of {listing.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Item Summary */}
            <div className="glass rounded-lg p-4">
              <p className="font-medium text-foreground mb-1">{listing.title}</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(listing.price)}
              </p>
            </div>

            {/* Wallet Balance Section */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="font-medium">Your Balance</span>
                </div>
                {loadingBalances ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className={`font-bold text-lg ${hasEnoughBalance ? 'text-gain' : 'text-loss'}`}>
                    {formatCurrency(walletBalance)}
                  </span>
                )}
              </div>
              
              {!hasEnoughBalance && !loadingBalances && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-loss/10 border border-loss/20">
                  <AlertCircle className="w-4 h-4 text-loss shrink-0" />
                  <p className="text-sm text-loss">
                    Insufficient balance. You need {formatCurrency(totalAfterGems - walletBalance)} more.
                  </p>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={() => setShowTopUp(true)}
              >
                <Plus className="w-4 h-4" />
                Add Funds to Wallet
              </Button>
            </div>

            {/* Gems Discount Section */}
            {gemBalance > 0 && (
              <div className="rounded-xl border border-border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="use-gems"
                      checked={useGems}
                      onCheckedChange={(checked) => {
                        setUseGems(!!checked);
                        if (checked) {
                          setGemAmount(Math.min(maxGemsUsable, Math.floor(totalBeforeGems * 100)));
                        }
                      }}
                    />
                    <Label htmlFor="use-gems" className="flex items-center gap-2 cursor-pointer">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Use CardBoom Gems
                    </Label>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    {gemBalance.toLocaleString()} available
                  </Badge>
                </div>

                {useGems && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Gems to use</span>
                        <span className="font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-primary" />
                          {gemAmount.toLocaleString()} = {formatCurrency(gemDiscountUSD)}
                        </span>
                      </div>
                      <Slider
                        value={[gemAmount]}
                        onValueChange={([value]) => setGemAmount(value)}
                        min={0}
                        max={maxGemsUsable}
                        step={100}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0</span>
                        <span>{maxGemsUsable.toLocaleString()} max</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-gain/10 border border-gain/20">
                      <p className="text-sm font-medium text-gain">
                        💎 Gem Discount: -{formatCurrency(gemDiscountUSD)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delivery Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Delivery Option</Label>
              <RadioGroup
                value={deliveryOption}
                onValueChange={(v) => setDeliveryOption(v as 'vault' | 'ship' | 'trade')}
                className="space-y-2"
              >
                {listing.allows_vault && (
                  <label className="flex items-center gap-3 glass rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="vault" id="vault" />
                    <Vault className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Vault Storage</p>
                      <p className="text-xs text-muted-foreground">
                        Secure storage in our vault
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </label>
                )}

                {listing.allows_shipping && (
                  <label className="flex items-center gap-3 glass rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="ship" id="ship" />
                    <Truck className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Shipping (Turkey)</p>
                      <p className="text-xs text-muted-foreground">
                        Ship via Geliver carriers
                      </p>
                    </div>
                  </label>
                )}

                {listing.allows_trade && (
                  <label className="flex items-center gap-3 glass rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <RadioGroupItem value="trade" id="trade" />
                    <ArrowLeftRight className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Trade Online</p>
                      <p className="text-xs text-muted-foreground">
                        Trade digitally on platform
                      </p>
                    </div>
                  </label>
                )}
              </RadioGroup>
            </div>

            {/* Shipping Form for Turkey */}
            {showShippingForm && (
              <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">Shipping Address (Turkey)</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      placeholder="Ad Soyad"
                      value={shippingAddress.name}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      placeholder="+90 5XX XXX XX XX"
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Address</Label>
                    <Input
                      placeholder="Mahalle, Sokak, No"
                      value={shippingAddress.address}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">City (İl)</Label>
                    <Select
                      value={shippingAddress.city}
                      onValueChange={(v) => setShippingAddress({ ...shippingAddress, city: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Şehir seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {turkishCities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">District (İlçe)</Label>
                    <Input
                      placeholder="İlçe"
                      value={shippingAddress.district}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, district: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Postal Code</Label>
                    <Input
                      placeholder="34XXX"
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2"
                  onClick={handleGetShippingQuotes}
                  disabled={shippingLoading || !shippingAddress.city}
                >
                  {shippingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  Get Shipping Quotes
                </Button>

                {/* Carrier Selection */}
                {offers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Select Carrier</Label>
                    <RadioGroup
                      value={selectedCarrier}
                      onValueChange={setSelectedCarrier}
                      className="space-y-2"
                    >
                      {offers.map((offer) => (
                        <label 
                          key={offer.id} 
                          className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-secondary/30"
                        >
                          <RadioGroupItem value={offer.id} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{offer.carrierName}</p>
                            <p className="text-xs text-muted-foreground">{offer.estimatedDays} days</p>
                          </div>
                          <span className="font-semibold text-sm">
                            {offer.price.toFixed(2)} {offer.currency}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-2 text-sm border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item Price</span>
                <span>{formatCurrency(listing.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buyer Fee (5%)</span>
                <span>{formatCurrency(fees.buyerFee)}</span>
              </div>
              {deliveryOption === 'ship' && shippingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shippingCost.toFixed(2)} TRY</span>
                </div>
              )}
              {useGems && gemAmount > 0 && (
                <div className="flex justify-between text-gain">
                  <span>Gem Discount ({gemAmount.toLocaleString()} gems)</span>
                  <span>-{formatCurrency(gemDiscountUSD)}</span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAfterGems)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Your Balance After</span>
                <span>{formatCurrency(Math.max(0, walletBalance - totalAfterGems))}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 gap-2"
                onClick={handlePurchase}
                disabled={loading || !hasEnoughBalance || (deliveryOption === 'ship' && !selectedCarrier && offers.length > 0)}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Pay {formatCurrency(totalAfterGems)}
                  </>
                )}
              </Button>
            </div>

            {!hasEnoughBalance && (
              <p className="text-xs text-center text-loss">
                Add funds to your wallet to complete this purchase
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <WalletTopUpDialog 
        open={showTopUp} 
        onOpenChange={setShowTopUp}
        onSuccess={fetchBalances}
      />
    </>
  );
};
