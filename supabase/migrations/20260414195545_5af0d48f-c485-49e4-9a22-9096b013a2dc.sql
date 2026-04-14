-- Enable pg_net if not already
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule auto-scrape: every 10 minutes, process 1 pending set
SELECT cron.schedule(
  'scrape-collectr-cards-auto',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kgffwhyfgkqeevsuhldt.supabase.co/functions/v1/scrape-collectr-cards',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{"limit": 1}'::jsonb
  ) AS request_id;
  $$
);