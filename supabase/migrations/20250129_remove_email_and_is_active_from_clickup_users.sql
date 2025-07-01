-- Remove email and is_active columns from ClickUpUsers table
-- These columns are not needed for the core functionality

-- Drop the foreign key constraint first if it exists
alter table public."TimeLogs" drop constraint if exists "TimeLogs_clickup_user_id_fkey";

-- Drop the columns
alter table public."ClickUpUsers" drop column if exists email;
alter table public."ClickUpUsers" drop column if exists is_active;

-- Re-add the foreign key constraint
alter table public."TimeLogs" 
add constraint TimeLogs_clickup_user_id_fkey 
foreign key (clickup_user_id) references public."ClickUpUsers" (clickup_user_id); 