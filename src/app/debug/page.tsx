import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getBillingCycleDates, getBillingCycleHours } from '@/lib/utils/billing-cycle';
import ManualSyncButton from '@/components/debug/ManualSyncButton';

async function testClickUpConnection() {
  const CLICKUP_TEAM_ID = '9015007933';
  const clickupToken = process.env.CLICKUP_PERSONAL_TOKEN;
  
  if (!clickupToken) {
    return { error: 'CLICKUP_PERSONAL_TOKEN not set' };
  }

  try {
    // Test basic API connection
    const userResponse = await fetch('https://api.clickup.com/api/v2/user', {
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      return { error: `User API failed: ${userResponse.status} ${userResponse.statusText}` };
    }

    const userData = await userResponse.json();

    // Test time entries endpoint
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days for testing

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const timeEntriesUrl = new URL(`https://api.clickup.com/api/v2/team/${CLICKUP_TEAM_ID}/time_entries`);
    timeEntriesUrl.searchParams.append('start_date', startTimestamp.toString());
    timeEntriesUrl.searchParams.append('end_date', endTimestamp.toString());

    const timeResponse = await fetch(timeEntriesUrl.toString(), {
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json',
      },
    });

    if (!timeResponse.ok) {
      const errorText = await timeResponse.text();
      return { 
        error: `Time entries API failed: ${timeResponse.status} ${timeResponse.statusText}`,
        details: errorText,
        user: userData?.user?.username || 'Unknown'
      };
    }

    const timeData = await timeResponse.json();

    return {
      success: true,
      user: userData?.user?.username || 'Unknown',
      timeEntriesCount: timeData?.data?.length || 0,
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    };

  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testClickUpListFiltering() {
  const CLICKUP_TEAM_ID = '9015007933';
  const clickupToken = process.env.CLICKUP_PERSONAL_TOKEN;
  
  if (!clickupToken) {
    return { error: 'CLICKUP_PERSONAL_TOKEN not set' };
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days like in sync function

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    // Test the specific list IDs
    const listIds = ['901508571875', '901507255712']; // Fifth Dimension and Equals Money
    const results = [];

    for (const listId of listIds) {
      const timeEntriesUrl = new URL(`https://api.clickup.com/api/v2/team/${CLICKUP_TEAM_ID}/time_entries`);
      timeEntriesUrl.searchParams.append('start_date', startTimestamp.toString());
      timeEntriesUrl.searchParams.append('end_date', endTimestamp.toString());
      timeEntriesUrl.searchParams.append('list_id', listId);
      timeEntriesUrl.searchParams.append('include_task_tags', 'true');
      timeEntriesUrl.searchParams.append('include_location_names', 'true');

      const timeResponse = await fetch(timeEntriesUrl.toString(), {
        headers: {
          'Authorization': clickupToken,
          'Content-Type': 'application/json',
        },
      });

      if (!timeResponse.ok) {
        const errorText = await timeResponse.text();
        results.push({
          listId,
          error: `API failed: ${timeResponse.status} ${timeResponse.statusText}`,
          details: errorText
        });
        continue;
      }

      const timeData = await timeResponse.json();
      
      results.push({
        listId,
        count: timeData?.data?.length || 0,
        entries: timeData?.data?.slice(0, 3).map((entry: any) => ({
          id: entry.id,
          taskName: entry.task?.name || 'No task',
          description: entry.description,
          start: new Date(parseInt(entry.start)).toISOString(),
          duration: Math.round(parseInt(entry.duration) / (1000 * 60)) + ' minutes'
        })) || []
      });
    }

    // Also test without list filtering to see all entries
    const allEntriesUrl = new URL(`https://api.clickup.com/api/v2/team/${CLICKUP_TEAM_ID}/time_entries`);
    allEntriesUrl.searchParams.append('start_date', startTimestamp.toString());
    allEntriesUrl.searchParams.append('end_date', endTimestamp.toString());

    const allResponse = await fetch(allEntriesUrl.toString(), {
      headers: {
        'Authorization': clickupToken,
        'Content-Type': 'application/json',
      },
    });

    let allEntries = null;
    if (allResponse.ok) {
      const allData = await allResponse.json();
      allEntries = {
        totalCount: allData?.data?.length || 0,
        taskBreakdown: allData?.data?.reduce((acc: any, entry: any) => {
          const taskId = entry.task?.id || 'no-task';
          const taskName = entry.task?.name || 'No task';
          if (!acc[taskId]) {
            acc[taskId] = { name: taskName, count: 0, listId: 'unknown' };
          }
          acc[taskId].count++;
          return acc;
        }, {})
      };
    }

    return {
      success: true,
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      listResults: results,
      allEntries
    };

  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default async function DebugPage() {
  const supabase = createSupabaseServerClient();

  // Get all clients
  const { data: clients, error: clientsError } = await supabase
    .from('Clients')
    .select('*');

  // Get all time logs
  const { data: timeLogs, error: timeLogsError } = await supabase
    .from('TimeLogs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate billing cycle for a sample client
  const sampleClient = clients?.[0];
  let billingCycle = null;
  if (sampleClient?.billing_cycle_start_day) {
    billingCycle = getBillingCycleDates(sampleClient.billing_cycle_start_day);
  }

  // Test ClickUp connection
  const clickupTest = await testClickUpConnection();
  
  // Test ClickUp list filtering (new debug function)
  const listFilterTest = await testClickUpListFiltering();

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold">Debug Information</h1>
      
      {/* Manual Sync Test */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Manual Sync Test</h2>
        <div className="bg-gray-50 p-4 rounded">
          <p className="mb-4">Test the sync function manually to see detailed results:</p>
          <ManualSyncButton />
          <p className="text-sm text-gray-600 mt-2">
            This will call the sync function and show results in real-time.
          </p>
        </div>
      </div>
      
      {/* ClickUp API Test */}
      <div>
        <h2 className="text-xl font-semibold mb-4">ClickUp API Test</h2>
        <div className="bg-gray-50 p-4 rounded">
          {clickupTest.success ? (
            <div className="text-green-700">
              <p>✅ ClickUp API Connection Successful</p>
              <p><strong>User:</strong> {clickupTest.user}</p>
              <p><strong>Time Entries Found:</strong> {clickupTest.timeEntriesCount}</p>
              <p><strong>Date Range:</strong> {clickupTest.dateRange}</p>
            </div>
          ) : (
            <div className="text-red-700">
              <p>❌ ClickUp API Connection Failed</p>
              <p><strong>Error:</strong> {clickupTest.error}</p>
              {clickupTest.details && (
                <p><strong>Details:</strong> {clickupTest.details}</p>
              )}
              {clickupTest.user && (
                <p><strong>User:</strong> {clickupTest.user}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New ClickUp List Filtering Debug */}
      <div>
        <h2 className="text-xl font-semibold mb-4">ClickUp List Filtering Debug</h2>
        <div className="bg-blue-50 p-4 rounded">
          {listFilterTest.success ? (
            <div>
              <p className="font-semibold mb-2">📊 List Filtering Results ({listFilterTest.dateRange})</p>
              
              {listFilterTest.listResults.map((result: any, index: number) => (
                <div key={index} className="mb-4 p-3 bg-white rounded border">
                  <h4 className="font-semibold">
                    List ID: {result.listId} 
                    {result.listId === '901508571875' && ' (Fifth Dimension/5D)'}
                    {result.listId === '901507255712' && ' (Equals Money)'}
                  </h4>
                  {result.error ? (
                    <p className="text-red-600">❌ Error: {result.error}</p>
                  ) : (
                    <div>
                      <p className="text-lg font-semibold">📈 Found: {result.count} time entries</p>
                      {result.entries.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Sample entries:</p>
                          {result.entries.map((entry: any, i: number) => (
                            <div key={i} className="text-xs bg-gray-100 p-2 mt-1 rounded">
                              <p><strong>Task:</strong> {entry.taskName}</p>
                              <p><strong>Description:</strong> {entry.description}</p>
                              <p><strong>Start:</strong> {entry.start}</p>
                              <p><strong>Duration:</strong> {entry.duration}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {listFilterTest.allEntries && (
                <div className="mt-4 p-3 bg-yellow-50 rounded border">
                  <h4 className="font-semibold">🔍 All Time Entries (No List Filter)</h4>
                  <p><strong>Total Count:</strong> {listFilterTest.allEntries.totalCount}</p>
                  <div className="mt-2">
                    <p className="text-sm font-medium">Task Breakdown:</p>
                    <div className="text-xs space-y-1 mt-1 max-h-40 overflow-y-auto">
                      {Object.entries(listFilterTest.allEntries.taskBreakdown).map(([taskId, task]: [string, any]) => (
                        <div key={taskId} className="bg-white p-1 rounded">
                          <strong>{task.name}</strong> - {task.count} entries (Task ID: {taskId})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-700">
              <p>❌ List Filtering Test Failed</p>
              <p><strong>Error:</strong> {listFilterTest.error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Clients Data */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Clients ({clients?.length || 0})</h2>
        {clientsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {clientsError.message}
          </div>
        )}
        {clients && clients.length > 0 ? (
          <div className="space-y-4">
            {/* List ID Validation */}
            <div className="bg-yellow-50 p-4 rounded">
              <h3 className="font-semibold mb-2">ClickUp List ID Validation:</h3>
              {clients.map((client: any) => {
                const listId = parseInt(client.clickup_list_id);
                const isValid = !isNaN(listId) && listId > 0;
                return (
                  <div key={client.id} className={`p-2 rounded mb-2 ${isValid ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p><strong>{client.name}:</strong></p>
                    <p>List ID: "{client.clickup_list_id}" {isValid ? '✅ Valid' : '❌ Invalid - must be a positive integer'}</p>
                    {isValid && <p>Parsed as: {listId}</p>}
                  </div>
                );
              })}
            </div>
            
            {/* Raw Client Data */}
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">Raw Client Data:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(clients, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No clients found</p>
        )}
      </div>

      {/* Detailed Time Calculation Debug */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Time Calculation Debug</h2>
        {clients && clients.length > 0 && (
          <div className="space-y-6">
            {clients.map((client: any) => {
              if (!client.billing_cycle_start_day || !client.weekly_allocated_hours) {
                return (
                  <div key={client.id} className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold text-red-600">{client.name}</h3>
                    <p className="text-red-600">❌ Missing billing cycle configuration</p>
                  </div>
                );
              }

              const { start: cycleStart, end: cycleEnd } = getBillingCycleDates(client.billing_cycle_start_day);
              const allocatedHours = getBillingCycleHours(client.weekly_allocated_hours);

              return (
                <div key={client.id} className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">{client.name}</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Billing Cycle Start Day:</strong> {client.billing_cycle_start_day}</p>
                    <p><strong>Weekly Allocated Hours:</strong> {client.weekly_allocated_hours}</p>
                    <p><strong>Current Cycle:</strong> {cycleStart.toISOString().split('T')[0]} to {cycleEnd.toISOString().split('T')[0]}</p>
                    <p><strong>Allocated Hours (Monthly):</strong> {allocatedHours.toFixed(2)}h</p>
                    <p><strong>List ID:</strong> {client.clickup_list_id}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TimeLogs Data */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Time Logs ({timeLogs?.length || 0})</h2>
        {timeLogsError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {timeLogsError.message}
          </div>
        )}
        {timeLogs && timeLogs.length > 0 ? (
          <div className="bg-gray-50 p-4 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(timeLogs, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-600">No time logs found</p>
        )}
      </div>

      {/* Time Logs by Client with Date Analysis */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Time Logs Analysis</h2>
        {timeLogs && timeLogs.length > 0 ? (
          <div className="space-y-4">
            {clients?.map((client: any) => {
              const clientLogs = timeLogs.filter((log: any) => log.client_id === client.id);
              const { start: cycleStart, end: cycleEnd } = client.billing_cycle_start_day 
                ? getBillingCycleDates(client.billing_cycle_start_day) 
                : { start: new Date(0), end: new Date() };
              
              const logsInCycle = clientLogs.filter((log: any) => {
                const logDate = new Date(log.start_time);
                return logDate >= cycleStart && logDate <= cycleEnd;
              });

              return (
                <div key={client.id} className="bg-white border rounded p-4">
                  <h3 className="font-semibold mb-2">{client.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Total logs: {clientLogs.length} | In current cycle: {logsInCycle.length}
                  </p>
                  {client.billing_cycle_start_day && (
                    <p className="text-sm text-gray-600 mb-2">
                      Current cycle: {cycleStart.toISOString().split('T')[0]} to {cycleEnd.toISOString().split('T')[0]}
                    </p>
                  )}
                  <div className="space-y-1">
                    {clientLogs.slice(0, 5).map((log: any) => {
                      const logDate = new Date(log.start_time);
                      const isInCycle = client.billing_cycle_start_day && logDate >= cycleStart && logDate <= cycleEnd;
                      return (
                        <div key={log.id} className={`text-xs p-2 rounded ${isInCycle ? 'bg-green-100' : 'bg-red-100'}`}>
                          <p><strong>Date:</strong> {logDate.toISOString().split('T')[0]} {isInCycle ? '✅ In Cycle' : '❌ Outside Cycle'}</p>
                          <p><strong>Duration:</strong> {log.duration_minutes} minutes ({(log.duration_minutes / 60).toFixed(1)}h)</p>
                          <p><strong>Task:</strong> {log.description || 'No description'}</p>
                        </div>
                      );
                    })}
                    {clientLogs.length > 5 && (
                      <p className="text-xs text-gray-500">... and {clientLogs.length - 5} more entries</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600">No time logs found</p>
        )}
      </div>

      {/* Billing Cycle Calculation */}
      {billingCycle && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Sample Billing Cycle</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>Client:</strong> {sampleClient?.name}</p>
            <p><strong>Start Day:</strong> {sampleClient?.billing_cycle_start_day}</p>
            <p><strong>Cycle Start:</strong> {billingCycle.start.toISOString()}</p>
            <p><strong>Cycle End:</strong> {billingCycle.end.toISOString()}</p>
            <p><strong>Weekly Hours:</strong> {sampleClient?.weekly_allocated_hours}</p>
          </div>
        </div>
      )}

      {/* Environment Check */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
        <div className="bg-gray-50 p-4 rounded">
          <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
          <p><strong>Supabase Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
          <p><strong>ClickUp Token:</strong> {process.env.CLICKUP_PERSONAL_TOKEN ? '✅ Set' : '❌ Missing'}</p>
        </div>
      </div>
    </div>
  );
} 