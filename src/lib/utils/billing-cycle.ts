/**
 * Calculates the start and end dates of the current billing cycle for a given start day.
 * @param startDay The day of the month the billing cycle starts (1-31).
 * @returns An object with the start and end dates of the current billing cycle.
 */
export function getBillingCycleDates(
  startDay: number,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const today = referenceDate;
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let cycleStart = new Date(currentYear, currentMonth, startDay);
  if (today.getDate() < startDay) {
    // If today is before the start day, the cycle started last month.
    cycleStart = new Date(currentYear, currentMonth - 1, startDay);
  }

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  cycleEnd.setDate(cycleEnd.getDate() - 1);

  return { start: cycleStart, end: cycleEnd };
}

/**
 * Calculates the start and end dates of the current week (Monday to Sunday).
 * @param referenceDate The reference date to calculate the week from (defaults to today).
 * @returns An object with the start and end dates of the current week.
 */
export function getWeeklyDates(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const today = new Date(referenceDate);
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to get to Monday (start of week)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysToMonday);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday is 6 days after Monday
  
  return { start: weekStart, end: weekEnd };
}

/**
 * Calculates the start and end dates of the previous week (Monday to Sunday).
 * @param referenceDate The reference date to calculate the week from (defaults to today).
 * @returns An object with the start and end dates of the previous week.
 */
export function getLastWeekDates(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const today = new Date(referenceDate);
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to subtract to get to Monday (start of week)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - daysToMonday);
  
  // Go back 7 days from this week's start to get last week's start
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6); // Sunday is 6 days after Monday
  
  return { start: lastWeekStart, end: lastWeekEnd };
}

/**
 * Converts weekly allocated hours into the total allocated hours for a standard billing cycle.
 * @param weeklyHours The number of hours allocated per week.
 * @returns The total allocated hours for an average month.
 */
export function getBillingCycleHours(weeklyHours: number): number {
  const WEEKS_PER_MONTH = 4.33; // Average weeks per month
  return weeklyHours * WEEKS_PER_MONTH;
}

/**
 * Returns the weekly allocated hours (no conversion needed for weekly view).
 * @param weeklyHours The number of hours allocated per week.
 * @returns The weekly allocated hours.
 */
export function getWeeklyHours(weeklyHours: number): number {
  return weeklyHours;
} 