"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface CalculationSettingsContextValue {
  includeLeadTime: boolean;
  setIncludeLeadTime: (value: boolean) => void;
}

const CalculationSettingsContext = createContext<CalculationSettingsContextValue | undefined>(undefined);

export function CalculationSettingsProvider({ children }: { children: ReactNode }) {
  const [includeLeadTime, setIncludeLeadTime] = useState(false);

  return (
    <CalculationSettingsContext.Provider value={{ includeLeadTime, setIncludeLeadTime }}>
      {children}
    </CalculationSettingsContext.Provider>
  );
}

export function useCalculationSettings() {
  const ctx = useContext(CalculationSettingsContext);
  if (!ctx) {
    throw new Error('useCalculationSettings must be used within CalculationSettingsProvider');
  }
  return ctx;
} 