import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id',
};

interface AlertThreshold {
  id: string;
  metric_name: string;
  threshold_value: number;
  threshold_window_minutes: number;
  severity: string;
  is_enabled: boolean;
  notification_channels: string[];
}

interface MetricResult {
  metric_name: string;
  current_value: number;
  threshold_value: number;
  is_breached: boolean;
  severity: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = req.headers.get('x-correlation-id') || `alert_${Date.now()}`;
  const startTime = Date.now();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`[${correlationId}] Running observability alerts check`);

  try {
    // Fetch all enabled thresholds
    const { data: thresholds, error: thresholdError } = await supabase
      .from('alert_thresholds')
      .select('*')
      .eq('is_enabled', true);

    if (thresholdError) throw thresholdError;

    const results: MetricResult[] = [];
    const alerts: Array<{
      threshold_id: string;
      metric_name: string;
      metric_value: number;
      threshold_value: number;
      severity: string;
      message: string;
    }> = [];

    for (const threshold of (thresholds || []) as AlertThreshold[]) {
      let currentValue = 0;
      let isBreached = false;

      switch (threshold.metric_name) {
        case '5xx_rate_percent': {
          const { data } = await supabase.rpc('calculate_error_rate', {
            p_endpoint: null,
            p_window_minutes: threshold.threshold_window_minutes
          });
          if (data && data[0]) {
            currentValue = Number(data[0].error_rate_percent) || 0;
          }
          isBreached = currentValue > threshold.threshold_value;
          break;
        }

        case 'email_failure_rate_percent': {
          const windowStart = new Date();
          windowStart.setMinutes(windowStart.getMinutes() - threshold.threshold_window_minutes);
          
          const { count: totalCount } = await supabase
            .from('email_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', windowStart.toISOString());

          const { count: failedCount } = await supabase
            .from('email_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', windowStart.toISOString())
            .eq('status', 'failed');

          if (totalCount && totalCount > 0) {
            currentValue = ((failedCount || 0) / totalCount) * 100;
          }
          isBreached = currentValue > threshold.threshold_value;
          break;
        }

        case 'payment_webhook_failure_rate_percent': {
          const windowStart = new Date();
          windowStart.setMinutes(windowStart.getMinutes() - threshold.threshold_window_minutes);
          
          const { count: totalCount } = await supabase
            .from('pending_payments')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', windowStart.toISOString());

          const { count: failedCount } = await supabase
            .from('pending_payments')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', windowStart.toISOString())
            .eq('status', 'failed');

          if (totalCount && totalCount > 0) {
            currentValue = ((failedCount || 0) / totalCount) * 100;
          }
          isBreached = currentValue > threshold.threshold_value;
          break;
        }

        case 'stuck_payments_count': {
          const oneHourAgo = new Date();
          oneHourAgo.setHours(oneHourAgo.getHours() - 1);
          
          const { count } = await supabase
            .from('pending_payments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .lt('created_at', oneHourAgo.toISOString());

          currentValue = count || 0;
          isBreached = currentValue > threshold.threshold_value;
          break;
        }

        case 'rate_limit_blocks_count': {
          const windowStart = new Date();
          windowStart.setMinutes(windowStart.getMinutes() - threshold.threshold_window_minutes);
          
          const { count } = await supabase
            .from('rate_limit_hits')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', windowStart.toISOString())
            .not('blocked_at', 'is', null);

          currentValue = count || 0;
          isBreached = currentValue > threshold.threshold_value;
          break;
        }

        case 'auth_failure_rate_percent': {
          const windowStart = new Date();
          windowStart.setMinutes(windowStart.getMinutes() - threshold.threshold_window_minutes);
          
          const { count: totalCount } = await supabase
            .from('request_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', windowStart.toISOString())
            .like('endpoint', '%auth%');

          const { count: failedCount } = await supabase
            .from('request_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', windowStart.toISOString())
            .like('endpoint', '%auth%')
            .gte('status_code', 400);

          if (totalCount && totalCount > 0) {
            currentValue = ((failedCount || 0) / totalCount) * 100;
          }
          isBreached = currentValue > threshold.threshold_value;
          break;
        }

        default:
          continue;
      }

      results.push({
        metric_name: threshold.metric_name,
        current_value: currentValue,
        threshold_value: threshold.threshold_value,
        is_breached: isBreached,
        severity: threshold.severity,
      });

      if (isBreached) {
        alerts.push({
          threshold_id: threshold.id,
          metric_name: threshold.metric_name,
          metric_value: currentValue,
          threshold_value: threshold.threshold_value,
          severity: threshold.severity,
          message: `${threshold.metric_name} is ${currentValue.toFixed(2)} (threshold: ${threshold.threshold_value})`,
        });

        // Update last triggered timestamp
        await supabase
          .from('alert_thresholds')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', threshold.id);
      }
    }

    // Insert alerts into history
    if (alerts.length > 0) {
      const { error: alertError } = await supabase
        .from('alert_history')
        .insert(alerts);

      if (alertError) {
        console.error(`[${correlationId}] Failed to insert alerts:`, alertError);
      }

      // Send email notifications for critical alerts
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        try {
          // Get admin emails
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_admin', true)
            .limit(5);

          for (const admin of (admins || [])) {
            await supabase.functions.invoke('send-notification', {
              body: {
                user_id: admin.id,
                type: 'order_update',
                title: '🚨 Critical Alert',
                body: criticalAlerts.map(a => a.message).join(', '),
                data: { alerts: criticalAlerts },
              },
            });
          }
        } catch (notifError) {
          console.error(`[${correlationId}] Failed to send alert notifications:`, notifError);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[${correlationId}] Alert check complete in ${duration}ms. Alerts: ${alerts.length}`);

    return new Response(JSON.stringify({
      success: true,
      correlation_id: correlationId,
      duration_ms: duration,
      metrics_checked: results.length,
      alerts_triggered: alerts.length,
      results,
      alerts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[${correlationId}] Alert check failed:`, error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      correlation_id: correlationId,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
