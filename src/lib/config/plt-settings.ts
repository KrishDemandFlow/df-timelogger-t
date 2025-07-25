export interface PLTConfig {
  projectLeadPercentage: number; // 0.25 = 25%
  hoursPerDay: number; // Alternative fixed hours
  usePercentage: boolean; // true = use percentage, false = use fixed
  enabled: boolean; // Master toggle for progressive PLT
}

export const DEFAULT_PLT_CONFIG: PLTConfig = {
  projectLeadPercentage: 0.25, // 25%
  hoursPerDay: 2,
  usePercentage: true,
  enabled: true
};

/**
 * Gets PLT configuration from environment variables with fallback to defaults
 */
export function getPLTConfig(): PLTConfig {
  return {
    projectLeadPercentage: parseFloat(process.env.PLT_DEFAULT_PERCENTAGE || '25') / 100,
    hoursPerDay: parseFloat(process.env.PLT_DEFAULT_HOURS_PER_DAY || '2'),
    usePercentage: process.env.PLT_USE_PERCENTAGE !== 'false',
    enabled: process.env.PLT_PROGRESSIVE_ENABLED !== 'false'
  };
}

/**
 * Validates PLT configuration values
 */
export function validatePLTConfig(config: PLTConfig): boolean {
  return (
    config.projectLeadPercentage >= 0 &&
    config.projectLeadPercentage <= 1 &&
    config.hoursPerDay > 0 &&
    config.hoursPerDay <= 24
  );
} 