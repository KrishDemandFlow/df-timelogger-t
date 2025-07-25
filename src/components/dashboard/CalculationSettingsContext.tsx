"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface CalculationSettingsContextValue {
  includeLeadTime: boolean;
  setIncludeLeadTime: (value: boolean) => void;
  includeBuffer: boolean;
  setIncludeBuffer: (value: boolean) => void;
  useProgressivePLT: boolean;
  setUseProgressivePLT: (value: boolean) => void;
}

const CalculationSettingsContext = createContext<CalculationSettingsContextValue | undefined>(undefined);

export function CalculationSettingsProvider({ children }: { children: ReactNode }) {
  const [includeLeadTime, setIncludeLeadTime] = useState(true);
  const [includeBuffer, setIncludeBuffer] = useState(true);
  const [useProgressivePLT, setUseProgressivePLT] = useState(true);

  return (
    <CalculationSettingsContext.Provider value={{ 
      includeLeadTime, 
      setIncludeLeadTime, 
      includeBuffer, 
      setIncludeBuffer,
      useProgressivePLT,
      setUseProgressivePLT
    }}>
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