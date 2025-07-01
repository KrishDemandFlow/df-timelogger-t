-- Add unique constraint to TimeLogs table to prevent duplicate entries
-- This constraint ensures that we don't have duplicate time entries for the same client, task, and start time

ALTER TABLE public."TimeLogs" 
ADD CONSTRAINT timelogs_unique_entry 
UNIQUE (client_id, clickup_task_id, start_time);

-- Create an index to improve query performance on the unique constraint
CREATE INDEX IF NOT EXISTS idx_timelogs_unique_entry 
ON public."TimeLogs" (client_id, clickup_task_id, start_time); 