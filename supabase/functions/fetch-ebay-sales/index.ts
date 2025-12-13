import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10 } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const EBAY_API_KEY = Deno.env.get('EBAY_BROWSE_API_KEY');
    if (!EBAY_API_KEY) {
      console.error('EBAY_BROWSE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'eBay API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching eBay sales for: ${query}`);

    // eBay Browse API - search for sold/completed items
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      filter: 'buyingOptions:{FIXED_PRICE|AUCTION}',
      sort: 'newlyListed',
    });

    const response = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${EBAY_API_KEY}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'eBay API error', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform eBay response to our format
    const sales = (data.itemSummaries || []).map((item: any) => ({
      id: item.itemId,
      title: item.title,
      price: parseFloat(item.price?.value || '0'),
      currency: item.price?.currency || 'USD',
      imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl,
      itemUrl: item.itemWebUrl,
      condition: item.condition,
      seller: item.seller?.username,
      sellerFeedback: item.seller?.feedbackPercentage,
      listingDate: item.itemCreationDate,
      location: item.itemLocation?.country,
    }));

    console.log(`Found ${sales.length} eBay listings for: ${query}`);

    return new Response(
      JSON.stringify({ 
        sales,
        total: data.total || sales.length,
        query,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-ebay-sales:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
