# Testing the Updated ClickUp Sync

## What Changed

The sync function now implements proper **Create/Update/Delete** synchronization:

1. **Create**: New time entries from ClickUp are added to the database
2. **Update**: Existing time entries are updated if they've changed in ClickUp  
3. **Delete**: Time entries that exist in the database but no longer exist in ClickUp are removed

## Database Changes

- Added `clickup_time_entry_id` column to `TimeLogs` table
- This column stores the unique ClickUp time entry ID for proper tracking
- Added unique constraint to prevent duplicate ClickUp entries

## How to Test

### 1. Initial Sync
1. Run the sync function (via the sync button in the app or manually)
2. Verify that new time entries are created with `clickup_time_entry_id` populated

### 2. Test Updates
1. Edit a time entry in ClickUp (change duration, description, etc.)
2. Run sync again
3. Verify the corresponding database entry is updated

### 3. Test Deletions
1. Delete a time entry in ClickUp
2. Run sync again
3. Verify the corresponding database entry is removed

### 4. Monitor Logs
Check the Edge Function logs to see the sync results:
- How many entries were inserted
- How many were updated  
- How many were deleted

## Migration Considerations

- Existing time entries without `clickup_time_entry_id` will remain in the database
- The cleanup migration can be run to remove old entries if needed
- New syncs will only manage entries that have the ClickUp time entry ID

## Expected Sync Output

```json
{
  "message": "Sync completed. Entries: 5 inserted, 2 updated, 1 deleted",
  "results": [
    {
      "client": "Client Name",
      "synced": 5,
      "updated": 2,
      "deleted": 1
    }
  ]
}
``` 