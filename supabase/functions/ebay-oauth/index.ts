import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EBAY_CLIENT_ID = Deno.env.get('EBAY_CLIENT_ID');
const EBAY_CLIENT_SECRET = Deno.env.get('EBAY_CLIENT_SECRET');

// eBay OAuth endpoints
const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CachedToken {
  access_token: string;
  expires_at: string;
  created_at: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = ReturnType<typeof createClient<any>>;

// Get OAuth token using Client Credentials flow (application-only access)
async function getApplicationToken(supabase: SupabaseClientAny): Promise<string | null> {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    console.error('[ebay-oauth] Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET');
    return null;
  }

  try {
    // Create Base64 encoded credentials
    const credentials = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`);

    console.log('[ebay-oauth] Requesting new application token from eBay...');

    const response = await fetch(EBAY_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ebay-oauth] Token request failed:', response.status, errorText);
      return null;
    }

    const data: TokenResponse = await response.json();
    console.log(`[ebay-oauth] Token obtained successfully, expires in ${data.expires_in} seconds`);

    const expiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000); // 5 min buffer
    
    const { error: upsertError } = await supabase
      .from('platform_settings')
      .upsert({
        key: 'ebay_oauth_token',
        value: {
          access_token: data.access_token,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (upsertError) {
      console.error('[ebay-oauth] Failed to cache token:', upsertError);
    }

    console.log('[ebay-oauth] Token cached in database, expires at:', expiresAt.toISOString());

    return data.access_token;
  } catch (error) {
    console.error('[ebay-oauth] Error getting application token:', error);
    return null;
  }
}

// Get a valid token, refreshing if needed
async function getValidToken(supabase: SupabaseClientAny): Promise<string | null> {
  // Check for cached token
  const { data: setting, error: fetchError } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'ebay_oauth_token')
    .single();

  if (!fetchError && setting?.value) {
    const cached = setting.value as CachedToken;
    const expiresAt = new Date(cached.expires_at);
    
    // Check if token is still valid (with 5 minute buffer)
    if (expiresAt > new Date()) {
      console.log('[ebay-oauth] Using cached token, expires at:', cached.expires_at);
      return cached.access_token;
    }
    
    console.log('[ebay-oauth] Cached token expired, refreshing...');
  } else {
    console.log('[ebay-oauth] No cached token found, obtaining new one...');
  }

  // Get new token
  return await getApplicationToken(supabase);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get';

    console.log(`[ebay-oauth] Action: ${action}`);

    if (action === 'refresh' || action === 'force') {
      // Force refresh the token
      const token = await getApplicationToken(supabase);
      
      if (!token) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to refresh token',
            configured: !!(EBAY_CLIENT_ID && EBAY_CLIENT_SECRET),
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Token refreshed successfully',
          tokenPreview: `${token.substring(0, 10)}...${token.substring(token.length - 10)}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'status') {
      const { data: setting } = await supabase
        .from('platform_settings')
        .select('value, updated_at')
        .eq('key', 'ebay_oauth_token')
        .single();

      const configured = !!(EBAY_CLIENT_ID && EBAY_CLIENT_SECRET);
      
      if (!setting?.value) {
        return new Response(
          JSON.stringify({ 
            configured,
            hasToken: false,
            message: configured ? 'OAuth configured but no token cached' : 'OAuth not configured',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cached = setting.value as CachedToken;
      const expiresAt = new Date(cached.expires_at);
      const isValid = expiresAt > new Date();

      return new Response(
        JSON.stringify({ 
          configured,
          hasToken: true,
          isValid,
          expiresAt: cached.expires_at,
          createdAt: cached.created_at,
          lastUpdated: setting.updated_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: get valid token
    const token = await getValidToken(supabase);

    if (!token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get valid token',
          configured: !!(EBAY_CLIENT_ID && EBAY_CLIENT_SECRET),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        access_token: token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ebay-oauth] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
