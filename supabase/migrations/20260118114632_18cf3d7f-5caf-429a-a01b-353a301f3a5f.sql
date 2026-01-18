-- Schedule subscription renewal processing daily at 3 AM UTC
SELECT cron.schedule(
  'process-subscription-renewals-daily',
  '0 3 * * *', -- 3:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-subscription-renewals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);