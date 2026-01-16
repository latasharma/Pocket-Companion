-- Setup pg_cron job to call the escalate-critical-doses edge function every 5 minutes.
-- This enables automatic caregiver escalation for unconfirmed critical medication doses.

-- Enable the pg_cron extension if not already enabled
create extension if not exists pg_cron;

-- Schedule the edge function to run every 15 minutes (Supabase minimum interval)
-- Format: minute hour day month weekday
-- Runs at :00, :15, :30, :45 of every hour
select cron.schedule(
  'escalate-critical-doses',           -- job name
  '0,15,30,45 * * * *',                 -- run every 15 minutes
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_EDGE_FUNCTION_URL') || '/escalate-critical-doses',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_ANON_KEY')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Alternative simpler version with hardcoded URL (use this if vault secrets aren't set up):
-- This version uses your actual project URL and anon key
-- Uncomment to use this version instead:
/*
select cron.schedule(
  'escalate-critical-doses',
  '0,15,30,45 * * * *',  -- every 15 minutes (Supabase minimum interval)
  $$
  select
    net.http_post(
      url := 'https://derggkmbocosxcxhnwvf.supabase.co/functions/v1/escalate-critical-doses',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzMzNDYsImV4cCI6MjA2ODM0OTM0Nn0.sF7LmxlL0NinnKJ_1RWpro9xXK8xn01uZjIme2EQ2P0'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
*/

-- To check the job status:
-- select * from cron.job;

-- To see job execution history:
-- select * from cron.job_run_details order by start_time desc limit 10;

-- To unschedule the job (if needed):
-- select cron.unschedule('escalate-critical-doses');
