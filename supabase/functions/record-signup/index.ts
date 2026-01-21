import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, deviceFingerprint } = await req.json();

    // Get client IP from various headers
    const ipAddress = 
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      'unknown';

    console.log(`Recording signup for user ${userId} from IP ${ipAddress}`);

    // Check rate limits first
    const { data: rateCheck, error: rateError } = await supabase.rpc(
      'check_signup_rate_limit',
      {
        p_ip_address: ipAddress,
        p_device_fingerprint: deviceFingerprint || null,
      }
    );

    if (rateError) {
      console.error('Rate limit check error:', rateError);
      // Fail open - allow signup if rate limit check fails
    } else if (rateCheck && !rateCheck.allowed) {
      console.log('Signup blocked:', rateCheck.reason);
      return new Response(
        JSON.stringify({ 
          success: false, 
          blocked: true,
          reason: rateCheck.reason 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Record the signup fingerprint
    await supabase.rpc('record_signup_fingerprint', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_device_fingerprint: deviceFingerprint || null,
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        ip_count: rateCheck?.ip_count || 0,
        device_count: rateCheck?.device_count || 0,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error recording signup:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
