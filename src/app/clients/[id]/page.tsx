import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getBillingCycleDates, getBillingCycleHours } from '@/lib/utils/billing-cycle';
import { calculateBilledHours, LeadTimeStrategy, calculateProgressivePLT, determineCycleType } from '@/lib/utils/time-calculations';
import { getPLTConfig } from '@/lib/config/plt-settings';
import type { Database } from '@/lib/supabase/database.types';
import ClientDetailsView from './ClientDetailsView';

type Client = Database['public']['Tables']['Clients']['Row'];
type TimeLog = Database['public']['Tables']['TimeLogs']['Row'];

interface ClientDetailsPageProps {
  params: {
    id: string;
  };
}

// Use the same calculation interface as the dashboard
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
  // New PLT-specific fields
  progressivePLTHours: number;
  fullPLTHours: number;
  pltDaysElapsed: number;
  pltTotalDays: number;
  isPLTProgressive: boolean;
  cycleType: 'current' | 'past' | 'future';
}

async function getClientWithTimeData(id: string): Promise<ClientTimeData | null> {
  const supabase = createSupabaseServerClient();
  
  // Get client data
  const { data: client, error: clientError } = await supabase
    .from('Clients')
    .select('*')
    .eq('id', parseInt(id))
    .single();

  if (clientError || !client) {
    return null;
  }

  if (!client.billing_cycle_start_day || !client.weekly_allocated_hours) {
    // Return basic client data without calculations if not properly configured
    return {
      ...client,
      allocatedHours: 0,
      timeLogs: [],
      usedHoursWithLeadTime: 0,
      percentageUsedWithLeadTime: 0,
      usedHoursWithoutLeadTime: 0,
      percentageUsedWithoutLeadTime: 0,
      usedHoursWithLeadTimeNoBuffer: 0,
      percentageUsedWithLeadTimeNoBuffer: 0,
      usedHoursWithoutLeadTimeNoBuffer: 0,
      percentageUsedWithoutLeadTimeNoBuffer: 0,
      rawHours: 0,
      bufferedHours: 0,
      leadTimeHours: 0,
      allocatedDaysInCycle: 0,
      cycleStart: new Date().toISOString(),
      cycleEnd: new Date().toISOString(),
    };
  }

  // Get current billing cycle dates - same logic as dashboard
  const { start: cycleStart, end: cycleEnd } = getBillingCycleDates(client.billing_cycle_start_day);

  // Normalize to start/end of day - same as dashboard
  cycleStart.setHours(0, 0, 0, 0);
  cycleEnd.setHours(23, 59, 59, 999);

  // Get time logs for current cycle - same query as dashboard
  const { data: timeLogs, error: timeLogsError } = await supabase
    .from('TimeLogs')
    .select('*')
    .eq('client_id', client.id)
    .gte('start_time', cycleStart.toISOString())
    .lte('start_time', cycleEnd.toISOString());

  if (timeLogsError) {
    console.error(`Error fetching time logs for client ${client.id}:`, timeLogsError);
    return null;
  }

  // Calculate allocated hours for the billing cycle - same as dashboard
  const allocatedHours = getBillingCycleHours(client.weekly_allocated_hours);

  // Calculate total duration - same as dashboard
  const totalDurationMinutes = (timeLogs || []).reduce(
    (sum, log) => sum + log.duration_minutes, 
    0
  );

  // Get PLT configuration and determine cycle type
  const pltConfig = getPLTConfig();
  const today = new Date();
  const cycleTypeResult = determineCycleType(cycleStart, cycleEnd, today);
  const isPLTProgressive = cycleTypeResult === 'current' && pltConfig.enabled;

  // Calculate progressive and full PLT for comparison
  const progressivePLTHours = calculateProgressivePLT(
    cycleStart,
    cycleEnd,
    client.weekly_allocated_hours || 0,
    pltConfig,
    today,
    'monthly'
  );
  
  const fullPLTHours = calculateBilledHours(
    0, // No execution time for pure PLT calculation
    cycleStart,
    cycleEnd,
    client.weekly_allocated_hours || 0,
    LeadTimeStrategy.FIXED_PER_DAY,
    'monthly',
    false // No buffer for pure PLT
  );

  // Calculate all combinations of buffer and lead time using progressive PLT by default
  const usedHoursWithLeadTime = calculateBilledHours(
    totalDurationMinutes,
    cycleStart,
    cycleEnd,
    client.weekly_allocated_hours || 0,
    LeadTimeStrategy.PROGRESSIVE,
    'monthly',
    true, // with buffer
    true, // use progressive PLT
    today,
    pltConfig
  );

  const usedHoursWithoutLeadTime = calculateBilledHours(
    totalDurationMinutes,
    cycleStart,
    cycleEnd,
    client.weekly_allocated_hours || 0,
    LeadTimeStrategy.NONE,
    'monthly',
    true // with buffer
  );

  const usedHoursWithLeadTimeNoBuffer = calculateBilledHours(
    totalDurationMinutes,
    cycleStart,
    cycleEnd,
    client.weekly_allocated_hours || 0,
    LeadTimeStrategy.PROGRESSIVE,
    'monthly',
    false, // without buffer
    true, // use progressive PLT
    today,
    pltConfig
  );

  const usedHoursWithoutLeadTimeNoBuffer = calculateBilledHours(
    totalDurationMinutes,
    cycleStart,
    cycleEnd,
    client.weekly_allocated_hours || 0,
    LeadTimeStrategy.NONE,
    'monthly',
    false // without buffer
  );

  const percentageUsedWithLeadTime = allocatedHours > 0 ? (usedHoursWithLeadTime / allocatedHours) * 100 : 0;
  const percentageUsedWithoutLeadTime = allocatedHours > 0 ? (usedHoursWithoutLeadTime / allocatedHours) * 100 : 0;
  const percentageUsedWithLeadTimeNoBuffer = allocatedHours > 0 ? (usedHoursWithLeadTimeNoBuffer / allocatedHours) * 100 : 0;
  const percentageUsedWithoutLeadTimeNoBuffer = allocatedHours > 0 ? (usedHoursWithoutLeadTimeNoBuffer / allocatedHours) * 100 : 0;

  // Calculation breakdown values - same as dashboard
  const rawHours = totalDurationMinutes / 60;
  const bufferedHours = rawHours * 1.1;
  const allocatedDaysPerWeek = (client.weekly_allocated_hours || 0) / 8;
  const allocatedDaysInCycle = allocatedDaysPerWeek * 4.33;
  
  // Use progressive PLT hours for display, fallback to traditional calculation for backward compatibility
  const leadTimeHours = isPLTProgressive ? progressivePLTHours : fullPLTHours;

  // Calculate PLT timing information
  const pltDaysElapsed = Math.max(0, Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));
  const pltTotalDays = Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return {
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
    // New PLT-specific fields
    progressivePLTHours,
    fullPLTHours,
    pltDaysElapsed,
    pltTotalDays,
    isPLTProgressive,
    cycleType: cycleTypeResult
  };
}

// Use the same formatting function as dashboard
function formatHoursMinutes(decimalHours: number): string {
  if (typeof decimalHours !== 'number' || isNaN(decimalHours) || decimalHours === 0) {
    return '0h 0m';
  }
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

function formatDuration(minutes: number): string {
  if (!minutes || isNaN(minutes)) return '0m';
  
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

export default async function ClientDetailsPage({ params }: ClientDetailsPageProps) {
  const supabase = createSupabaseServerClient();
  
  // Combine all database queries into a single Promise.all for better performance
  const [clientData, recentLogsData, clickupUsersData] = await Promise.all([
    getClientWithTimeData(params.id),
    supabase
      .from('TimeLogs')
      .select('*')
      .eq('client_id', parseInt(params.id))
      .order('start_time', { ascending: false })
      .limit(10),
    supabase
      .from('ClickUpUsers')
      .select('clickup_user_id, username')
  ]);

  if (!clientData) {
    notFound();
  }

  const recentLogs = recentLogsData.data || [];
  const clickupUsers = clickupUsersData.data || [];

  // Build users map
  const usersMap: Record<string, string> = {};
  for (const user of clickupUsers) {
    if (user.clickup_user_id && user.username) {
      usersMap[user.clickup_user_id] = user.username;
    }
  }

  return (
    <ClientDetailsView 
      client={clientData} 
      recentLogs={recentLogs} 
      usersMap={usersMap} 
    />
  );
} 