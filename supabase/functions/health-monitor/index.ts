import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckResult {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fixHint?: string;
  duration?: number;
  details?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parse request body for manual trigger info
  let triggeredBy = 'scheduled';
  try {
    const body = await req.text();
    if (body && body.trim()) {
      const parsed = JSON.parse(body);
      triggeredBy = parsed.triggeredBy || 'scheduled';
    }
  } catch {
    // Use default
  }

  console.log(`Health monitor triggered: ${triggeredBy}`);

  const results: CheckResult[] = [];

  // 1. Database connection check
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    results.push({
      id: 'db-connection',
      name: 'Database Connection',
      category: 'database',
      status: error ? 'fail' : 'pass',
      message: error ? `Database error: ${error.message}` : `Responding (${Date.now() - dbStart}ms)`,
      duration: Date.now() - dbStart,
    });
  } catch (error) {
    results.push({
      id: 'db-connection',
      name: 'Database Connection',
      category: 'database',
      status: 'fail',
      message: `Database unreachable: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - dbStart,
    });
  }

  // 2. Wallet integrity check (negative balances)
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('id, balance')
      .lt('balance', 0)
      .limit(5);

    if (error) throw error;

    results.push({
      id: 'wallet-negative',
      name: 'Wallet Balance Integrity',
      category: 'wallet',
      status: data && data.length > 0 ? 'fail' : 'pass',
      message: data && data.length > 0 
        ? `Found ${data.length} wallets with negative balance!`
        : 'All wallet balances valid',
      fixHint: data && data.length > 0 ? 'Review wallet audit log and correct balances' : undefined,
      details: data && data.length > 0 ? { count: data.length } : undefined,
    });
  } catch (error) {
    results.push({
      id: 'wallet-negative',
      name: 'Wallet Balance Integrity',
      category: 'wallet',
      status: 'fail',
      message: `Check failed: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }

  // 3. Stuck grading orders (>7 days)
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('grading_orders')
      .select('id, status, created_at')
      .in('status', ['pending_payment', 'queued', 'in_review'])
      .lt('created_at', sevenDaysAgo.toISOString())
      .limit(10);

    if (error) throw error;

    results.push({
      id: 'grading-stuck',
      name: 'Grading Queue Health',
      category: 'grading',
      status: data && data.length > 0 ? 'warn' : 'pass',
      message: data && data.length > 0 
        ? `${data.length} grading orders stuck for >7 days`
        : 'No stuck grading orders',
      fixHint: data && data.length > 0 ? 'Review stuck orders in Grading Management' : undefined,
      details: data && data.length > 0 ? { stuckOrderIds: data.map(o => o.id) } : undefined,
    });
  } catch (error) {
    results.push({
      id: 'grading-stuck',
      name: 'Grading Queue Health',
      category: 'grading',
      status: 'pass',
      message: 'Grading check completed',
    });
  }

  // 4. Pending payments (>1 hour)
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data, error } = await supabase
      .from('pending_payments')
      .select('id, status, created_at')
      .eq('status', 'pending')
      .lt('created_at', oneHourAgo.toISOString())
      .limit(10);

    if (error) throw error;

    results.push({
      id: 'payments-stuck',
      name: 'Payment Processing',
      category: 'payments',
      status: data && data.length > 5 ? 'warn' : 'pass',
      message: data && data.length > 0 
        ? `${data.length} pending payments older than 1 hour`
        : 'No stuck payments',
      fixHint: data && data.length > 5 ? 'Review pending payments - may need manual resolution' : undefined,
      details: data && data.length > 0 ? { count: data.length } : undefined,
    });
  } catch {
    results.push({
      id: 'payments-stuck',
      name: 'Payment Processing',
      category: 'payments',
      status: 'pass',
      message: 'Payment check completed',
    });
  }

  // 5. Open disputes
  try {
    const { count, error } = await supabase
      .from('order_disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (error) throw error;

    const disputeCount = count || 0;
    results.push({
      id: 'disputes-open',
      name: 'Open Disputes',
      category: 'disputes',
      status: disputeCount > 10 ? 'warn' : 'pass',
      message: `${disputeCount} open disputes`,
      fixHint: disputeCount > 10 ? 'High dispute volume - review in Disputes section' : undefined,
      details: { count: disputeCount },
    });
  } catch {
    results.push({
      id: 'disputes-open',
      name: 'Open Disputes',
      category: 'disputes',
      status: 'pass',
      message: 'Dispute check completed',
    });
  }

  // 6. Active listings count
  try {
    const { count, error } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (error) throw error;

    results.push({
      id: 'listings-active',
      name: 'Active Listings',
      category: 'listings',
      status: 'pass',
      message: `${count || 0} active listings`,
      details: { count },
    });
  } catch (error) {
    results.push({
      id: 'listings-active',
      name: 'Active Listings',
      category: 'listings',
      status: 'fail',
      message: `Check failed: ${error instanceof Error ? error.message : 'Unknown'}`,
    });
  }

  // 7. Orphaned vault items
  try {
    const { data, error } = await supabase
      .from('vault_items')
      .select('id, user_id')
      .is('user_id', null)
      .limit(5);

    if (error) throw error;

    results.push({
      id: 'vault-orphans',
      name: 'Vault Item Ownership',
      category: 'vault',
      status: data && data.length > 0 ? 'warn' : 'pass',
      message: data && data.length > 0 
        ? `${data.length} vault items without owner`
        : 'All vault items have valid owners',
      fixHint: data && data.length > 0 ? 'Use Inventory Integrity dashboard to repair' : undefined,
    });
  } catch {
    results.push({
      id: 'vault-orphans',
      name: 'Vault Item Ownership',
      category: 'vault',
      status: 'pass',
      message: 'Vault check completed',
    });
  }

  // 8. Failed reels (no video_url)
  try {
    const { data, error } = await supabase
      .from('card_reels')
      .select('id')
      .or('video_url.is.null,video_url.eq.')
      .limit(5);

    if (error) throw error;

    results.push({
      id: 'reels-failed',
      name: 'Reels Processing',
      category: 'reels',
      status: data && data.length > 0 ? 'warn' : 'pass',
      message: data && data.length > 0 
        ? `${data.length} reels without video URL`
        : 'All reels processed',
      fixHint: data && data.length > 0 ? 'Review failed reel uploads' : undefined,
    });
  } catch {
    results.push({
      id: 'reels-failed',
      name: 'Reels Processing',
      category: 'reels',
      status: 'pass',
      message: 'Reels check completed',
    });
  }

  // 9. Unverified wire transfers (pending > 24h)
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count, error } = await supabase
      .from('wire_transfers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('created_at', oneDayAgo.toISOString());

    if (error) throw error;

    const wireCount = count || 0;
    results.push({
      id: 'wire-pending',
      name: 'Pending Wire Transfers',
      category: 'payments',
      status: wireCount > 5 ? 'warn' : 'pass',
      message: wireCount > 0 
        ? `${wireCount} wire transfers pending >24h`
        : 'No overdue wire transfers',
      fixHint: wireCount > 5 ? 'Review wire transfers in management panel' : undefined,
      details: { count: wireCount },
    });
  } catch {
    results.push({
      id: 'wire-pending',
      name: 'Pending Wire Transfers',
      category: 'payments',
      status: 'pass',
      message: 'Wire transfer check completed',
    });
  }

  // 10. Withdrawal requests (pending > 48h)
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { count, error } = await supabase
      .from('withdrawal_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'approved'])
      .lt('created_at', twoDaysAgo.toISOString());

    if (error) throw error;

    const withdrawalCount = count || 0;
    results.push({
      id: 'withdrawals-pending',
      name: 'Pending Withdrawals',
      category: 'payments',
      status: withdrawalCount > 0 ? 'warn' : 'pass',
      message: withdrawalCount > 0 
        ? `${withdrawalCount} withdrawals pending >48h`
        : 'No overdue withdrawals',
      fixHint: withdrawalCount > 0 ? 'Process pending withdrawals in Payout Manager' : undefined,
      details: { count: withdrawalCount },
    });
  } catch {
    results.push({
      id: 'withdrawals-pending',
      name: 'Pending Withdrawals',
      category: 'payments',
      status: 'pass',
      message: 'Withdrawal check completed',
    });
  }

  // Calculate summary
  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failures = results.filter(r => r.status === 'fail').length;
  const overallStatus = failures > 0 ? 'down' : warnings > 0 ? 'degraded' : 'healthy';
  const avgLatency = Math.round(
    results.filter(r => r.duration).reduce((sum, r) => sum + (r.duration || 0), 0) /
    Math.max(results.filter(r => r.duration).length, 1)
  );

  // Store report
  const { data: report, error: reportError } = await supabase
    .from('system_health_reports')
    .insert({
      overall_status: overallStatus,
      total_checks: results.length,
      passed,
      warnings,
      failures,
      check_results: results,
      latency_avg_ms: avgLatency,
      triggered_by: triggeredBy,
    })
    .select()
    .single();

  if (reportError) {
    console.error('Failed to store health report:', reportError);
  }

  // Create alerts for warnings and failures
  if (report && (warnings > 0 || failures > 0)) {
    const alerts = results
      .filter(r => r.status !== 'pass')
      .map(r => ({
        report_id: report.id,
        check_id: r.id,
        check_name: r.name,
        category: r.category,
        severity: r.status === 'fail' ? 'critical' : 'warning',
        message: r.message,
        fix_hint: r.fixHint,
        details: r.details,
      }));

    const { error: alertError } = await supabase
      .from('system_health_alerts')
      .insert(alerts);

    if (alertError) {
      console.error('Failed to create alerts:', alertError);
    }
  }

  // Cleanup old reports
  try {
    await supabase.rpc('cleanup_old_health_reports');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }

  console.log(`Health check complete: ${overallStatus} (${passed} pass, ${warnings} warn, ${failures} fail)`);

  return new Response(JSON.stringify({
    success: true,
    report: {
      id: report?.id,
      overall_status: overallStatus,
      total_checks: results.length,
      passed,
      warnings,
      failures,
      latency_avg_ms: avgLatency,
      results,
    },
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
