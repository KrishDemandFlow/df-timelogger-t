"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientCardGrid from './ClientCardGrid';
import ClientCalculations, { type ClientTimeDataRaw, type ClientTimeData } from './ClientCalculations';
import CycleSelector from './CycleSelector';

interface Props {
  rawClientData: ClientTimeDataRaw[];
  usersMap: Record<string, string>;
  initialCycle?: 'current' | 'previous' | 'this-week' | 'last-week' | 'custom';
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function DashboardClient({ 
  rawClientData, 
  usersMap, 
  initialCycle = 'current',
  initialStartDate,
  initialEndDate 
}: Props) {
  const [calculatedData, setCalculatedData] = useState<ClientTimeData[]>([]);
  const [cycle, setCycle] = useState(initialCycle as 'current' | 'previous' | 'this-week' | 'last-week' | 'custom');
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCalculatedData = useCallback((data: ClientTimeData[]) => {
    setCalculatedData(data);
  }, []);

  // Sync cycle state with URL params
  useEffect(() => {
    const urlCycle = searchParams.get('cycle') || 'current';
    setCycle(urlCycle as 'current' | 'previous' | 'this-week' | 'last-week' | 'custom');
  }, [searchParams]);

  if (calculatedData.length === 0 && rawClientData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          No client time data available. Add clients and sync ClickUp data to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <CycleSelector 
        initialCycle={initialCycle}
        initialStartDate={initialStartDate}
        initialEndDate={initialEndDate}
      /> */}
      
      <ClientCalculations 
        rawClientData={rawClientData}
        cycle={cycle}
        onCalculatedData={handleCalculatedData}
      />
      
      <ClientCardGrid 
        clientTimeData={calculatedData}
        usersMap={usersMap}
        cycle={cycle}
        startDate={initialStartDate}
        endDate={initialEndDate}
      />
    </div>
  );
} 