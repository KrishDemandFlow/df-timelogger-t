-- Drop the user_id column and all dependent RLS policies
ALTER TABLE public."Clients" DROP COLUMN IF EXISTS user_id CASCADE;

-- Allow any authenticated user to view all clients
CREATE POLICY "Allow authenticated users to view all clients" ON public."Clients" FOR SELECT TO authenticated USING (true);

-- Allow any authenticated user to insert a client
CREATE POLICY "Allow authenticated users to insert clients" ON public."Clients" FOR INSERT TO authenticated WITH CHECK (true);

-- Allow any authenticated user to update any client
CREATE POLICY "Allow authenticated users to update clients" ON public."Clients" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow any authenticated user to delete any client
CREATE POLICY "Allow authenticated users to delete clients" ON public."Clients" FOR DELETE TO authenticated USING (true);

-- Add clickup_time_entry_id column to TimeLogs table for proper sync
ALTER TABLE public."TimeLogs" ADD COLUMN IF NOT EXISTS clickup_time_entry_id text;

-- Create unique constraint on clickup_time_entry_id to prevent duplicate ClickUp entries
ALTER TABLE public."TimeLogs" 
ADD CONSTRAINT timelogs_clickup_id_unique 
UNIQUE (clickup_time_entry_id);

-- Create index for better performance on ClickUp time entry ID lookups
CREATE INDEX IF NOT EXISTS idx_timelogs_clickup_time_entry_id 
ON public."TimeLogs" (clickup_time_entry_id);

-- Re-create RLS policies for TimeLogs table to allow access for any authenticated user
-- The old policies were dropped by the CASCADE command above.

-- Allow any authenticated user to view all time logs
CREATE POLICY "Allow authenticated users to view all timelogs" ON public."TimeLogs" FOR SELECT TO authenticated USING (true);

-- Allow any authenticated user to insert a time log
CREATE POLICY "Allow authenticated users to insert timelogs" ON public."TimeLogs" FOR INSERT TO authenticated WITH CHECK (true);

-- Allow any authenticated user to update any time log
CREATE POLICY "Allow authenticated users to update timelogs" ON public."TimeLogs" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow any authenticated user to delete any time log
CREATE POLICY "Allow authenticated users to delete timelogs" ON public."TimeLogs" FOR DELETE TO authenticated USING (true); 