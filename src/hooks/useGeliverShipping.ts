import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  country?: string;
}

interface ShippingOffer {
  id: string;
  carrierName: string;
  price: number;
  currency: string;
  estimatedDays: string;
  serviceName: string;
}

interface ShippingQuote {
  offers: ShippingOffer[];
}

export const useGeliverShipping = () => {
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<ShippingOffer[]>([]);

  // CardBoom warehouse address in Ankara
  const senderAddress: ShippingAddress = {
    name: 'BRAINBABY BİLİŞİM ANONİM ŞİRKETİ',
    phone: '+905001234567', // Replace with actual phone
    address: 'İran Caddesi 55/9, Gaziosmanpaşa Mahallesi',
    city: 'Ankara',
    district: 'Çankaya',
    postalCode: '06700',
  };

  const getShippingPrices = async (receiverAddress: ShippingAddress, packageWeight: number = 0.5) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geliver-shipping?action=prices', {
        body: {
          senderAddress,
          receiverAddress,
          packageWeight,
          packageWidth: 20,
          packageHeight: 15,
          packageLength: 5,
        },
      });

      if (error) throw error;
      
      // Parse offers from Geliver response
      const parsedOffers: ShippingOffer[] = (data?.offers || []).map((offer: any) => ({
        id: offer.id || offer.offerId,
        carrierName: offer.carrierName || offer.carrier?.name || 'Unknown Carrier',
        price: offer.price || offer.totalPrice || 0,
        currency: offer.currency || 'TRY',
        estimatedDays: offer.estimatedDays || offer.deliveryTime || '2-5',
        serviceName: offer.serviceName || offer.service?.name || 'Standard',
      }));

      setOffers(parsedOffers);
      return parsedOffers;
    } catch (error) {
      toast.error('Failed to get shipping prices');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createShipment = async (
    orderId: string,
    receiverAddress: ShippingAddress,
    selectedOfferId?: string,
    packageWeight: number = 0.5
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('geliver-shipping?action=create', {
        body: {
          orderId,
          senderAddress,
          receiverAddress,
          packageWeight,
          packageWidth: 20,
          packageHeight: 15,
          packageLength: 5,
          selectedOfferId,
        },
      });

      if (error) throw error;

      toast.success('Shipping label created successfully');
      return data;
    } catch (error) {
      toast.error('Failed to create shipment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (shipmentId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(`geliver-shipping?action=track&shipmentId=${shipmentId}`, {
        body: {},
      });

      if (error) throw error;

      return data;
    } catch (error) {
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('geliver-shipping?action=balance', {
        body: {},
      });

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  };

  return {
    loading,
    offers,
    getShippingPrices,
    createShipment,
    trackShipment,
    getBalance,
    senderAddress,
  };
};
