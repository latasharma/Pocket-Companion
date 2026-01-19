-- Cron jobs for proactive RSS ingest and SMS delivery (run every 15 minutes)

SELECT cron.schedule(
  'rss-ingest',
  '0,15,30,45 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://derggkmbocosxcxhnwvf.supabase.co/functions/v1/rss-ingest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NDQxNTUsImV4cCI6MjA1MTQyMDE1NX0.KLAuGI45n5E1yJpwW-Av2LJaLRYWStLJh5fOaIx67SE'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'send-proactive-sms',
  '0,15,30,45 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://derggkmbocosxcxhnwvf.supabase.co/functions/v1/send-proactive-sms',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NDQxNTUsImV4cCI6MjA1MTQyMDE1NX0.KLAuGI45n5E1yJpwW-Av2LJaLRYWStLJh5fOaIx67SE'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job WHERE jobname IN ('rss-ingest', 'send-proactive-sms');
