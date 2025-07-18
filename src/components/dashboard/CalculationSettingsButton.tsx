"use client";

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useCalculationSettings } from './CalculationSettingsContext';
import { Settings2, SlidersHorizontal, Badge } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CalculationSettingsButton() {
  const { includeLeadTime, setIncludeLeadTime, includeBuffer, setIncludeBuffer } = useCalculationSettings();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Calculation settings">
          <SlidersHorizontal className="h-5 w-5" />
          {(includeLeadTime || includeBuffer) && (
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-green-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Calculation Settings</h4>
          
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm">Buffer (10%)</span>
            <Switch checked={includeBuffer} onCheckedChange={setIncludeBuffer} />
          </div>
          <p className="text-xs text-muted-foreground leading-snug">
            When enabled, a <strong>10%</strong> buffer is added to execution time.
          </p>
          
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm">Project Lead Time</span>
            <Switch checked={includeLeadTime} onCheckedChange={setIncludeLeadTime} />
          </div>
          <p className="text-xs text-muted-foreground leading-snug">
            When enabled, <strong>2&nbsp;h</strong> of lead time is added for each allocated working day. This accounts for project management, client communication, and handovers.
          </p>
          <p className="text-xs text-muted-foreground pt-1 leading-snug">
            <strong>Weekly:</strong> allocated days × 2h/day<br/>
            <strong>Monthly:</strong> allocated days × 4.33 weeks × 2h/day
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
} 