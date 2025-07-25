"use client";

import { useEffect, useMemo } from 'react';
import { calculateBilledHours, LeadTimeStrategy, calculateProgressivePLT, determineCycleType } from '@/lib/utils/time-calculations';
import { PLTConfig } from '@/lib/config/plt-settings';
import { useCalculationSettings } from './CalculationSettingsContext';
import { getPLTConfig } from '@/lib/config/plt-settings';
import type { Database } from '@/lib/supabase/database.types';

type Client = Database['public']['Tables']['Clients']['Row'];
type TimeLog = Database['public']['Tables']['TimeLogs']['Row'];

export interface ClientTimeDataRaw extends Client {
  allocatedHours: number;
  timeLogs: TimeLog[];
  cycleStart: string;
  cycleEnd: string;
}

export interface ClientTimeData extends ClientTimeDataRaw {
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
  // New PLT-specific fields
  progressivePLTHours: number;
  fullPLTHours: number;
  pltDaysElapsed: number;
  pltTotalDays: number;
  isPLTProgressive: boolean;
  cycleType: 'current' | 'past' | 'future';
}

interface Props {
  rawClientData: ClientTimeDataRaw[];
  cycle: 'current' | 'previous' | 'this-week' | 'last-week' | 'custom';
  onCalculatedData: (data: ClientTimeData[]) => void;
}

export default function ClientCalculations({ rawClientData, cycle, onCalculatedData }: Props) {
  const { 
    includeLeadTime, 
    includeBuffer, 
    useProgressivePLT
  } = useCalculationSettings();

  const calculatedData = useMemo(() => {
    const today = new Date();
    
    // Get PLT config from environment variables, only allow UI to control progressive toggle
    const envPltConfig = getPLTConfig();
    const pltConfig: PLTConfig = {
      ...envPltConfig,
      enabled: useProgressivePLT // Only this setting is controlled by UI
    };

    return rawClientData.map(client => {
      const cycleStart = new Date(client.cycleStart);
      const cycleEnd = new Date(client.cycleEnd);
      const cycleTypeParam = cycle === 'this-week' || cycle === 'last-week' ? 'weekly' : 'monthly';

      // Calculate total duration
      const totalDurationMinutes = (client.timeLogs || []).reduce(
        (sum, log) => sum + log.duration_minutes, 
        0
      );

      // Determine cycle type and PLT information
      const cycleTypeResult = determineCycleType(cycleStart, cycleEnd, today);
      const isPLTProgressive = cycleTypeResult === 'current' && pltConfig.enabled && includeLeadTime && useProgressivePLT;
      
      // Calculate progressive and full PLT for comparison
      const progressivePLTHours = calculateProgressivePLT(
        cycleStart,
        cycleEnd,
        client.weekly_allocated_hours || 0,
        pltConfig,
        today,
        cycleTypeParam
      );
      
      const fullPLTHours = calculateBilledHours(
        0, // No execution time for pure PLT calculation
        cycleStart,
        cycleEnd,
        client.weekly_allocated_hours || 0,
        LeadTimeStrategy.FIXED_PER_DAY,
        cycleTypeParam,
        false // No buffer for pure PLT
      );

      // Calculate PLT timing information
      const pltDaysElapsed = Math.max(0, Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));
      const pltTotalDays = Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Determine which lead time strategy to use based on UI settings
      const leadTimeStrategy = includeLeadTime 
        ? (useProgressivePLT ? LeadTimeStrategy.PROGRESSIVE : LeadTimeStrategy.FIXED_PER_DAY)
        : LeadTimeStrategy.NONE;

      // Calculate all combinations of buffer and lead time
      const usedHoursWithLeadTime = calculateBilledHours(
        totalDurationMinutes,
        cycleStart,
        cycleEnd,
        client.weekly_allocated_hours || 0,
        leadTimeStrategy,
        cycleTypeParam,
        includeBuffer,
        useProgressivePLT,
        today,
        pltConfig
      );

      const usedHoursWithoutLeadTime = calculateBilledHours(
        totalDurationMinutes,
        cycleStart,
        cycleEnd,
        client.weekly_allocated_hours || 0,
        LeadTimeStrategy.NONE,
        cycleTypeParam,
        includeBuffer
      );

      const usedHoursWithLeadTimeNoBuffer = calculateBilledHours(
        totalDurationMinutes,
        cycleStart,
        cycleEnd,
        client.weekly_allocated_hours || 0,
        leadTimeStrategy,
        cycleTypeParam,
        false,
        useProgressivePLT,
        today,
        pltConfig
      );

      const usedHoursWithoutLeadTimeNoBuffer = calculateBilledHours(
        totalDurationMinutes,
        cycleStart,
        cycleEnd,
        client.weekly_allocated_hours || 0,
        LeadTimeStrategy.NONE,
        cycleTypeParam,
        false
      );

      const percentageUsedWithLeadTime = client.allocatedHours > 0 ? (usedHoursWithLeadTime / client.allocatedHours) * 100 : 0;
      const percentageUsedWithoutLeadTime = client.allocatedHours > 0 ? (usedHoursWithoutLeadTime / client.allocatedHours) * 100 : 0;
      const percentageUsedWithLeadTimeNoBuffer = client.allocatedHours > 0 ? (usedHoursWithLeadTimeNoBuffer / client.allocatedHours) * 100 : 0;
      const percentageUsedWithoutLeadTimeNoBuffer = client.allocatedHours > 0 ? (usedHoursWithoutLeadTimeNoBuffer / client.allocatedHours) * 100 : 0;

      // Calculation breakdown values
      const rawHours = totalDurationMinutes / 60;
      const bufferedHours = rawHours * 1.1;
      const allocatedDaysPerWeek = (client.weekly_allocated_hours || 0) / 8;
      const allocatedDaysInCycle = cycle === 'this-week' || cycle === 'last-week' ? allocatedDaysPerWeek : allocatedDaysPerWeek * 4.33;
      
      // Use progressive PLT hours for display when active, fallback to traditional calculation
      const leadTimeHours = isPLTProgressive ? progressivePLTHours : 
                           includeLeadTime ? fullPLTHours : 0;

      return {
        ...client,
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
        // New PLT-specific fields
        progressivePLTHours,
        fullPLTHours,
        pltDaysElapsed,
        pltTotalDays,
        isPLTProgressive,
        cycleType: cycleTypeResult
      };
    });
  }, [rawClientData, cycle, includeLeadTime, includeBuffer, useProgressivePLT]);

  useEffect(() => {
    onCalculatedData(calculatedData);
  }, [calculatedData, onCalculatedData]);

  return null; // This component only handles calculations
} 