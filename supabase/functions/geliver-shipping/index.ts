import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GELIVER_API_BASE = "https://api.geliver.io/api/v1";

interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  country?: string;
}

interface GetPricesRequest {
  senderAddress: ShippingAddress;
  receiverAddress: ShippingAddress;
  packageWeight: number; // in kg
  packageWidth?: number; // in cm
  packageHeight?: number; // in cm
  packageLength?: number; // in cm
}

interface CreateShipmentRequest {
  orderId: string;
  senderAddress: ShippingAddress;
  receiverAddress: ShippingAddress;
  packageWeight: number;
  packageWidth?: number;
  packageHeight?: number;
  packageLength?: number;
  selectedOfferId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GELIVER_API_KEY = Deno.env.get('GELIVER_API_KEY');
    if (!GELIVER_API_KEY) {
      console.error('GELIVER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geliver API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = await req.json().catch(() => ({}));

    console.log(`Geliver shipping action: ${action}`, body);

    // Get balance
    if (action === 'balance') {
      const response = await fetch(`${GELIVER_API_BASE}/prices/get_balance`, {
        headers: {
          'Authorization': `Bearer ${GELIVER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Geliver balance response:', data);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get shipping prices
    if (action === 'prices') {
      const { senderAddress, receiverAddress, packageWeight, packageWidth, packageHeight, packageLength } = body as GetPricesRequest;

      const payload = {
        sender: {
          name: senderAddress.name,
          phone: senderAddress.phone,
          address: senderAddress.address,
          city: senderAddress.city,
          district: senderAddress.district,
          postalCode: senderAddress.postalCode,
          countryCode: "TR",
        },
        receiver: {
          name: receiverAddress.name,
          phone: receiverAddress.phone,
          address: receiverAddress.address,
          city: receiverAddress.city,
          district: receiverAddress.district,
          postalCode: receiverAddress.postalCode,
          countryCode: receiverAddress.country || "TR",
        },
        packages: [{
          weight: packageWeight || 0.5,
          width: packageWidth || 20,
          height: packageHeight || 15,
          length: packageLength || 5,
        }],
      };

      console.log('Requesting Geliver prices with payload:', payload);

      const response = await fetch(`${GELIVER_API_BASE}/prices/list_prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GELIVER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Geliver prices response:', data);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create shipment
    if (action === 'create') {
      const { orderId, senderAddress, receiverAddress, packageWeight, packageWidth, packageHeight, packageLength, selectedOfferId } = body as CreateShipmentRequest;

      const payload = {
        sender: {
          name: senderAddress.name,
          phone: senderAddress.phone,
          address: senderAddress.address,
          city: senderAddress.city,
          district: senderAddress.district,
          postalCode: senderAddress.postalCode,
          countryCode: "TR",
        },
        receiver: {
          name: receiverAddress.name,
          phone: receiverAddress.phone,
          address: receiverAddress.address,
          city: receiverAddress.city,
          district: receiverAddress.district,
          postalCode: receiverAddress.postalCode,
          countryCode: receiverAddress.country || "TR",
        },
        packages: [{
          weight: packageWeight || 0.5,
          width: packageWidth || 20,
          height: packageHeight || 15,
          length: packageLength || 5,
        }],
        reference: orderId,
      };

      console.log('Creating Geliver shipment with payload:', payload);

      // First create shipment to get offers
      const response = await fetch(`${GELIVER_API_BASE}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GELIVER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const shipmentData = await response.json();
      console.log('Geliver shipment created:', shipmentData);

      // If we have offers and a selected offer, accept it
      if (shipmentData.offers && selectedOfferId) {
        const acceptResponse = await fetch(`${GELIVER_API_BASE}/shipments/accept_offer`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GELIVER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shipmentId: shipmentData.id,
            offerId: selectedOfferId,
          }),
        });

        const acceptData = await acceptResponse.json();
        console.log('Geliver offer accepted:', acceptData);

        // Update order with tracking number
        if (acceptData.trackingNumber && orderId) {
          await supabase
            .from('orders')
            .update({ 
              tracking_number: acceptData.trackingNumber,
              status: 'shipped'
            })
            .eq('id', orderId);
        }

        return new Response(
          JSON.stringify({ ...shipmentData, accepted: acceptData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(shipmentData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Track shipment
    if (action === 'track') {
      const shipmentId = url.searchParams.get('shipmentId');
      if (!shipmentId) {
        return new Response(
          JSON.stringify({ error: 'shipmentId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch(`${GELIVER_API_BASE}/shipments/${shipmentId}`, {
        headers: {
          'Authorization': `Bearer ${GELIVER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Geliver tracking response:', data);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: balance, prices, create, or track' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Geliver shipping error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
