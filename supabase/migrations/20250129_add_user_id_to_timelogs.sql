-- Add user_id field to TimeLogs table to track which ClickUp user created the time entry
alter table public."TimeLogs" add column clickup_user_id text;

-- Add index for better query performance
create index idx_timelogs_clickup_user_id on public."TimeLogs" (clickup_user_id);

-- Add foreign key constraint to link with ClickUpUsers table
alter table public."TimeLogs" 
add constraint TimeLogs_clickup_user_id_fkey 
foreign key (clickup_user_id) references public."ClickUpUsers" (clickup_user_id); 