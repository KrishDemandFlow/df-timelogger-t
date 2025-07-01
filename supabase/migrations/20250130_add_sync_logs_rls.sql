-- Enable Row Level Security on sync_logs table
alter table public.sync_logs enable row level security;

-- Policy: Allow authenticated users to read all sync logs
-- This allows the frontend to fetch last sync times and view sync history
create policy "Allow authenticated users to read sync logs"
  on public.sync_logs
  for select
  to authenticated
  using (true);

-- Policy: Allow service role to insert/update sync logs
-- This allows the Edge Function to log sync operations
create policy "Allow service role to manage sync logs"
  on public.sync_logs
  for all
  to service_role
  using (true)
  with check (true);

-- Policy: Allow authenticated users to execute cleanup function
-- This allows manual cleanup if needed
-- (The function itself has security definer, so it runs with elevated privileges)

-- Update the cleanup function to work with RLS
create or replace function cleanup_old_sync_logs()
returns void
language sql security definer as $$
  delete from public.sync_logs 
  where synced_at < now() - interval '30 days';
$$;

-- Update the get_latest_sync function to work with RLS
create or replace function public.get_latest_sync()
returns timestamptz
language sql stable security definer as $$
  select max(synced_at) from public.sync_logs where error_message is null;
$$; 