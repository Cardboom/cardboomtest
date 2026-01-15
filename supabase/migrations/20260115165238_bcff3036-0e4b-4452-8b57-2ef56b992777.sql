-- Set up hourly cron job to sync homepage cache data
-- This updates TCG drops, social posts, and market summary

-- Schedule sync-homepage-cache to run every hour
SELECT cron.schedule(
  'sync-homepage-cache-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-homepage-cache',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);

-- Schedule daily price refresh for all catalog items at 2 AM UTC
SELECT cron.schedule(
  'refresh-all-prices-daily',
  '0 2 * * *', -- 2:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/refresh-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"type": "all", "limit": 1000}'::jsonb
  )
  $$
);

-- Schedule portfolio item price refresh every 30 minutes
SELECT cron.schedule(
  'refresh-portfolio-prices',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/refresh-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"type": "portfolio", "limit": 200}'::jsonb
  )
  $$
);

-- Schedule top viewed items price refresh every 15 minutes
SELECT cron.schedule(
  'refresh-top-viewed-prices',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/refresh-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"type": "top_viewed", "limit": 100}'::jsonb
  )
  $$
);