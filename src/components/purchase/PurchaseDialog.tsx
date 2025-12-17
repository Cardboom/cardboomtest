import { useState, useEffect } from 'react';
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
import { Vault, Truck, ArrowLeftRight, ShoppingCart, Loader2, MapPin, Package } from 'lucide-react';
import { usePurchase } from '@/hooks/usePurchase';
import { useGeliverShipping } from '@/hooks/useGeliverShipping';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    title: string;
    price: number;
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
  
  const { purchase, loading, calculateFeesSync } = usePurchase();
  const { loading: shippingLoading, offers, getShippingPrices } = useGeliverShipping();

  const fees = calculateFeesSync(listing.price);
  const selectedOffer = offers.find(o => o.id === selectedCarrier);
  const shippingCost = selectedOffer?.price || 0;
  const totalWithShipping = fees.totalBuyerPays + (deliveryOption === 'ship' ? shippingCost : 0);

  useEffect(() => {
    if (deliveryOption === 'ship') {
      setShowShippingForm(true);
    } else {
      setShowShippingForm(false);
      setSelectedCarrier('');
    }
  }, [deliveryOption]);

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
      deliveryOption,
      title: listing.title,
      category: listing.category,
      condition: listing.condition,
      imageUrl: listing.image_url,
      shippingAddress: deliveryOption === 'ship' ? shippingAddress : undefined,
    });

    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Confirm Purchase
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
              ${listing.price.toLocaleString()}
            </p>
          </div>

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
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Price</span>
              <span>${listing.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyer Fee (5%)</span>
              <span>${fees.buyerFee.toFixed(2)}</span>
            </div>
            {deliveryOption === 'ship' && shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shippingCost.toFixed(2)} TRY</span>
              </div>
            )}
            <div className="h-px bg-border" />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-primary">${totalWithShipping.toFixed(2)}</span>
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
              disabled={loading || (deliveryOption === 'ship' && !selectedCarrier && offers.length > 0)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Pay ${totalWithShipping.toFixed(2)}
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Payment will be deducted from your wallet balance
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
