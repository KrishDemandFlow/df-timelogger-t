import { differenceInDays } from 'date-fns';
import { PLTConfig, getPLTConfig } from '@/lib/config/plt-settings';

/**
 * Calculates the number of working days (Monday-Friday) between two dates, inclusive.
 * @param startDate The start date.
 * @param endDate The end date.
 * @returns The number of working days.
 */
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

/**
 * Different strategies for calculating lead time
 */
export enum LeadTimeStrategy {
  NONE = 'none',
  FIXED_PER_DAY = 'fixed_per_day',
  PROPORTIONAL = 'proportional',
  PROGRESSIVE = 'progressive'
}

/**
 * Determines if a cycle is current, past, or future relative to a reference date
 */
export function determineCycleType(
  cycleStart: Date,
  cycleEnd: Date,
  referenceDate: Date = new Date()
): 'current' | 'past' | 'future' {
  if (referenceDate < cycleStart) return 'future';
  if (referenceDate > cycleEnd) return 'past';
  return 'current';
}

/**
 * Calculates full PLT using the original logic for backward compatibility
 */
function calculateFullPLT(
  weeklyAllocatedHours: number,
  config: PLTConfig,
  cycleType: 'weekly' | 'monthly' = 'monthly'
): number {
  const HOURS_PER_WORK_DAY = 8;
  const LEAD_TIME_HOURS_PER_DAY = 2;

  if (weeklyAllocatedHours <= 0) return 0;

  const allocatedDaysPerWeek = weeklyAllocatedHours / HOURS_PER_WORK_DAY;
  
  if (cycleType === 'weekly') {
    return allocatedDaysPerWeek * LEAD_TIME_HOURS_PER_DAY;
  } else {
    const weeksInCycle = 4.33; // Average weeks per month
    const allocatedDaysInCycle = allocatedDaysPerWeek * weeksInCycle;
    return allocatedDaysInCycle * LEAD_TIME_HOURS_PER_DAY;
  }
}

/**
 * Calculates progressive Project Lead Time based on elapsed days in cycle
 */
export function calculateProgressivePLT(
  cycleStart: Date,
  cycleEnd: Date,
  weeklyAllocatedHours: number,
  config: PLTConfig,
  referenceDate: Date = new Date(),
  cycleTypeParam: 'weekly' | 'monthly' = 'monthly'
): number {
  if (!config.enabled || weeklyAllocatedHours <= 0) {
    return 0;
  }

  const cycleType = determineCycleType(cycleStart, cycleEnd, referenceDate);
  
  // For past cycles, use full PLT
  if (cycleType === 'past') {
    return calculateFullPLT(weeklyAllocatedHours, config, cycleTypeParam);
  }
  
  // For future cycles, PLT = 0
  if (cycleType === 'future') {
    return 0;
  }
  
  // For current cycle, calculate progressive PLT
  const daysElapsed = Math.max(0, differenceInDays(referenceDate, cycleStart));
  
  let dailyPLT: number;
  if (config.usePercentage) {
    const weeklyPLT = weeklyAllocatedHours * config.projectLeadPercentage;
    dailyPLT = weeklyPLT / 7;
  } else {
    dailyPLT = config.hoursPerDay;
  }
  
  return daysElapsed * dailyPLT;
}

/**
 * Calculates the total billable hours based on raw execution time and billing cycle details.
 * It applies a buffer to the execution time and adds lead time based on the selected strategy.
 * 
 * Based on business requirements from Loom videos:
 * - Buffer: 1.1x multiplier on execution time (accounts for untracked work like Slack, QA, etc.)
 * - Lead Time: 2 hours per allocated work day (accounts for project management, client comm, handovers)
 * - Working days: Monday-Friday only
 * 
 * @param totalDurationMinutes The total raw execution time in minutes for the period.
 * @param billingCycleStartDate The start date of the billing cycle.
 * @param billingCycleEndDate The end date of the billing cycle.
 * @param weeklyAllocatedHours The weekly allocated hours for this client.
 * @param leadTimeStrategy The strategy to use for calculating lead time.
 * @param cycleType The type of cycle being calculated (affects lead time calculation).
 * @param includeBuffer Whether to apply the 10% buffer to execution time.
 * @param useProgressivePLT Whether to use progressive PLT calculation.
 * @param referenceDate The reference date for progressive PLT calculation.
 * @param pltConfig Optional PLT configuration (uses default if not provided).
 * @returns The total calculated billable hours.
 */
export function calculateBilledHours(
  totalDurationMinutes: number,
  billingCycleStartDate: Date,
  billingCycleEndDate: Date,
  weeklyAllocatedHours: number = 0,
  leadTimeStrategy: LeadTimeStrategy = LeadTimeStrategy.FIXED_PER_DAY,
  cycleType: 'weekly' | 'monthly' = 'monthly',
  includeBuffer: boolean = true,
  useProgressivePLT: boolean = true,
  referenceDate: Date = new Date(),
  pltConfig?: PLTConfig
): number {
  const BUFFER_MULTIPLIER = 1.1; // As specified: 1.1x factor for untracked work
  const LEAD_TIME_HOURS_PER_DAY = 2; // As specified: 2 hours per allocated work day for project lead time
  const HOURS_PER_WORK_DAY = 8; // Standard work day

  const bufferedMinutes = includeBuffer ? totalDurationMinutes * BUFFER_MULTIPLIER : totalDurationMinutes;
  
  // Get PLT configuration
  const config = pltConfig || getPLTConfig();
  
  let leadTimeMinutes = 0;
  
  switch (leadTimeStrategy) {
    case LeadTimeStrategy.NONE:
      leadTimeMinutes = 0;
      break;
    case LeadTimeStrategy.PROGRESSIVE:
      // Use progressive PLT calculation
      if (useProgressivePLT && config.enabled) {
        const progressivePLTHours = calculateProgressivePLT(
          billingCycleStartDate,
          billingCycleEndDate,
          weeklyAllocatedHours,
          config,
          referenceDate,
          cycleType
        );
        leadTimeMinutes = progressivePLTHours * 60;
      } else {
        // Fallback to fixed calculation if progressive is disabled
        leadTimeMinutes = calculateFullPLT(weeklyAllocatedHours, config, cycleType) * 60;
      }
      break;
    case LeadTimeStrategy.FIXED_PER_DAY:
      // Calculate lead time based on allocated work days (original logic)
      if (weeklyAllocatedHours > 0) {
        const allocatedDaysPerWeek = weeklyAllocatedHours / HOURS_PER_WORK_DAY;
        
        if (cycleType === 'weekly') {
          // For weekly view: only count lead time for the specific week
          const allocatedDaysInWeek = allocatedDaysPerWeek;
          leadTimeMinutes = allocatedDaysInWeek * LEAD_TIME_HOURS_PER_DAY * 60;
        } else {
          // For monthly view: use the traditional calculation
          const weeksInCycle = 4.33; // Average weeks per month
          const allocatedDaysInCycle = allocatedDaysPerWeek * weeksInCycle;
          leadTimeMinutes = allocatedDaysInCycle * LEAD_TIME_HOURS_PER_DAY * 60;
        }
      }
      break;
    case LeadTimeStrategy.PROPORTIONAL:
      // Only add lead time if there's actual work done
      if (totalDurationMinutes > 0 && weeklyAllocatedHours > 0) {
        const allocatedDaysPerWeek = weeklyAllocatedHours / HOURS_PER_WORK_DAY;
        
        if (cycleType === 'weekly') {
          // For weekly view: only count lead time for the specific week
          const allocatedDaysInWeek = allocatedDaysPerWeek;
          leadTimeMinutes = allocatedDaysInWeek * LEAD_TIME_HOURS_PER_DAY * 60;
        } else {
          // For monthly view: use the traditional calculation
          const weeksInCycle = 4.33; // Average weeks per month
          const allocatedDaysInCycle = allocatedDaysPerWeek * weeksInCycle;
          leadTimeMinutes = allocatedDaysInCycle * LEAD_TIME_HOURS_PER_DAY * 60;
        }
      }
      break;
  }

  const totalBilledMinutes = bufferedMinutes + leadTimeMinutes;

  return totalBilledMinutes / 60;
}

// Backward compatibility - keep the original function signature
export function calculateBilledHoursOriginal(
  totalDurationMinutes: number,
  billingCycleStartDate: Date,
  billingCycleEndDate: Date
): number {
  return calculateBilledHours(totalDurationMinutes, billingCycleStartDate, billingCycleEndDate, 0, LeadTimeStrategy.FIXED_PER_DAY, 'monthly', true);
} 