import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Geliver API base URL from docs
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

interface CreateShipmentRequest {
  orderId: string;
  senderAddress: ShippingAddress;
  receiverAddress: ShippingAddress;
  packageWeight: number;
  packageWidth?: number;
  packageHeight?: number;
  packageLength?: number;
  providerServiceCode?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GELIVER_API_KEY = Deno.env.get('GELIVER_API_KEY');
    const GELIVER_ORG_ID = Deno.env.get('GELIVER_ORGANIZATION_ID');
    
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

    const headers = {
      'Authorization': `Bearer ${GELIVER_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Get balance - requires organization ID
    if (action === 'balance') {
      if (!GELIVER_ORG_ID) {
        return new Response(
          JSON.stringify({ error: 'GELIVER_ORGANIZATION_ID not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const endpoint = `${GELIVER_API_BASE}/organizations/${GELIVER_ORG_ID}/balance`;
      console.log(`Fetching balance from: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const rawText = await response.text();
      console.log(`Geliver balance response [${response.status}]:`, rawText.substring(0, 500));
      
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Geliver API error', status: response.status, details: rawText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const data = JSON.parse(rawText);
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON from Geliver', raw: rawText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get shipping prices using priceList endpoint
    if (action === 'prices') {
      const { packageWeight = 0.5, packageWidth = 20, packageHeight = 15, packageLength = 5 } = body;

      const queryParams = new URLSearchParams({
        paramType: 'parcel',
        length: String(packageLength),
        width: String(packageWidth),
        height: String(packageHeight),
        weight: String(packageWeight),
      });

      const endpoint = `${GELIVER_API_BASE}/priceList?${queryParams}`;
      console.log(`Fetching prices from: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const rawText = await response.text();
      console.log(`Geliver prices response [${response.status}]:`, rawText.substring(0, 500));

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Geliver API error', status: response.status, details: rawText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const data = JSON.parse(rawText);
        
        // Geliver returns nested structure: priceList[].offers[]
        const allOffers: any[] = [];
        const priceList = data.priceList || [];
        
        for (const desiGroup of priceList) {
          const groupOffers = desiGroup.offers || [];
          for (const offer of groupOffers) {
            allOffers.push({
              id: offer.providerServiceCode,
              carrierName: offer.providerCode || 'Unknown',
              price: parseFloat(offer.totalAmount) || 0,
              currency: offer.currency === 'TL' ? 'TRY' : offer.currency,
              estimatedDays: offer.transportType || '2-5 days',
              serviceName: offer.providerServiceCode,
              providerServiceCode: offer.providerServiceCode,
            });
          }
        }

        // Deduplicate by providerServiceCode (keep first/cheapest)
        const uniqueOffers = allOffers.filter((offer, index, self) =>
          index === self.findIndex(o => o.providerServiceCode === offer.providerServiceCode)
        );

        return new Response(
          JSON.stringify({ offers: uniqueOffers, success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON from Geliver', raw: rawText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create shipment via transactions endpoint
    if (action === 'create') {
      const { 
        orderId, 
        senderAddress, 
        receiverAddress, 
        packageWeight = 0.5,
        packageWidth = 20,
        packageHeight = 15,
        packageLength = 5,
        providerServiceCode = 'GELIVER_STANDART'
      } = body as CreateShipmentRequest;

      // Build transaction payload per Geliver docs
      const payload = {
        providerServiceCode,
        shipment: {
          sender: {
            name: senderAddress.name,
            phone: senderAddress.phone,
            address: senderAddress.address,
            city: senderAddress.city,
            district: senderAddress.district,
            postalCode: senderAddress.postalCode,
            countryCode: 'TR',
          },
          receiver: {
            name: receiverAddress.name,
            phone: receiverAddress.phone,
            address: receiverAddress.address,
            city: receiverAddress.city,
            district: receiverAddress.district,
            postalCode: receiverAddress.postalCode,
            countryCode: receiverAddress.country || 'TR',
          },
          parcels: [{
            weight: packageWeight,
            width: packageWidth,
            height: packageHeight,
            length: packageLength,
          }],
        },
        order: {
          referenceId: orderId,
          note: `CardBoom Order ${orderId?.slice(0, 8)}`,
        },
      };

      console.log('Creating Geliver transaction:', JSON.stringify(payload));

      const response = await fetch(`${GELIVER_API_BASE}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      console.log(`Geliver create response [${response.status}]:`, rawText.substring(0, 500));

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Geliver shipment creation failed', status: response.status, details: rawText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const data = JSON.parse(rawText);
        
        // Extract tracking number from response
        const trackingNumber = data.trackingNumber || data.shipment?.trackingNumber || data.awb;
        
        // Update order with tracking info
        if (trackingNumber && orderId) {
          await supabase
            .from('orders')
            .update({ 
              tracking_number: trackingNumber,
              status: 'shipped'
            })
            .eq('id', orderId);
          
          console.log(`Updated order ${orderId} with tracking: ${trackingNumber}`);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            trackingNumber,
            transactionId: data.id,
            raw: data 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON from Geliver', raw: rawText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Track shipment
    if (action === 'track') {
      const trackingNumber = url.searchParams.get('trackingNumber') || body.trackingNumber;
      if (!trackingNumber) {
        return new Response(
          JSON.stringify({ error: 'trackingNumber required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const endpoint = `${GELIVER_API_BASE}/shipments/tracking/${trackingNumber}`;
      console.log(`Tracking shipment: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const rawText = await response.text();
      console.log(`Geliver tracking response [${response.status}]:`, rawText.substring(0, 500));

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: 'Geliver tracking failed', status: response.status, details: rawText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const data = JSON.parse(rawText);
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON from Geliver', raw: rawText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
