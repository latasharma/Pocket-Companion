-- Enable pg_cron (no-op if already enabled)
create extension if not exists pg_cron;

-- Function: expire trials and mark history
create or replace function expire_trial_subscriptions()
returns void as $$
declare
  r record;
begin
  for r in
    select id as user_id
    from profiles
    where subscription_status = 'trial'
      and trial_end_date is not null
      and trial_end_date < now()
  loop
    -- downgrade user to free/expired
    update profiles
    set subscription_tier = 'free',
        subscription_status = 'expired',
        subscription_end_date = null,
        subscription_renewal_date = null
    where id = r.user_id;

    -- write history (plan_id is optional here, so leave null)
    insert into subscription_history (user_id, action, notes)
    values (r.user_id, 'expired', 'Trial expired via scheduled job');
  end loop;
end;
$$ language plpgsql security definer;

-- Schedule daily at 02:00 UTC
-- Schedule daily at 02:00 UTC (simple version)
-- Note: This will error if job already exists, but that's okay
select cron.schedule(
  'expire-trial-subscriptions',
  '0 2 * * *',
  'select expire_trial_subscriptions();'
);

-- Run once now for immediate effect (optional)
-- call expire_trial_subscriptions();


