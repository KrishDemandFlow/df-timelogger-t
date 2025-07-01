-- Add clickup_time_entry_id column to TimeLogs table for proper sync tracking
-- This migration handles the addition of the new column and creates appropriate constraints

-- Add the new column
ALTER TABLE public."TimeLogs" ADD COLUMN IF NOT EXISTS clickup_time_entry_id text;

-- Create unique constraint on clickup_time_entry_id to prevent duplicate ClickUp entries
-- Using conditional creation in case it already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'TimeLogs' 
        AND constraint_name = 'timelogs_clickup_id_unique'
    ) THEN
        ALTER TABLE public."TimeLogs" 
        ADD CONSTRAINT timelogs_clickup_id_unique 
        UNIQUE (clickup_time_entry_id);
    END IF;
END
$$;

-- Create index for better performance on ClickUp time entry ID lookups
CREATE INDEX IF NOT EXISTS idx_timelogs_clickup_time_entry_id 
ON public."TimeLogs" (clickup_time_entry_id);

-- Note: Existing time entries will have NULL clickup_time_entry_id values
-- The sync function will handle this by treating them as entries to be updated/removed
-- based on the ClickUp API response 