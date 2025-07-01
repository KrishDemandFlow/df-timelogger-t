"use client";

import { useState, useMemo, useTransition, useEffect } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns/format';
import { addMonths } from 'date-fns/addMonths';
import { subMonths } from 'date-fns/subMonths';

interface CycleSelectorProps {
  initialCycle?: 'current' | 'previous' | 'custom';
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function CycleSelector({
  initialCycle = 'current',
  initialStartDate,
  initialEndDate,
}: CycleSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [cycle, setCycle] = useState<'current' | 'previous' | 'custom'>(initialCycle);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: initialStartDate ? new Date(initialStartDate) : undefined,
    to: initialEndDate ? new Date(initialEndDate) : undefined,
  });

  const [isPending, startTransition] = useTransition();

  // Reset state when parent props change (e.g., navigating back to homepage)
  useEffect(() => {
    setCycle(initialCycle);
    setDateRange({
      from: initialStartDate ? new Date(initialStartDate) : undefined,
      to: initialEndDate ? new Date(initialEndDate) : undefined,
    });
  }, [initialCycle, initialStartDate, initialEndDate]);

  // Helper to push updated query params
  const pushParams = (params: Record<string, string | undefined>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });

    // Remove cycle param if it's 'current' and no custom dates
    if (current.get('cycle') === 'current' && !current.get('start') && !current.get('end')) {
      current.delete('cycle');
    }
    startTransition(() => {
      const qs = current.toString();
      if (qs) {
        router.replace(`${pathname}?${qs}`);
      } else {
        router.replace(pathname);
      }
    });
  };

  const handleCycleChange = (value: string) => {
    const newCycle = value as 'current' | 'previous' | 'custom';
    setCycle(newCycle);

    if (newCycle !== 'custom') {
      // Switching to predefined cycles triggers immediate data refresh
      setDateRange({ from: undefined, to: undefined });
      pushParams({ cycle: newCycle, start: undefined, end: undefined });
    }
    // For custom, wait until user picks Apply.
  };

  const handleApplyCustomRange = () => {
    if (dateRange.from && dateRange.to) {
      pushParams({
        cycle: 'custom',
        start: format(dateRange.from, 'yyyy-MM-dd'),
        end: format(dateRange.to, 'yyyy-MM-dd'),
      });
    }
  };

  // Display text for current selection
  const displayText = useMemo(() => {
    if (cycle !== 'custom') {
      return cycle === 'current' ? 'Current Cycle' : 'Previous Cycle';
    }
    // For custom, always show label, not range.
    return 'Custom Range';
  }, [cycle]);

  // After initializing state
  const today = new Date();
  const maxSelectableDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const minSelectableDate = new Date(maxSelectableDate);
  minSelectableDate.setDate(minSelectableDate.getDate() - 89); // inclusive 90-day window

  return (
    <div className="flex items-center gap-4">
      {isPending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

      <Select value={cycle} onValueChange={handleCycleChange}>
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Select cycle" aria-label={cycle}>
            {displayText}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current">Current Cycle</SelectItem>
          <SelectItem value="previous">Previous Cycle</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {cycle === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              {dateRange.from && dateRange.to
                ? `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                : 'Pick range'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange as any}
              onSelect={(range) => {
                if (!range) {
                  setDateRange({ from: undefined, to: undefined });
                } else {
                  setDateRange(range as any);
                }
              }}
              numberOfMonths={2}
              required={false}
              showOutsideDays={false}
              fromDate={minSelectableDate}
              toDate={maxSelectableDate}
              disabled={{ before: minSelectableDate, after: maxSelectableDate }}
            />
            
            <div className="flex justify-between p-3 border-t">
            <p className="px-3 pt-2 text-xs text-gray-700">
              You can select a range within the last 90&nbsp;days.
              </p>
              <Button
                variant="default"
                disabled={!(dateRange.from && dateRange.to)}
                onClick={handleApplyCustomRange}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Prev / Next arrows for quick month navigation */}
      {dateRange.from && dateRange.to && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newFrom = subMonths(dateRange.from!, 1);
              const newTo = subMonths(dateRange.to!, 1);
              if (newFrom < minSelectableDate) return;
              setDateRange({ from: newFrom, to: newTo });
              pushParams({
                cycle: 'custom',
                start: format(newFrom, 'yyyy-MM-dd'),
                end: format(newTo, 'yyyy-MM-dd'),
              });
            }}
            disabled={isPending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const newFrom = addMonths(dateRange.from!, 1);
              const newTo = addMonths(dateRange.to!, 1);
              if (newTo > maxSelectableDate) return;
              setDateRange({ from: newFrom, to: newTo });
              pushParams({
                cycle: 'custom',
                start: format(newFrom, 'yyyy-MM-dd'),
                end: format(newTo, 'yyyy-MM-dd'),
              });
            }}
            disabled={isPending}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
} 