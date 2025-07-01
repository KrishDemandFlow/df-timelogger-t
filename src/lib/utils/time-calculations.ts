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
  PROPORTIONAL = 'proportional'
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
 * @returns The total calculated billable hours.
 */
export function calculateBilledHours(
  totalDurationMinutes: number,
  billingCycleStartDate: Date,
  billingCycleEndDate: Date,
  weeklyAllocatedHours: number = 0,
  leadTimeStrategy: LeadTimeStrategy = LeadTimeStrategy.FIXED_PER_DAY
): number {
  const BUFFER_MULTIPLIER = 1.1; // As specified: 1.1x factor for untracked work
  const LEAD_TIME_HOURS_PER_DAY = 2; // As specified: 2 hours per allocated work day for project lead time
  const HOURS_PER_WORK_DAY = 8; // Standard work day

  const bufferedMinutes = totalDurationMinutes * BUFFER_MULTIPLIER;
  
  let leadTimeMinutes = 0;
  
  switch (leadTimeStrategy) {
    case LeadTimeStrategy.NONE:
      leadTimeMinutes = 0;
      break;
    case LeadTimeStrategy.FIXED_PER_DAY:
      // Calculate lead time based on allocated work days, not total calendar days
      if (weeklyAllocatedHours > 0) {
        const allocatedDaysPerWeek = weeklyAllocatedHours / HOURS_PER_WORK_DAY;
        const weeksInCycle = 4.33; // Average weeks per month
        const allocatedDaysInCycle = allocatedDaysPerWeek * weeksInCycle;
        leadTimeMinutes = allocatedDaysInCycle * LEAD_TIME_HOURS_PER_DAY * 60;
      }
      break;
    case LeadTimeStrategy.PROPORTIONAL:
      // Only add lead time if there's actual work done
      if (totalDurationMinutes > 0 && weeklyAllocatedHours > 0) {
        const allocatedDaysPerWeek = weeklyAllocatedHours / HOURS_PER_WORK_DAY;
        const weeksInCycle = 4.33; // Average weeks per month
        const allocatedDaysInCycle = allocatedDaysPerWeek * weeksInCycle;
        leadTimeMinutes = allocatedDaysInCycle * LEAD_TIME_HOURS_PER_DAY * 60;
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
  return calculateBilledHours(totalDurationMinutes, billingCycleStartDate, billingCycleEndDate, 0, LeadTimeStrategy.FIXED_PER_DAY);
} 