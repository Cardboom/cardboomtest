import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, 
  Package, 
  MapPin,
  Loader2,
  CheckCircle2,
  Home,
  Building2,
  Briefcase,
  Plus,
  Edit2,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SavedAddress {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postal_code: string | null;
  is_default: boolean;
}

interface DeliveryOptionsCardProps {
  orderId: string;
  currentDeliveryOption: string;
  currentShippingAddress: any;
  isBuyer: boolean;
  hasTracking: boolean;
  orderStatus: string;
}

const VAULT_ADDRESS = {
  name: 'CardBoom Verification Hub',
  address: 'Secure Vault Facility',
  city: 'Ankara',
  district: 'Hub Center',
  phone: 'N/A',
  postalCode: '06000'
};

export function DeliveryOptionsCard({
  orderId,
  currentDeliveryOption,
  currentShippingAddress,
  isBuyer,
  hasTracking,
  orderStatus,
}: DeliveryOptionsCardProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState<'vault' | 'ship'>(
    currentDeliveryOption === 'vault' ? 'vault' : 'ship'
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
  });

  // Can edit if buyer, not shipped yet, and order not completed
  // Allow editing during disputes so buyer can still provide address or choose vault
  const canEdit = isBuyer && !hasTracking && !['completed', 'shipped', 'delivered', 'refunded'].includes(orderStatus);

  // Fetch saved addresses
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['user-addresses-order'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SavedAddress[];
    },
    enabled: isBuyer,
  });

  // Auto-select default address when editing starts
  useEffect(() => {
    if (isEditing && savedAddresses.length > 0) {
      const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
      setSelectedAddressId(defaultAddr.id);
    }
  }, [isEditing, savedAddresses]);

  // Update delivery option mutation
  const updateDeliveryMutation = useMutation({
    mutationFn: async () => {
      let shippingAddress = null;

      if (deliveryOption === 'ship') {
        if (showNewAddressForm) {
          // Validate new address
          if (!newAddress.name || !newAddress.phone || !newAddress.address || !newAddress.city || !newAddress.district) {
            throw new Error('Please fill in all required address fields');
          }
          shippingAddress = newAddress;

          // Optionally save the new address
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('user_addresses').insert({
              user_id: user.id,
              label: 'home',
              full_name: newAddress.name,
              phone: newAddress.phone,
              address: newAddress.address,
              city: newAddress.city,
              district: newAddress.district,
              postal_code: newAddress.postalCode || null,
              is_default: savedAddresses.length === 0,
            });
          }
        } else {
          // Use selected saved address
          const selected = savedAddresses.find(a => a.id === selectedAddressId);
          if (!selected) {
            throw new Error('Please select an address');
          }
          shippingAddress = {
            name: selected.full_name,
            phone: selected.phone,
            address: selected.address,
            city: selected.city,
            district: selected.district,
            postalCode: selected.postal_code || '',
          };
        }
      }

      const { error } = await supabase
        .from('orders')
        .update({
          delivery_option: deliveryOption,
          shipping_address: shippingAddress,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_order_action', {
        p_order_id: orderId,
        p_action_type: 'delivery_option_changed',
        p_actor_id: (await supabase.auth.getUser()).data.user?.id || null,
        p_actor_type: 'user',
        p_details: { 
          new_delivery_option: deliveryOption,
          has_address: !!shippingAddress
        },
      });
    },
    onSuccess: () => {
      toast.success('Delivery option updated!');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getLabelIcon = (label: string) => {
    switch (label) {
      case 'home': return Home;
      case 'work': return Briefcase;
      case 'office': return Building2;
      default: return MapPin;
    }
  };

  if (!isBuyer) {
    // Show read-only view for seller
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Delivery Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentDeliveryOption === 'vault' ? (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-medium">Vault Delivery</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ship to: CardBoom Verification Hub, Ankara
              </p>
            </div>
          ) : currentShippingAddress ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium">{currentShippingAddress.name}</p>
              <p>{currentShippingAddress.address}</p>
              <p>{currentShippingAddress.district}, {currentShippingAddress.city}</p>
              {currentShippingAddress.postalCode && <p>{currentShippingAddress.postalCode}</p>}
              {currentShippingAddress.phone && (
                <p className="text-muted-foreground">{currentShippingAddress.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Buyer hasn't provided shipping address yet.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!isEditing) {
    // Read-only view for buyer
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Delivery Option
            </CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-1" />
                Change
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentDeliveryOption === 'vault' ? (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">Vault Storage</p>
                  <p className="text-sm text-muted-foreground">
                    Item will be stored in CardBoom Vault for secure verification
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="mt-3">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Secure & Verified
              </Badge>
            </div>
          ) : (
            <div className="p-4 bg-muted/50 border rounded-lg">
              <div className="flex items-center gap-3">
                <Truck className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">Ship to My Address</p>
                  {currentShippingAddress ? (
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>{currentShippingAddress.name}</p>
                      <p>{currentShippingAddress.address}, {currentShippingAddress.city}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No address set</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Edit mode
  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Choose Delivery Option
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={deliveryOption}
          onValueChange={(v) => setDeliveryOption(v as 'vault' | 'ship')}
          className="space-y-3"
        >
          {/* Vault Option */}
          <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            deliveryOption === 'vault' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}>
            <RadioGroupItem value="vault" className="mt-1" />
            <Package className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Vault Verification</p>
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Seller ships to our secure vault for verification. You can request shipping to your address later.
              </p>
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                <p className="text-muted-foreground">
                  📍 CardBoom Verification Hub, Ankara, Turkey
                </p>
              </div>
            </div>
          </label>

          {/* Ship Option */}
          <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            deliveryOption === 'ship' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}>
            <RadioGroupItem value="ship" className="mt-1" />
            <Truck className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Ship Directly to Me</p>
              <p className="text-sm text-muted-foreground mt-1">
                Seller ships directly to your address.
              </p>
            </div>
          </label>
        </RadioGroup>

        {/* Address Selection - only show when ship is selected */}
        {deliveryOption === 'ship' && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Shipping Address</Label>
              
              {savedAddresses.length > 0 && !showNewAddressForm && (
                <RadioGroup
                  value={selectedAddressId}
                  onValueChange={setSelectedAddressId}
                  className="space-y-2"
                >
                  {savedAddresses.map((addr) => {
                    const LabelIcon = getLabelIcon(addr.label);
                    return (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddressId === addr.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={addr.id} className="mt-0.5" />
                        <LabelIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{addr.full_name}</span>
                            {addr.is_default && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">{addr.address}</p>
                          <p className="text-muted-foreground">{addr.district}, {addr.city}</p>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              )}

              {!showNewAddressForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewAddressForm(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {savedAddresses.length > 0 ? 'Use Different Address' : 'Add Address'}
                </Button>
              )}

              {showNewAddressForm && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">New Address</Label>
                    {savedAddresses.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowNewAddressForm(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Input
                        placeholder="Full Name *"
                        value={newAddress.name}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Phone Number *"
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Street Address *"
                        value={newAddress.address}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <Input
                      placeholder="City *"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                    />
                    <Input
                      placeholder="District *"
                      value={newAddress.district}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                    />
                    <div className="col-span-2">
                      <Input
                        placeholder="Postal Code (optional)"
                        value={newAddress.postalCode}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateDeliveryMutation.mutate()}
            disabled={updateDeliveryMutation.isPending || (deliveryOption === 'ship' && !selectedAddressId && !showNewAddressForm)}
            className="flex-1"
          >
            {updateDeliveryMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
