# Progressive Project Lead Time - Implementation PRD

## Executive Summary

The current Time Logger Tool shows the full Project Lead Time (PLT) at the beginning of each billing cycle, which creates misleading progress reports for clients. This PRD outlines the implementation of a "progressive" or "drip-feed" PLT system that spreads the PLT hours gradually over the billing cycle based on elapsed days.

## Current State Analysis

### Current PLT Implementation
- **Location**: `src/lib/utils/time-calculations.ts`
- **Current Logic**: Fixed PLT calculation that adds full lead time upfront
- **Formula**: `allocatedDaysInCycle * 2 hours/day`
- **Problem**: Shows 100% of PLT on day 1 of billing cycle

### Current Architecture
- PLT is calculated in `calculateBilledHours()` function
- Settings controlled via `CalculationSettingsContext` 
- UI displays PLT in `ClientCardGrid` and breakdown modals
- Supports both monthly (4.33 weeks) and weekly cycles

## Requirements

### 1. Progressive PLT Calculation

#### 1.1 Core Formula
Replace the current fixed PLT with progressive calculation:

```typescript
// New Progressive Formula
daysElapsed = (today - cycleStartDate) in calendar days
projectLeadPercentage = 25% (configurable)
weeklyProjectLeadHours = weeklyAllocatedHours * projectLeadPercentage
dailyProjectLeadHours = weeklyProjectLeadHours / 7
progressivePLT = daysElapsed * dailyProjectLeadHours
```

#### 1.2 Behavior by Cycle Type
- **Current Billing Cycle**: Use progressive PLT based on days elapsed
- **Past Billing Cycles**: Use full PLT (existing calculation)
- **Future Billing Cycles**: PLT = 0
- **Weekly Views**: Use progressive PLT within the week
- **Custom Date Ranges**: Use progressive PLT if range includes "today"

### 2. Configurable PLT Settings

#### 2.1 Configuration Structure
```typescript
interface PLTConfig {
  projectLeadPercentage: number; // Default: 25% (0.25)
  hoursPerDay: number; // Alternative to percentage, Default: 2
  usePercentage: boolean; // True = use percentage, False = use fixed hours/day
}
```

#### 2.2 Configuration Storage
- **Phase 1**: Store in environment variables or config file
- **Phase 2**: Store in Supabase settings table (future enhancement)

### 3. Updated Calculation Functions

#### 3.1 New Function: `calculateProgressivePLT`
```typescript
function calculateProgressivePLT(
  cycleStart: Date,
  cycleEnd: Date,
  weeklyAllocatedHours: number,
  config: PLTConfig,
  referenceDate: Date = new Date(),
  cycleType: 'current' | 'past' | 'future'
): number
```

#### 3.2 Modified Function: `calculateBilledHours`
- Add new parameter: `useProgressivePLT: boolean = true`
- Add new parameter: `referenceDate: Date = new Date()`
- Determine cycle type (current/past/future) internally
- Call `calculateProgressivePLT` when appropriate

### 4. UI Updates

#### 4.1 PLT Settings Control
- Extend `CalculationSettingsButton` component
- Add toggle for Progressive PLT vs Fixed PLT
- Add configuration for PLT percentage/hours per day
- Update tooltip explanations

#### 4.2 Breakdown Display Updates
- Show "Progressive PLT" vs "Full PLT" in task breakdown modals
- Add explanation: "PLT shown for [X] days elapsed of [Y] total days"
- Display formula being used

#### 4.3 Client Card Updates
- Update hover breakdown to show progressive vs full PLT
- Maintain existing percentage calculations but with new PLT values

### 5. Backward Compatibility

#### 5.1 Data Migration
- No database changes required
- Existing time logs remain unchanged
- Historical data calculations preserved

#### 5.2 Feature Toggle
- Environment variable: `ENABLE_PROGRESSIVE_PLT=true`
- Allows rollback to original calculation if needed

## Technical Implementation Plan

### Phase 1: Core Logic Implementation (Priority: High)

#### 1.1 Update Time Calculations
- **File**: `src/lib/utils/time-calculations.ts`
- **Changes**:
  - Add `PLTConfig` interface
  - Add `calculateProgressivePLT()` function
  - Add cycle type detection logic
  - Modify `calculateBilledHours()` to support progressive PLT

#### 1.2 Configuration Management
- **File**: `src/lib/config/plt-settings.ts` (new)
- **Changes**:
  - Create PLT configuration management
  - Add environment variable parsing
  - Add validation functions

#### 1.3 Update Dashboard Data Fetching
- **File**: `src/components/dashboard/TimeTrackingDashboard.tsx`
- **Changes**:
  - Pass `referenceDate` to calculation functions
  - Update `ClientTimeData` interface to include PLT breakdown
  - Add progressive PLT fields to client data

### Phase 2: UI Updates (Priority: High)

#### 2.1 Settings Component Updates
- **File**: `src/components/dashboard/CalculationSettingsButton.tsx`
- **Changes**:
  - Add Progressive PLT toggle
  - Add PLT configuration controls
  - Update context provider

#### 2.2 Context Updates
- **File**: `src/components/dashboard/CalculationSettingsContext.tsx`
- **Changes**:
  - Add progressive PLT state
  - Add PLT configuration state
  - Update context interface

#### 2.3 Display Component Updates
- **File**: `src/components/dashboard/ClientCardGrid.tsx`
- **Changes**:
  - Update breakdown calculations
  - Update tooltip explanations
  - Add progressive PLT indicators

### Phase 3: Testing & Validation (Priority: Medium)

#### 3.1 Unit Tests
- Test progressive PLT calculations
- Test cycle type detection
- Test configuration management

#### 3.2 Manual Testing Scenarios
- Test with different billing cycle start dates
- Test across month boundaries
- Test with various elapsed days
- Validate against spreadsheet calculations

## Detailed Technical Specifications

### 1. Progressive PLT Calculation Logic

```typescript
/**
 * Calculates progressive Project Lead Time based on elapsed days in cycle
 */
function calculateProgressivePLT(
  cycleStart: Date,
  cycleEnd: Date,
  weeklyAllocatedHours: number,
  config: PLTConfig,
  referenceDate: Date = new Date(),
  cycleType: 'current' | 'past' | 'future'
): number {
  // For past cycles, use full PLT
  if (cycleType === 'past') {
    return calculateFullPLT(weeklyAllocatedHours, config);
  }
  
  // For future cycles, PLT = 0
  if (cycleType === 'future') {
    return 0;
  }
  
  // For current cycle, calculate progressive PLT
  const daysElapsed = Math.max(0, differenceInDays(referenceDate, cycleStart));
  
  let dailyPLT: number;
  if (config.usePercentage) {
    const weeklyPLT = weeklyAllocatedHours * config.projectLeadPercentage;
    dailyPLT = weeklyPLT / 7;
  } else {
    dailyPLT = config.hoursPerDay;
  }
  
  return daysElapsed * dailyPLT;
}
```

### 2. Cycle Type Detection

```typescript
function determineCycleType(
  cycleStart: Date,
  cycleEnd: Date,
  referenceDate: Date = new Date()
): 'current' | 'past' | 'future' {
  if (referenceDate < cycleStart) return 'future';
  if (referenceDate > cycleEnd) return 'past';
  return 'current';
}
```

### 3. Configuration Interface

```typescript
interface PLTConfig {
  projectLeadPercentage: number; // 0.25 = 25%
  hoursPerDay: number; // Alternative fixed hours
  usePercentage: boolean; // true = use percentage, false = use fixed
  enabled: boolean; // Master toggle for progressive PLT
}

const DEFAULT_PLT_CONFIG: PLTConfig = {
  projectLeadPercentage: 0.25,
  hoursPerDay: 2,
  usePercentage: true,
  enabled: true
};
```

### 4. Updated ClientTimeData Interface

```typescript
interface ClientTimeData extends Client {
  // ... existing fields ...
  
  // New PLT-specific fields
  progressivePLTHours: number;
  fullPLTHours: number;
  pltDaysElapsed: number;
  pltTotalDays: number;
  isPLTProgressive: boolean;
  pltConfig: PLTConfig;
}
```

## Business Impact

### Positive Impacts
1. **Accurate Client Reporting**: Clients see realistic progress throughout billing cycle
2. **Better Resource Planning**: More accurate view of actual time utilization
3. **Improved Trust**: Eliminates perception of "front-loading" hours

### Risk Mitigation
1. **Backward Compatibility**: Existing historical data remains unchanged
2. **Feature Toggle**: Can disable progressive PLT if issues arise
3. **Gradual Rollout**: Can test with subset of clients first

## Success Metrics

### Primary Metrics
1. **Accuracy**: PLT should increase linearly with days elapsed
2. **Consistency**: Past cycles show full PLT, current shows progressive
3. **User Adoption**: Team uses progressive view as default

### Validation Tests
1. **Day 1 Test**: PLT should be minimal on cycle start day
2. **Mid-Cycle Test**: PLT should be ~50% at cycle midpoint
3. **End-Cycle Test**: PLT should equal full allocation at cycle end
4. **Cross-Month Test**: PLT calculation works across month boundaries

## Implementation Timeline

### Week 1: Core Logic
- Implement progressive PLT calculation functions
- Add configuration management
- Update time calculations

### Week 2: UI Integration
- Update dashboard components
- Add settings controls
- Update context providers

### Week 3: Testing & Refinement
- Unit testing
- Manual testing with real data
- Bug fixes and optimizations

### Week 4: Deployment & Monitoring
- Deploy to production
- Monitor for issues
- Gather user feedback

## Appendix

### A. Example Calculations

**Client**: Passionfruit  
**Weekly Allocated**: 8 hours  
**PLT Percentage**: 25%  
**Cycle Start**: July 17, 2025  
**Today**: July 24, 2025  
**Days Elapsed**: 7  

```
Weekly PLT = 8 * 0.25 = 2 hours
Daily PLT = 2 / 7 = 0.286 hours/day
Progressive PLT = 7 * 0.286 = 2 hours
```

### B. Configuration Examples

**Environment Variables**:
```bash
PLT_PROGRESSIVE_ENABLED=true
PLT_DEFAULT_PERCENTAGE=25
PLT_DEFAULT_HOURS_PER_DAY=2
PLT_USE_PERCENTAGE=true
```

**Future Database Schema** (Phase 2):
```sql
CREATE TABLE plt_settings (
  id SERIAL PRIMARY KEY,
  project_lead_percentage DECIMAL(3,2) DEFAULT 0.25,
  hours_per_day DECIMAL(4,2) DEFAULT 2.00,
  use_percentage BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
``` 