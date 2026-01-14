import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      email, 
      displayName, 
      bio,
      walletBalance,
      createCreatorProfile,
      createStorefront,
      storefrontSlug,
      storefrontTagline
    } = await req.json();

    if (!email || !displayName) {
      return new Response(JSON.stringify({ error: "Email and displayName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Try to create auth user, or get existing one
    let userId: string;
    
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        is_system_account: true
      }
    });

    if (createUserError) {
      // Check if user already exists
      if (createUserError.message?.includes("already been registered")) {
        // Find existing user by email
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error("Error listing users:", listError);
          return new Response(JSON.stringify({ error: "Failed to find existing user" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "User exists but could not be found" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        userId = existingUser.id;
        console.log("Using existing user:", userId);
      } else {
        console.error("Error creating auth user:", createUserError);
        return new Response(JSON.stringify({ error: createUserError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = authUser.user.id;
      console.log("Created new user:", userId);
    }

    // 2. Create/update profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        display_name: displayName,
        email: email,
        bio: bio || null,
        account_type: "seller",
        is_fan_account: true,
        is_verified_seller: true,
        system_account_role: "seller",
        system_account_wallet_balance: walletBalance || 0,
        auto_actions_count: 0,
        account_status: "active",
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let creatorProfileId: string | null = null;
    let storefrontId: string | null = null;

    // 3. Create creator profile if requested
    if (createCreatorProfile || createStorefront) {
      const { data: creatorProfile, error: creatorError } = await supabaseAdmin
        .from("creator_profiles")
        .insert({
          user_id: userId,
          creator_name: displayName,
          bio: bio || null,
          platform: "other",
          is_verified: true,
          is_public: true,
        })
        .select("id")
        .single();

      if (creatorError) {
        console.error("Error creating creator profile:", creatorError);
        return new Response(JSON.stringify({ error: creatorError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      creatorProfileId = creatorProfile.id;

      // 4. Create storefront if requested
      if (createStorefront && storefrontSlug) {
        const { data: storefront, error: storefrontError } = await supabaseAdmin
          .from("creator_storefronts")
          .insert({
            creator_id: creatorProfileId,
            user_id: userId,
            slug: storefrontSlug,
            display_name: displayName,
            tagline: storefrontTagline || null,
            is_active: true,
            is_featured: false,
            total_sales: 0,
            total_revenue: 0,
            follower_count: 0,
          })
          .select("id")
          .single();

        if (storefrontError) {
          console.error("Error creating storefront:", storefrontError);
          return new Response(JSON.stringify({ error: storefrontError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        storefrontId = storefront.id;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        creatorProfileId,
        storefrontId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in create-system-account:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
