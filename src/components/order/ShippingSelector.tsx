import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle2, 
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useGeliverShipping } from '@/hooks/useGeliverShipping';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  country?: string;
}

interface ShippingSelectorProps {
  orderId: string;
  shippingAddress: ShippingAddress | null;
  isSeller: boolean;
  onShipmentCreated?: () => void;
}

export function ShippingSelector({ 
  orderId, 
  shippingAddress, 
  isSeller,
  onShipmentCreated 
}: ShippingSelectorProps) {
  const { formatPrice } = useCurrency();
  const { loading, offers, getShippingPrices, createShipment } = useGeliverShipping();
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch shipping offers when component mounts and address is available
  useEffect(() => {
    if (shippingAddress && !hasLoadedOnce) {
      loadOffers();
    }
  }, [shippingAddress]);

  const loadOffers = async () => {
    if (!shippingAddress) {
      setError('No shipping address available');
      return;
    }
    
    setError(null);
    try {
      const result = await getShippingPrices(shippingAddress);
      if (result.length === 0) {
        setError('No shipping options available for this address');
      }
      setHasLoadedOnce(true);
    } catch (err) {
      setError('Failed to load shipping options');
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedOffer || !shippingAddress) return;
    
    setIsCreating(true);
    try {
      const result = await createShipment(orderId, shippingAddress, selectedOffer);
      
      if (result?.shipmentId) {
        // Update order with tracking info
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            tracking_number: result.trackingNumber || result.shipmentId,
            status: 'shipped',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        if (updateError) throw updateError;

        // Log action
        await supabase.rpc('log_order_action', {
          p_order_id: orderId,
          p_action_type: 'shipped',
          p_actor_id: (await supabase.auth.getUser()).data.user?.id || '',
          p_actor_type: 'user',
          p_details: { 
            carrier: offers.find(o => o.id === selectedOffer)?.carrierName,
            trackingNumber: result.trackingNumber || result.shipmentId
          },
        });

        toast.success('Shipment created successfully!');
        onShipmentCreated?.();
      }
    } catch (err) {
      toast.error('Failed to create shipment');
    } finally {
      setIsCreating(false);
    }
  };

  if (!shippingAddress) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Shipping Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              No shipping address provided for this order.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Shipping Options
          </CardTitle>
          {hasLoadedOnce && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={loadOffers}
              disabled={loading}
              className="h-8 px-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {loading && !hasLoadedOnce && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadOffers}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Offers List */}
        {!loading && offers.length > 0 && (
          <div className="space-y-2">
            {offers.map((offer) => (
              <button
                key={offer.id}
                onClick={() => isSeller && setSelectedOffer(offer.id)}
                disabled={!isSeller}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 border rounded-lg transition-all text-left ${
                  selectedOffer === offer.id 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border hover:border-primary/50'
                } ${!isSeller ? 'cursor-default opacity-75' : 'cursor-pointer'}`}
              >
                {/* Carrier Icon */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedOffer === offer.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                {/* Carrier Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm sm:text-base truncate">
                      {offer.carrierName}
                    </p>
                    {offer.serviceName && offer.serviceName !== offer.carrierName && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {offer.serviceName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{offer.estimatedDays} days</span>
                  </div>
                </div>

                {/* Price & Selection */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-bold text-sm sm:text-base ${
                    selectedOffer === offer.id ? 'text-primary' : ''
                  }`}>
                    {formatPrice(offer.price)}
                  </span>
                  {selectedOffer === offer.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Offers State */}
        {!loading && hasLoadedOnce && offers.length === 0 && !error && (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No shipping options available
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadOffers}
              className="mt-3"
            >
              Refresh Options
            </Button>
          </div>
        )}

        {/* Create Shipment Button - Only for Seller */}
        {isSeller && selectedOffer && (
          <Button 
            onClick={handleCreateShipment}
            disabled={isCreating}
            className="w-full"
            size="lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Shipment...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4 mr-2" />
                Create Shipment
              </>
            )}
          </Button>
        )}

        {/* Info for Buyer */}
        {!isSeller && offers.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              The seller will select and create the shipment
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
