-- Function to clean up old sync logs (keep last 30 days)
create or replace function cleanup_old_sync_logs()
returns void
language sql security definer as $$
  delete from public.sync_logs 
  where synced_at < now() - interval '30 days';
$$;

-- Grant permission to execute the cleanup function
grant execute on function cleanup_old_sync_logs() to authenticated;

-- Optional: Create a trigger to auto-cleanup after each insert
-- This keeps the table size manageable automatically
create or replace function trigger_cleanup_sync_logs()
returns trigger
language plpgsql security definer as $$
begin
  -- Only run cleanup occasionally (when sync_logs count > 100)
  -- to avoid running it on every single insert
  if (select count(*) from public.sync_logs) > 100 then
    perform cleanup_old_sync_logs();
  end if;
  return new;
end;
$$;

-- Create the trigger (optional - can be enabled if desired)
-- create trigger auto_cleanup_sync_logs
--   after insert on public.sync_logs
--   for each row execute function trigger_cleanup_sync_logs(); 