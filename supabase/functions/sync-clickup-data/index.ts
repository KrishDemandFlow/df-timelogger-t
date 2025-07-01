// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Hello from Functions!")

interface ClickUpTimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
  } | null;
  start: string;
  end: string;
  duration: string; // Duration in milliseconds
  source: string;
  user: {
    id: string;
    username: string;
  };
  description: string;
}

interface ClickUpTimeEntriesResponse {
  data: ClickUpTimeEntry[];
}

interface Client {
  id: number;
  name: string;
  clickup_list_id: string;
}

interface TimeLogInsert {
  client_id: number;
  clickup_task_id: string | null;
  clickup_time_entry_id: string;
  clickup_user_id: string;
  start_time: string;
  duration_minutes: number;
  description: string | null;
}

interface TimeLogUpdate {
  clickup_task_id?: string | null;
  clickup_user_id?: string;
  start_time?: string;
  duration_minutes?: number;
  description?: string | null;
}

interface ExistingTimeLog {
  id: number;
  clickup_time_entry_id: string;
  clickup_task_id: string | null;
  clickup_user_id: string | null;
  start_time: string;
  duration_minutes: number;
  description: string | null;
}

// ClickUp team ID - this should be moved to environment variable in production
const CLICKUP_TEAM_ID = Deno.env.get('CLICKUP_TEAM_ID') || '9015007933';

Deno.serve(async (req) => {
  try {
    console.log('Starting ClickUp data sync...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get ClickUp credentials
    const clickupToken = Deno.env.get('CLICKUP_PERSONAL_TOKEN');

    if (!clickupToken) {
      throw new Error('CLICKUP_PERSONAL_TOKEN not found in environment variables');
    }

    // Get all clients
    const { data: clients, error: clientsError } = await supabaseClient
      .from('Clients')
      .select('id, name, clickup_list_id')
      .not('clickup_list_id', 'is', null);

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    // Get all ClickUp users
    const { data: clickupUsers, error: usersError } = await supabaseClient
      .from('ClickUpUsers')
      .select('clickup_user_id');

    if (usersError) {
      throw new Error(`Failed to fetch ClickUp users: ${usersError.message}`);
    }

    // Create comma-separated list of user IDs for the assignee parameter
    const assigneeIds = (clickupUsers || []).map(user => user.clickup_user_id).join(',');
    console.log(`Fetching time entries for users: ${assigneeIds}`);

    let totalSynced = 0;
    let totalUpdated = 0;
    let totalDeleted = 0;
    const syncResults: Array<{ 
      client: string; 
      synced: number; 
      updated: number; 
      deleted: number; 
      error?: string 
    }> = [];

    // Process each client
    for (const client of clients as Client[]) {
      try {
        console.log(`Syncing time entries for client: ${client.name} (List ID: ${client.clickup_list_id})`);
        
        // Calculate date range (configurable look-back period)
        const endDate = new Date();
        const LOOKBACK_DAYS = parseInt(Deno.env.get('CLICKUP_SYNC_DAYS') || '90');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - LOOKBACK_DAYS);

        const startTimestamp = startDate.getTime();
        const endTimestamp = endDate.getTime();

        // Use the correct team-based ClickUp API endpoint
        const clickupUrl = new URL(`https://api.clickup.com/api/v2/team/${CLICKUP_TEAM_ID}/time_entries`);
        clickupUrl.searchParams.append('start_date', startTimestamp.toString());
        clickupUrl.searchParams.append('end_date', endTimestamp.toString());
        
        // Ensure list_id is a valid integer
        const listId = parseInt(client.clickup_list_id);
        if (isNaN(listId)) {
          throw new Error(`Invalid list ID: ${client.clickup_list_id} - must be a valid integer`);
        }
        clickupUrl.searchParams.append('list_id', listId.toString());
        
        // Add assignee parameter to get time entries from all team members
        if (assigneeIds) {
          clickupUrl.searchParams.append('assignee', assigneeIds);
        }
        
        clickupUrl.searchParams.append('include_task_tags', 'true');
        clickupUrl.searchParams.append('include_location_names', 'true');

        console.log(`Making request to: ${clickupUrl.toString()}`);
        
        const clickupResponse = await fetch(clickupUrl.toString(), {
          headers: {
            'Authorization': clickupToken,
            'Content-Type': 'application/json',
          },
        });

        console.log(`ClickUp API response status: ${clickupResponse.status}`);

        if (!clickupResponse.ok) {
          const errorText = await clickupResponse.text();
          console.error(`ClickUp API error for ${client.name}:`, errorText);
          throw new Error(`ClickUp API error: ${clickupResponse.status} ${clickupResponse.statusText} - ${errorText}`);
        }

        // Get response text first to handle potential JSON parsing issues
        const responseText = await clickupResponse.text();
        console.log(`Raw response for ${client.name}:`, responseText.substring(0, 200) + '...');

        if (!responseText.trim()) {
          console.log(`Empty response for client ${client.name}`);
          syncResults.push({ client: client.name, synced: 0, updated: 0, deleted: 0 });
          continue;
        }

        let timeData: ClickUpTimeEntriesResponse;
        try {
          timeData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error(`JSON parsing error for ${client.name}:`, jsonError);
          console.error('Raw response:', responseText);
          throw new Error(`Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'}`);
        }
        
        // Get existing time logs for this client within the date range
        const { data: existingTimeLogs, error: existingError } = await supabaseClient
          .from('TimeLogs')
          .select('id, clickup_time_entry_id, clickup_task_id, clickup_user_id, start_time, duration_minutes, description')
          .eq('client_id', client.id)
          .gte('start_time', startDate.toISOString())
          .lte('start_time', endDate.toISOString());

        if (existingError) {
          throw new Error(`Failed to fetch existing time logs: ${existingError.message}`);
        }

        const existingLogsMap = new Map<string, ExistingTimeLog>();
        const existingLogsWithoutClickUpId: ExistingTimeLog[] = [];
        
        (existingTimeLogs || []).forEach((log: ExistingTimeLog) => {
          if (log.clickup_time_entry_id) {
            existingLogsMap.set(log.clickup_time_entry_id, log);
          } else {
            // Collect entries without ClickUp ID for potential matching or cleanup
            existingLogsWithoutClickUpId.push(log);
          }
        });

        // Process ClickUp time entries
        const clickupEntries = timeData.data || [];
        const clickupEntryIds = new Set<string>();
        
        let insertedCount = 0;
        let updatedCount = 0;

        // Process each ClickUp entry
        for (const entry of clickupEntries) {
          clickupEntryIds.add(entry.id);
          
          const timeLogData = {
            clickup_task_id: entry.task?.id || null,
            clickup_user_id: entry.user.id.toString(),
            start_time: new Date(parseInt(entry.start)).toISOString(),
            duration_minutes: Math.round(parseInt(entry.duration) / (1000 * 60)), // Convert milliseconds to minutes
            description: entry.description || entry.task?.name || null,
          };

          const existingLog = existingLogsMap.get(entry.id);

          if (!existingLog) {
            // Check if we can match this entry to an existing one without ClickUp ID
            const matchingExistingLog = existingLogsWithoutClickUpId.find(log => 
              log.start_time === timeLogData.start_time &&
              log.clickup_task_id === timeLogData.clickup_task_id &&
              log.clickup_user_id === timeLogData.clickup_user_id &&
              log.duration_minutes === timeLogData.duration_minutes
            );

            if (matchingExistingLog) {
              // Update the existing entry to add the ClickUp ID
              const { error: updateError } = await supabaseClient
                .from('TimeLogs')
                .update({
                  clickup_time_entry_id: entry.id,
                  ...timeLogData,
                })
                .eq('id', matchingExistingLog.id);

              if (updateError) {
                console.error(`Failed to update existing time log with ClickUp ID for ${client.name}:`, updateError);
              } else {
                updatedCount++;
                console.log(`Updated existing time entry with ClickUp ID: ${entry.id}`);
                // Remove from the list so it doesn't get matched again
                const index = existingLogsWithoutClickUpId.indexOf(matchingExistingLog);
                if (index > -1) existingLogsWithoutClickUpId.splice(index, 1);
              }
            } else {
              // Entry doesn't exist, insert it
              const insertData: TimeLogInsert = {
                client_id: client.id,
                clickup_time_entry_id: entry.id,
                ...timeLogData,
              };

              const { error: insertError } = await supabaseClient
                .from('TimeLogs')
                .insert([insertData]);

              if (insertError) {
                console.error(`Failed to insert time log for ${client.name}:`, insertError);
              } else {
                insertedCount++;
                console.log(`Inserted new time entry: ${entry.id}`);
              }
            }
          } else {
            // Check if the entry needs updating
            const needsUpdate = (
              existingLog.clickup_task_id !== timeLogData.clickup_task_id ||
              existingLog.clickup_user_id !== timeLogData.clickup_user_id ||
              existingLog.start_time !== timeLogData.start_time ||
              existingLog.duration_minutes !== timeLogData.duration_minutes ||
              existingLog.description !== timeLogData.description
            );

            if (needsUpdate) {
              const { error: updateError } = await supabaseClient
                .from('TimeLogs')
                .update(timeLogData)
                .eq('id', existingLog.id);

              if (updateError) {
                console.error(`Failed to update time log for ${client.name}:`, updateError);
              } else {
                updatedCount++;
                console.log(`Updated time entry: ${entry.id}`);
              }
            }
          }
        }

        // Delete time logs that no longer exist in ClickUp
        const deletedCount = await deleteRemovedEntries(
          supabaseClient, 
          existingLogsMap, 
          clickupEntryIds, 
          client.name
        );

        totalSynced += insertedCount;
        totalUpdated += updatedCount;
        totalDeleted += deletedCount;
        
        syncResults.push({ 
          client: client.name, 
          synced: insertedCount, 
          updated: updatedCount, 
          deleted: deletedCount 
        });

        console.log(`Successfully processed ${clickupEntries.length} time entries for ${client.name}: ${insertedCount} inserted, ${updatedCount} updated, ${deletedCount} deleted`);
        
      } catch (clientError) {
        console.error(`Error syncing client ${client.name}:`, clientError);
        syncResults.push({ 
          client: client.name, 
          synced: 0, 
          updated: 0, 
          deleted: 0, 
          error: clientError instanceof Error ? clientError.message : 'Unknown error' 
        });
      }
    }

    const result = {
      message: `Sync completed. Entries: ${totalSynced} inserted, ${totalUpdated} updated, ${totalDeleted} deleted`,
      results: syncResults,
      timestamp: new Date().toISOString(),
    };

    console.log('Sync completed:', result);

    // Log successful sync to sync_logs table
    try {
      const syncMode = Deno.env.get('SUPABASE_CRON') ? 'auto' : 'manual';
      
      // Option 1: Keep creating new entries (current approach)
      const { error: logError } = await supabaseClient
        .from('sync_logs')
        .insert({
          mode: syncMode,
          entries_synced: totalSynced,
          entries_updated: totalUpdated,
          entries_deleted: totalDeleted,
        });
      
      // Option 2: Single entry approach (uncomment to use instead)
      // const { error: logError } = await supabaseClient
      //   .from('sync_logs')
      //   .upsert({
      //     id: 1, // Always use ID 1 for single entry
      //     mode: syncMode,
      //     entries_synced: totalSynced,
      //     entries_updated: totalUpdated,
      //     entries_deleted: totalDeleted,
      //     synced_at: new Date().toISOString(),
      //   });
      
      if (logError) {
        console.error('Failed to log sync operation:', logError);
      } else {
        console.log(`Logged ${syncMode} sync operation to sync_logs`);
      }
    } catch (logErr) {
      console.error('Error logging sync operation:', logErr);
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Sync error:', error);
  
    // Log failed sync to sync_logs table
    try {
      const syncMode = Deno.env.get('SUPABASE_CRON') ? 'auto' : 'manual';
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        await supabaseClient
          .from('sync_logs')
          .insert({
            mode: syncMode,
            error_message: error instanceof Error ? error.message : 'Unknown error occurred',
            entries_synced: 0,
            entries_updated: 0,
            entries_deleted: 0,
          });
      }
    } catch (logErr) {
      console.error('Error logging failed sync operation:', logErr);
  }

  return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to delete time logs that no longer exist in ClickUp
async function deleteRemovedEntries(
  supabaseClient: any, 
  existingLogsMap: Map<string, ExistingTimeLog>, 
  clickupEntryIds: Set<string>, 
  clientName: string
): Promise<number> {
  const toDelete: number[] = [];
  
  // Find entries that exist in database but not in ClickUp response
  existingLogsMap.forEach((existingLog, clickupId) => {
    if (!clickupEntryIds.has(clickupId)) {
      toDelete.push(existingLog.id);
    }
  });

  if (toDelete.length === 0) {
    return 0;
  }

  console.log(`Deleting ${toDelete.length} removed time entries for ${clientName}`);

  const { error: deleteError } = await supabaseClient
    .from('TimeLogs')
    .delete()
    .in('id', toDelete);

  if (deleteError) {
    console.error(`Failed to delete removed time logs for ${clientName}:`, deleteError);
    return 0;
  }

  console.log(`Successfully deleted ${toDelete.length} removed time entries for ${clientName}`);
  return toDelete.length;
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-clickup-data' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
