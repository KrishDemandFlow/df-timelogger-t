import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getBillingCycleDates, getBillingCycleHours, getWeeklyDates, getLastWeekDates, getWeeklyHours } from '@/lib/utils/billing-cycle';
import SyncButton from '@/components/sync/SyncButton';
import { CalculationSettingsProvider } from '@/components/dashboard/CalculationSettingsContext';
import type { Database } from '@/lib/supabase/database.types';
import DashboardClient from './DashboardClient';
import { ClientTimeDataRaw } from './ClientCalculations';
import { subMonths } from 'date-fns/subMonths';

type Client = Database['public']['Tables']['Clients']['Row'];
type TimeLog = Database['public']['Tables']['TimeLogs']['Row'];
type ClickUpUser = { clickup_user_id: string; username: string };

type CycleOption = 'current' | 'previous' | 'this-week' | 'last-week' | 'custom';

async function getRawClientData(cycle: CycleOption, customStart?: string, customEnd?: string): Promise<{ rawClientData: ClientTimeDataRaw[], usersMap: Record<string, string> }> {
  const supabase = createSupabaseServerClient();

  // Get all clients and users in parallel
  const [
    { data: clients, error: clientsError },
    { data: clickupUsers, error: usersError }
  ] = await Promise.all([
    supabase.from('Clients').select('*'),
    supabase.from('ClickUpUsers').select('clickup_user_id, username')
  ]);

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    return { rawClientData: [], usersMap: {} };
  }

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return { rawClientData: [], usersMap: {} };
  }

  // Create users map
  const usersMap: Record<string, string> = {};
  (clickupUsers || []).forEach((user: ClickUpUser) => {
    usersMap[user.clickup_user_id] = user.username;
  });

  const rawClientData: ClientTimeDataRaw[] = [];

  if (!clients) return { rawClientData, usersMap };

  for (const client of clients) {
    if (!client.billing_cycle_start_day || !client.weekly_allocated_hours) {
      // Skip clients without proper configuration
      continue;
    }

    // Determine date range based on selected cycle
    let cycleStart: Date;
    let cycleEnd: Date;
    let allocatedHours: number;

    if (cycle === 'current') {
      ({ start: cycleStart, end: cycleEnd } = getBillingCycleDates(client.billing_cycle_start_day));
      allocatedHours = getBillingCycleHours(client.weekly_allocated_hours);
    } else if (cycle === 'previous') {
      const { start: currentStart } = getBillingCycleDates(client.billing_cycle_start_day);
      const previousMonth = subMonths(currentStart, 1);
      ({ start: cycleStart, end: cycleEnd } = getBillingCycleDates(client.billing_cycle_start_day, previousMonth));
      allocatedHours = getBillingCycleHours(client.weekly_allocated_hours);
    } else if (cycle === 'this-week') {
      ({ start: cycleStart, end: cycleEnd } = getWeeklyDates());
      allocatedHours = getWeeklyHours(client.weekly_allocated_hours);
    } else if (cycle === 'last-week') {
      ({ start: cycleStart, end: cycleEnd } = getLastWeekDates());
      allocatedHours = getWeeklyHours(client.weekly_allocated_hours);
    } else {
      // custom - parse dates in local time to avoid timezone issues
      if (customStart) {
        const [year, month, day] = customStart.split('-').map(Number);
        cycleStart = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        cycleStart = new Date();
      }
      
      if (customEnd) {
        const [year, month, day] = customEnd.split('-').map(Number);
        cycleEnd = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        cycleEnd = new Date();
      }
      
      // For custom ranges, use billing cycle allocation (could be enhanced to calculate based on date range)
      allocatedHours = getBillingCycleHours(client.weekly_allocated_hours);
    }

    // Normalize to start/end of day
    cycleStart.setHours(0, 0, 0, 0);
    cycleEnd.setHours(23, 59, 59, 999);

    // Get time logs for this client within the selected date range
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('TimeLogs')
      .select('*')
      .eq('client_id', client.id)
      .gte('start_time', cycleStart.toISOString())
      .lte('start_time', cycleEnd.toISOString());

    if (timeLogsError) {
      console.error(`Error fetching time logs for client ${client.id}:`, timeLogsError);
      continue;
    }

    rawClientData.push({
      ...client,
      allocatedHours,
      timeLogs: timeLogs || [],
      cycleStart: cycleStart.toISOString(),
      cycleEnd: cycleEnd.toISOString(),
    });
  }

  return { rawClientData, usersMap };
}

interface Props {
  searchParams: {
    cycle?: string;
    customStart?: string;
    customEnd?: string;
  };
}

export default async function TimeTrackingDashboard({ searchParams }: Props) {
  const cycle = (searchParams.cycle || 'current') as CycleOption;
  const { customStart, customEnd } = searchParams;

  const { rawClientData, usersMap } = await getRawClientData(cycle, customStart, customEnd);

  return (
    <CalculationSettingsProvider>
      <div className="space-y-0">
        <div className="flex items-center justify-between">
          {/* <div>
            <h1 className="text-3xl font-bold tracking-tight">Time Tracking Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor retainer hours usage across all clients
            </p>
          </div> */}
          {/* <SyncButton /> */}
        </div>

        <DashboardClient 
          rawClientData={rawClientData}
          usersMap={usersMap}
          initialCycle={cycle}
          initialStartDate={customStart}
          initialEndDate={customEnd}
        />
      </div>
    </CalculationSettingsProvider>
  );
} 