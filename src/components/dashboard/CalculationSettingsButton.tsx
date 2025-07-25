"use client";

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCalculationSettings } from './CalculationSettingsContext';
import { getPLTConfig } from '@/lib/config/plt-settings';
import { Settings2, SlidersHorizontal, Badge } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CalculationSettingsButton() {
  const { 
    includeLeadTime, 
    setIncludeLeadTime, 
    includeBuffer, 
    setIncludeBuffer,
    useProgressivePLT,
    setUseProgressivePLT
  } = useCalculationSettings();

  // Get PLT configuration from environment variables
  const pltConfig = getPLTConfig();
  const pltPercentage = Math.round(pltConfig.projectLeadPercentage * 100);

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
      <PopoverContent className="w-[23rem]">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Calculation Settings</h4>
          
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm">Buffer (10%)</span>
            <Switch checked={includeBuffer} onCheckedChange={setIncludeBuffer} />
          </div>
          <p className="text-xs text-muted-foreground leading-snug">
            When enabled, a <strong>10%</strong> buffer is added to execution time.
          </p>
          
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Project Lead Time</span>
              <Switch checked={includeLeadTime} onCheckedChange={setIncludeLeadTime} />
            </div>
            <p className="text-xs text-muted-foreground leading-snug mt-1">
              When enabled, project lead time is added to account for project management, client communication, and handovers.
            </p>
          </div>

          {includeLeadTime && (
            <div className="bg-gray-50 p-3 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progressive PLT</span>
                <Switch checked={useProgressivePLT} onCheckedChange={setUseProgressivePLT} />
              </div>
              
              {useProgressivePLT ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground leading-snug">
                    PLT is spread gradually over the billing cycle based on days elapsed.
                  </p>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-2">
                    <p className="text-xs text-gray-700 leading-snug">
                      <strong>PLT Configuration:</strong> Currently set to <strong>{pltPercentage}%</strong> of allocated hours
                    </p>
                    <p className="text-xs text-gray-600 leading-snug mt-1">
                      To modify PLT settings, update environment variables in Vercel:
                    </p>
                    <div className="bg-gray-100 rounded px-2 py-1 mt-1 font-mono font-medium text-xs text-gray-800">
                      PLT_DEFAULT_PERCENTAGE={pltPercentage}<br/>
                      PLT_DEFAULT_HOURS_PER_DAY={pltConfig.hoursPerDay}<br/>
                      PLT_USE_PERCENTAGE={pltConfig.usePercentage.toString()}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-snug">
                  <strong>Fixed PLT:</strong> Full lead time shown from day 1<br/>
                  <strong>Weekly:</strong> allocated days × 2h/day<br/>
                  <strong>Monthly:</strong> allocated days × 4.33 weeks × 2h/day
                </p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 