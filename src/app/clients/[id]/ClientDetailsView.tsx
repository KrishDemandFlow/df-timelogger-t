'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Edit, ArrowLeft, Clock, Calendar, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns/format';
import type { Database } from '@/lib/supabase/database.types';

type Client = Database['public']['Tables']['Clients']['Row'];
type TimeLog = Database['public']['Tables']['TimeLogs']['Row'];

// Use the same calculation interface as the dashboard
interface ClientTimeData extends Client {
  allocatedHours: number;
  timeLogs: TimeLog[];
  usedHoursWithLeadTime: number;
  percentageUsedWithLeadTime: number;
  usedHoursWithoutLeadTime: number;
  percentageUsedWithoutLeadTime: number;
  rawHours: number;
  bufferedHours: number;
  leadTimeHours: number;
  allocatedDaysInCycle: number;
  cycleStart: string;
  cycleEnd: string;
}

interface ClientDetailsViewProps {
  client: ClientTimeData;
  recentLogs: TimeLog[];
  usersMap: Record<string, string>;
}

// Use the same formatting function as dashboard
function formatHoursMinutes(decimalHours: number): string {
  if (typeof decimalHours !== 'number' || isNaN(decimalHours) || decimalHours === 0) {
    return '0h 0m';
  }
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

function formatDuration(minutes: number): string {
  if (!minutes || isNaN(minutes)) return '0m';
  
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
}

export default function ClientDetailsView({ client, recentLogs, usersMap }: ClientDetailsViewProps) {
  // Default to WITHOUT lead time (as requested)
  const [includeLeadTime, setIncludeLeadTime] = useState(false);

  const usedHours = includeLeadTime ? client.usedHoursWithLeadTime : client.usedHoursWithoutLeadTime;
  const percentageUsed = includeLeadTime ? client.percentageUsedWithLeadTime : client.percentageUsedWithoutLeadTime;

  const getUsageColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 90) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsageBadgeVariant = (percentage: number) => {
    if (percentage > 100) return 'destructive';
    if (percentage > 80) return 'secondary';
    return 'default';
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header - back button only */}
      <div className="flex items-center">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Client name with edit button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{client.name}</h1>
        <Button asChild>
          <Link href={`/clients/${client.id}/edit`}>
            <Edit className="h-4 w-4" />
            Edit Client
          </Link>
        </Button>
      </div>

      {/* Lead Time Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="include-lead-time"
              checked={includeLeadTime}
              onCheckedChange={setIncludeLeadTime}
            />
            <Label htmlFor="include-lead-time" className="text-sm font-medium">
              Include Project Lead Time in calculations
            </Label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Project Lead Time adds 2 hours per allocated work day for project management and client communication
          </p>
        </CardContent>
      </Card>

      {/* Client Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            <div>
              <p className="text-sm font-medium text-gray-500">ClickUp List ID</p>
              <p className="text-lg font-semibold">{client.clickup_list_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Billing Cycle Start</p>
              <p className="text-lg font-semibold">Day {client.billing_cycle_start_day}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Weekly Allocated Hours</p>
              <p className="text-lg font-semibold">{client.weekly_allocated_hours || '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Current Cycle Usage */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Cycle Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Cycle Period</p>
              <p className="text-sm">
                {format(new Date(client.cycleStart), 'MMM d')} - {format(new Date(client.cycleEnd), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Hours Used</p>
              <p className="text-lg font-semibold">
                {formatHoursMinutes(usedHours)} / {formatHoursMinutes(client.allocatedHours)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Usage</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(percentageUsed)}`}
                    style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                  />
                </div>
                <Badge variant={getUsageBadgeVariant(percentageUsed)}>
                  {Math.round(percentageUsed)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Breakdown */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Time Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Raw Execution</p>
                <p className="text-lg font-semibold">{formatHoursMinutes(client.rawHours)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Buffer (10%)</p>
                <p className="text-lg font-semibold">{formatHoursMinutes(client.bufferedHours - client.rawHours)}</p>
              </div>
              {includeLeadTime && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Project Lead Time</p>
                  <p className="text-lg font-semibold">{formatHoursMinutes(client.leadTimeHours)}</p>
                </div>
              )}
            </div>
            <div className="space-y-3 mt-4">
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-500">Total Billed</p>
                <p className="text-lg font-semibold">{formatHoursMinutes(usedHours)}</p>
              </div>
              {/* <div>
                <p className="text-sm font-medium text-gray-500">Total Entries</p>
                <p className="text-lg font-semibold">{client.timeLogs.length}</p>
              </div> */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Entries */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Recent Time Entries</h3>
        {!recentLogs || recentLogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No time entries found</p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <Card key={log.id} className="border-border bg-card hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <a 
                        href={`https://app.clickup.com/t/${log.clickup_task_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium hover:underline flex items-center gap-1 text-primary line-clamp-2"
                      >
                        {log.description || 'No description'}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(log.start_time), 'MMM d, yyyy')} by {
                          usersMap[(log as any).clickup_user_id || ''] || 'Unknown User'
                        }
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground">{formatDuration(log.duration_minutes || 0)}</p>
                      <p className="text-xs text-muted-foreground">Task: {log.clickup_task_id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 