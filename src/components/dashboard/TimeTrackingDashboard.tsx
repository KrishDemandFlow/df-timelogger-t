import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getBillingCycleDates, getBillingCycleHours, getWeeklyDates, getLastWeekDates, getWeeklyHours } from '@/lib/utils/billing-cycle';
import { calculateBilledHours, LeadTimeStrategy } from '@/lib/utils/time-calculations';
import SyncButton from '@/components/sync/SyncButton';
import { CalculationSettingsProvider } from '@/components/dashboard/CalculationSettingsContext';
import type { Database } from '@/lib/supabase/database.types';
import ClientCardGrid, { type ClientTimeData as ClientCardData } from './ClientCardGrid';
import { subMonths } from 'date-fns/subMonths';

type Client = Database['public']['Tables']['Clients']['Row'];
type TimeLog = Database['public']['Tables']['TimeLogs']['Row'];
type ClickUpUser = { clickup_user_id: string; username: string };

// Extend the interface to include all necessary data for the client-side component
interface ClientTimeData extends Client {
  allocatedHours: number;
  timeLogs: TimeLog[];
  usedHoursWithLeadTime: number;
  percentageUsedWithLeadTime: number;
  usedHoursWithoutLeadTime: number;
  percentageUsedWithoutLeadTime: number;
  usedHoursWithLeadTimeNoBuffer: number;
  percentageUsedWithLeadTimeNoBuffer: number;
  usedHoursWithoutLeadTimeNoBuffer: number;
  percentageUsedWithoutLeadTimeNoBuffer: number;
  rawHours: number;
  bufferedHours: number;
  leadTimeHours: number;
  allocatedDaysInCycle: number;
  cycleStart: string;
  cycleEnd: string;
}

export type EnrichedClientTimeData = ClientTimeData & {
    usersMap: Record<string, string>;
};

type CycleOption = 'current' | 'previous' | 'this-week' | 'last-week' | 'custom';

async function getClientTimeData(cycle: CycleOption, customStart?: string, customEnd?: string): Promise<{ clientTimeData: ClientTimeData[], usersMap: Record<string, string> }> {
  const supabase = createSupabaseServerClient();

  // Get all clients and users in parallel
  const [
    { data: clients, error: clientsError },
    { data: clickupUsers, error: usersError }
  ] = await Promise.all([
    supabase.from('Clients').select('*'),
    supabase.from('ClickUpUsers').select('clickup_user_id, username')
  ]);

  if (clientsError || !clients) {
    console.error('Error fetching clients:', clientsError);
    return { clientTimeData: [], usersMap: {} };
  }
  
  const usersMap: Record<string, string> = {};
  if (clickupUsers) {
    for (const user of clickupUsers) {
        if (user.clickup_user_id && user.username) {
            usersMap[user.clickup_user_id] = user.username;
        }
    }
  }

  const clientTimeData: ClientTimeData[] = [];

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

    const totalDurationMinutes = (timeLogs || []).reduce(
      (sum, log) => sum + log.duration_minutes, 
      0
    );

    const cycleTypeParam = cycle === 'this-week' || cycle === 'last-week' ? 'weekly' : 'monthly';

    // Calculate all combinations of buffer and lead time
    const usedHoursWithLeadTime = calculateBilledHours(
      totalDurationMinutes,
      cycleStart,
      cycleEnd,
      client.weekly_allocated_hours || 0,
      LeadTimeStrategy.FIXED_PER_DAY,
      cycleTypeParam,
      true // with buffer
    );

    const usedHoursWithoutLeadTime = calculateBilledHours(
      totalDurationMinutes,
      cycleStart,
      cycleEnd,
      client.weekly_allocated_hours || 0,
      LeadTimeStrategy.NONE,
      cycleTypeParam,
      true // with buffer
    );

    const usedHoursWithLeadTimeNoBuffer = calculateBilledHours(
      totalDurationMinutes,
      cycleStart,
      cycleEnd,
      client.weekly_allocated_hours || 0,
      LeadTimeStrategy.FIXED_PER_DAY,
      cycleTypeParam,
      false // without buffer
    );

    const usedHoursWithoutLeadTimeNoBuffer = calculateBilledHours(
      totalDurationMinutes,
      cycleStart,
      cycleEnd,
      client.weekly_allocated_hours || 0,
      LeadTimeStrategy.NONE,
      cycleTypeParam,
      false // without buffer
    );

    const percentageUsedWithLeadTime = allocatedHours > 0 ? (usedHoursWithLeadTime / allocatedHours) * 100 : 0;
    const percentageUsedWithoutLeadTime = allocatedHours > 0 ? (usedHoursWithoutLeadTime / allocatedHours) * 100 : 0;
    const percentageUsedWithLeadTimeNoBuffer = allocatedHours > 0 ? (usedHoursWithLeadTimeNoBuffer / allocatedHours) * 100 : 0;
    const percentageUsedWithoutLeadTimeNoBuffer = allocatedHours > 0 ? (usedHoursWithoutLeadTimeNoBuffer / allocatedHours) * 100 : 0;

    // Calculation breakdown values
    const rawHours = totalDurationMinutes / 60;
    const bufferedHours = rawHours * 1.1;
    const allocatedDaysPerWeek = (client.weekly_allocated_hours || 0) / 8;
    
    // For weekly view, allocatedDaysInCycle should be for one week, not the full billing cycle
    const allocatedDaysInCycle = cycle === 'this-week' || cycle === 'last-week' ? allocatedDaysPerWeek : allocatedDaysPerWeek * 4.33;
    const leadTimeHours = allocatedDaysInCycle * 2;

    clientTimeData.push({
      ...client,
      allocatedHours,
      timeLogs: timeLogs || [],
      usedHoursWithLeadTime,
      percentageUsedWithLeadTime,
      usedHoursWithoutLeadTime,
      percentageUsedWithoutLeadTime,
      usedHoursWithLeadTimeNoBuffer,
      percentageUsedWithLeadTimeNoBuffer,
      usedHoursWithoutLeadTimeNoBuffer,
      percentageUsedWithoutLeadTimeNoBuffer,
      rawHours,
      bufferedHours,
      leadTimeHours,
      allocatedDaysInCycle,
      cycleStart: cycleStart.toISOString(),
      cycleEnd: cycleEnd.toISOString(),
    });
  }

  return { clientTimeData, usersMap };
}

export default async function TimeTrackingDashboard({
  cycle = 'current',
  startDate,
  endDate,
}: {
  cycle?: CycleOption;
  startDate?: string;
  endDate?: string;
}) {
  const { clientTimeData, usersMap } = await getClientTimeData(cycle, startDate, endDate);

  if (clientTimeData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          No client time data available. Add clients and sync ClickUp data to get started.
        </p>
      </div>
    );
  }

  return (
    <CalculationSettingsProvider>
    <div className="space-y-6">
      {/* Header removed as per new design */}

      <ClientCardGrid
        clientTimeData={clientTimeData as unknown as ClientCardData[]}
        usersMap={usersMap}
        cycle={cycle}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
    </CalculationSettingsProvider>
  );
} 