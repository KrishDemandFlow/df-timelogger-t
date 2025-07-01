-- Cleanup existing time logs that don't have ClickUp time entry IDs
-- This migration handles existing data that was created before we started tracking ClickUp IDs

-- For existing time logs without clickup_time_entry_id, we'll need to either:
-- 1. Delete them (if they're old/irrelevant)
-- 2. Or mark them for manual review

-- First, let's see how many exist and when they were created
-- (This is just informational - we're not actually deleting anything automatically)

-- Count existing entries without clickup_time_entry_id
-- SELECT COUNT(*) as entries_without_clickup_id 
-- FROM public."TimeLogs" 
-- WHERE clickup_time_entry_id IS NULL;

-- Optional: Remove time logs older than 60 days that don't have ClickUp IDs
-- These are likely from before we implemented proper sync tracking
-- Uncomment the following lines if you want to clean up old entries:

-- DELETE FROM public."TimeLogs" 
-- WHERE clickup_time_entry_id IS NULL 
-- AND created_at < NOW() - INTERVAL '60 days';

-- Add a comment to indicate this cleanup was run
COMMENT ON TABLE public."TimeLogs" IS 'Time logs synced from ClickUp. Entries without clickup_time_entry_id may be from before sync tracking was implemented.'; 