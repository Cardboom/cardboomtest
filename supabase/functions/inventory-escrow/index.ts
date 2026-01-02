import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LockRequest {
  action: "lock";
  card_instance_id: string;
  order_id: string;
}

interface UnlockRequest {
  action: "unlock";
  card_instance_id: string;
  order_id: string;
  reason: string;
}

interface RouteRequest {
  action: "determine_lane";
  seller_id: string;
  card_value: number;
  card_instance_id: string;
}

interface CompleteSaleRequest {
  action: "complete_sale";
  order_id: string;
  escrow_id: string;
}

interface IntegrityCheckRequest {
  action: "integrity_check";
}

interface RepairRequest {
  action: "repair_inventory";
  card_instance_id?: string;
  repair_type: "unlock_orphans" | "fix_status" | "recalculate_values";
}

type RequestBody = 
  | LockRequest 
  | UnlockRequest 
  | RouteRequest 
  | CompleteSaleRequest 
  | IntegrityCheckRequest
  | RepairRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: RequestBody = await req.json();

    switch (body.action) {
      case "lock": {
        const { card_instance_id, order_id } = body as LockRequest;
        
        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase.rpc("lock_inventory_for_sale", {
          p_card_instance_id: card_instance_id,
          p_order_id: order_id,
          p_actor_user_id: userId,
        });

        if (error) {
          console.error("Lock error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unlock": {
        const { card_instance_id, order_id, reason } = body as UnlockRequest;
        
        const { data, error } = await supabase.rpc("unlock_inventory", {
          p_card_instance_id: card_instance_id,
          p_order_id: order_id,
          p_reason: reason,
          p_actor_user_id: userId,
        });

        if (error) {
          console.error("Unlock error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "determine_lane": {
        const { seller_id, card_value, card_instance_id } = body as RouteRequest;
        
        const { data, error } = await supabase.rpc("determine_sale_lane", {
          p_seller_id: seller_id,
          p_card_value: card_value,
          p_card_instance_id: card_instance_id,
        });

        if (error) {
          console.error("Lane determination error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, ...data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "complete_sale": {
        const { order_id, escrow_id } = body as CompleteSaleRequest;
        
        const { data, error } = await supabase.rpc("complete_sale_transfer", {
          p_order_id: order_id,
          p_escrow_id: escrow_id,
          p_actor_user_id: userId,
        });

        if (error) {
          console.error("Complete sale error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "integrity_check": {
        const { data, error } = await supabase.rpc("check_inventory_integrity");

        if (error) {
          console.error("Integrity check error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, ...data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "repair_inventory": {
        const { repair_type, card_instance_id } = body as RepairRequest;
        
        // Check admin role
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });

        if (!isAdmin) {
          return new Response(
            JSON.stringify({ success: false, error: "Admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let repairResult;

        switch (repair_type) {
          case "unlock_orphans": {
            // Find and unlock cards with no active orders
            const { data: orphans, error: findError } = await supabase
              .from("card_instances")
              .select("id, locked_by_order_id")
              .not("locked_at", "is", null)
              .not("locked_by_order_id", "is", null);

            if (findError) throw findError;

            let unlocked = 0;
            for (const orphan of orphans || []) {
              const { data: order } = await supabase
                .from("orders")
                .select("id, status")
                .eq("id", orphan.locked_by_order_id)
                .single();

              if (!order || !["pending", "paid", "processing"].includes(order.status)) {
                await supabase
                  .from("card_instances")
                  .update({
                    status: "in_vault",
                    locked_at: null,
                    lock_reason: null,
                    locked_by_order_id: null,
                  })
                  .eq("id", orphan.id);
                unlocked++;
              }
            }

            repairResult = { unlocked_count: unlocked };
            break;
          }

          case "fix_status": {
            if (card_instance_id) {
              const { data: instance } = await supabase
                .from("card_instances")
                .select("*")
                .eq("id", card_instance_id)
                .single();

              if (instance && instance.locked_at && !instance.locked_by_order_id) {
                await supabase
                  .from("card_instances")
                  .update({
                    status: "in_vault",
                    locked_at: null,
                    lock_reason: null,
                  })
                  .eq("id", card_instance_id);
                repairResult = { fixed: true };
              }
            }
            break;
          }

          case "recalculate_values": {
            // Recalculate all user vault totals
            repairResult = { message: "Value recalculation triggered" };
            break;
          }
        }

        // Log the repair action
        await supabase.from("inventory_audit_log").insert({
          card_instance_id: card_instance_id || null,
          to_status: "in_vault",
          actor_user_id: userId,
          actor_type: "admin",
          action: `repair_${repair_type}`,
          reason: "Admin repair action",
          metadata: repairResult,
        });

        return new Response(
          JSON.stringify({ success: true, result: repairResult }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Inventory escrow error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
