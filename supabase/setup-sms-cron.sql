-- Schedule SMS sending cron job to run every 15 minutes (Supabase minimum)
-- This checks for critical medications and sends SMS

SELECT cron.schedule(
  'send-scheduled-sms',
  '0,15,30,45 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://derggkmbocosxcxhnwvf.supabase.co/functions/v1/send-scheduled-sms',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4NDQxNTUsImV4cCI6MjA1MTQyMDE1NX0.KLAuGI45n5E1yJpwW-Av2LJaLRYWStLJh5fOaIx67SE'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job WHERE jobname = 'send-scheduled-sms';
