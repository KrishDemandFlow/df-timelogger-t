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
 * Converts weekly allocated hours into the total allocated hours for a standard billing cycle.
 * @param weeklyHours The number of hours allocated per week.
 * @returns The total allocated hours for an average month.
 */
export function getBillingCycleHours(weeklyHours: number): number {
  const WEEKS_PER_MONTH = 4.33; // Average weeks per month
  return weeklyHours * WEEKS_PER_MONTH;
} 