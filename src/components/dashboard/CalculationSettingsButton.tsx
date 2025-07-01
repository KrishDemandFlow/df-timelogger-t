"use client";

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useCalculationSettings } from './CalculationSettingsContext';
import { Settings2, SlidersHorizontal, Badge } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CalculationSettingsButton() {
  const { includeLeadTime, setIncludeLeadTime } = useCalculationSettings();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Calculation settings">
          <SlidersHorizontal className="h-5 w-5" />
          {includeLeadTime && (
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Calculation Settings</h4>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm">Project Lead Time</span>
            <Switch checked={includeLeadTime} onCheckedChange={setIncludeLeadTime} />
          </div>
          <p className="text-xs text-muted-foreground pt-2 leading-snug">
            When enabled, <strong>2&nbsp;h</strong> of lead time is added for each working day in the selected cycle.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
} 