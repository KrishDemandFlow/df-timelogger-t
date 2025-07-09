"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Database } from '@/lib/supabase/database.types';
import TaskBreakdownModal from './TaskBreakdownModal';
import CycleSelector from './CycleSelector';
import CalculationSettingsButton from './CalculationSettingsButton';
import SyncButton from '@/components/sync/SyncButton';
import DeleteClientDialog from '@/components/clients/DeleteClientDialog';
import { Button } from '@/components/ui/button';
import { useCalculationSettings } from './CalculationSettingsContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, BarChart2, CalendarDays, Download, Clipboard, MoreHorizontal, Eye, Edit, Trash2, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns/format';

type Client = Database['public']['Tables']['Clients']['Row'];
type TimeLog = Database['public']['Tables']['TimeLogs']['Row'];

export type ClientTimeData = Database['public']['Tables']['Clients']['Row'] & {
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
};

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

function formatDate(dateString: string) {
  return format(new Date(dateString), 'MMM d');
}

function ClientCard({ client, usersMap, includeLeadTime, isPartOfDuplicate, duplicateInfo, cycle }: { 
    client: ClientTimeData, 
    usersMap: Record<string, string>, 
    includeLeadTime: boolean,
    isPartOfDuplicate: boolean,
    duplicateInfo: ClientTimeData[],
    cycle: 'current' | 'previous' | 'custom'
}) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAnimated, setIsAnimated] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isNavigating, setIsNavigating] = useState<'view' | 'edit' | null>(null);

    // Trigger animation on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimated(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const usedHours = includeLeadTime ? client.usedHoursWithLeadTime : client.usedHoursWithoutLeadTime;
    const percentageUsed = includeLeadTime ? client.percentageUsedWithLeadTime : client.percentageUsedWithoutLeadTime;

    const barPercent = Math.min(percentageUsed, 100);
    const animatedBarPercent = isAnimated ? barPercent : 0;
    const animatedPercentage = isAnimated ? percentageUsed : 0;

    const indicatorColor = percentageUsed > 100
      ? 'bg-red-500'
      : percentageUsed > 90
        ? 'bg-yellow-500'
        : 'bg-green-500';

    const dateRangeText = `${formatDate(client.cycleStart)} - ${formatDate(client.cycleEnd)}`;

    const handleViewDetails = () => {
        setIsNavigating('view');
        router.push(`/clients/${client.id}`);
    };

    const handleEdit = () => {
        setIsNavigating('edit');
        router.push(`/clients/${client.id}/edit`);
    };

    const handleDeleteSuccess = () => {
        // Refresh the page to update the client list
        router.refresh();
    };

    return (
        // Outer light gray card container
        <div className="p-2 bg-[#f2f2f2] border border-[#ebebeb] rounded-xl flex flex-col gap-2">
          {/* Inner white card (keeps existing duplicate highlight logic) */}
          <div className={`bg-white rounded-lg shadow-card p-3 ${
            isPartOfDuplicate ? 'border border-yellow-300 bg-yellow-50' : 'border border-transparent'
          }`}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-black bg-[#f6f6f6] p-1 rounded leading-none">{client.name}</h3>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                         <Info className="h-3 w-3 text-gray-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <h4 className="font-semibold text-sm mb-3">Client Details</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start justify-between">
                          <span className="text-gray-600">Cycle start day</span>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900 block">
                              {client.billing_cycle_start_day}
                            </span>
                            <span className="text-xs text-gray-500">every month</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Weekly hours</span>
                          <span className="font-semibold text-gray-900">{client.weekly_allocated_hours ?? '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Monthly hours</span>
                          <span className="font-semibold text-gray-900">
                            {formatHoursMinutes(client.allocatedHours)}
                            {client.weekly_allocated_hours ? (
                              <span className="text-gray-600 font-normal"> ({client.weekly_allocated_hours}h * 4.33)</span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {isPartOfDuplicate && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                        Duplicate List ID
                    </span>
                )}
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <CalendarDays className="h-4 w-4" />
                  <span>{dateRangeText}</span>
                </div>
            </div>

            {isPartOfDuplicate && duplicateInfo.length > 0 && (
              <div className="mb-4 p-2 bg-yellow-100 rounded border border-yellow-200">
                <p className="text-xs text-yellow-700">
                  <strong>⚠️ Shares List ID ({client.clickup_list_id}) with:</strong> {duplicateInfo.map(c => c.name).join(', ')}
                </p>
              </div>
            )}
            
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <div className="relative">
                        <div className="flex items-center gap-1">
                            <span className="text-2xl font-bold transition-all duration-700 ease-in-out">
                              {isAnimated ? formatHoursMinutes(usedHours) : '0h 0m'}
                            </span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 px-1 py-1 text-xs -mb-1 gap-1">
                                        <BarChart2 className="h-2.5 w-2.5 text-gray-400" />
                                        Breakdown
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64">
                                    <div className="space-y-2 text-sm">
                                        <h4 className="font-bold text-base text-gray-800 mb-2">Billed Hours Breakdown</h4>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Raw Execution:</span>
                                            <span className="font-medium text-gray-900">{formatHoursMinutes(client.rawHours)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Buffer (10%):</span>
                                            <span className="font-medium text-gray-900">{formatHoursMinutes(client.bufferedHours - client.rawHours)}</span>
                                        </div>
                                        {includeLeadTime && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Project Lead Time:</span>
                                                <span className="font-medium text-gray-900">{formatHoursMinutes(client.leadTimeHours)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-2 mt-2 border-t font-bold">
                                            <span className="text-gray-800">Total Billed:</span>
                                            <span className="text-gray-900">{formatHoursMinutes(usedHours)}</span>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <span className="text-gray-600 transition-all duration-700 ease-in-out"> / {formatHoursMinutes(client.allocatedHours)}</span>
                    </div>
                    <span className="font-bold text-lg transition-all duration-700 ease-in-out">{animatedPercentage.toFixed(0)}%</span>
                </div>
                
                {/* Custom progress bar */}
                <div className="h-2 w-full rounded-[3px] bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full ${indicatorColor} transition-all duration-700 ease-in-out`}
                    style={{ width: `${animatedBarPercent}%` }}
                  />
                </div>

                
            </div>

            <div className="mt-8 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                  className="border border-gray-200  bg-transparent hover:bg-gray-50 text-black rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                >
                    View Tasks
                </Button>

                <div className="flex items-center gap-2">
    

                  {/* Export dropdown */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border border-gray-200 bg-transparent hover:bg-gray-50 text-black rounded-md px-2.5 py-1.5 flex items-center justify-center">
                        <Download className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="min-w-[12.5rem] w-[12.5rem] p-1">
                      <div className="flex flex-col gap-1">
                        <button
                          className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
                          onClick={() => {
                            // Generate CSV content
                            const uniqueTaskIds = Array.from(new Set((client.timeLogs || []).map(t => t.clickup_task_id))).filter(Boolean);
                            const taskLinks = uniqueTaskIds.map(id => `https://app.clickup.com/t/${id}`).join(', ');
                            const usedHoursVal = includeLeadTime ? client.usedHoursWithLeadTime : client.usedHoursWithoutLeadTime;
                            const utilisedPct = (usedHoursVal / client.allocatedHours) * 100;
                            const csvHeader = [
                              'client_name',
                              'cycle_start',
                              'cycle_end',
                              'clickup_task_links',
                              'total_hours_used',
                              'hours_allocated',
                              'utilised_%',
                              'buffer_applied',
                              'remaining_hours',
                            ].join(',');
                            const csvRow = [
                              `"${client.name || ''}"`,
                              client.cycleStart,
                              client.cycleEnd,
                              `"${taskLinks}"`,
                              usedHoursVal.toFixed(2),
                              client.allocatedHours.toFixed(2),
                              utilisedPct.toFixed(1),
                              '+10%',
                              (client.allocatedHours - usedHoursVal).toFixed(2),
                            ].join(',');
                            const csvContent = `${csvHeader}\n${csvRow}`;
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            const safeName = (client.name || 'client').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            link.setAttribute('download', `${safeName}_${client.cycleStart}_${client.cycleEnd}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4" /> Export as CSV
                        </button>
                        <button
                          className="relative min-w-[195px] flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
                          onClick={() => {
                            const usedHoursVal = includeLeadTime ? client.usedHoursWithLeadTime : client.usedHoursWithoutLeadTime;
                            const utilisedPct = (usedHoursVal / client.allocatedHours) * 100;
                            const heading =
                              cycle === 'custom'
                                ? `${(client.name || '').trim()} - ${format(new Date(client.cycleStart), 'yyyy-MM-dd')} → ${format(new Date(client.cycleEnd), 'yyyy-MM-dd')} Summary`
                                : `${(client.name || '').trim()} - ${format(new Date(client.cycleStart), 'MMMM yyyy')} Summary`;

                            const dateLine = `- Date: ${format(new Date(client.cycleStart), 'yyyy-MM-dd')} to ${format(new Date(client.cycleEnd), 'yyyy-MM-dd')}`;
                            const md = `## ${heading}\n${dateLine}\n- Total hours used: ${formatHoursMinutes(usedHoursVal)}\n- Total Hours allocated: ${formatHoursMinutes(client.allocatedHours)}\n- Utilisation: ${utilisedPct.toFixed(1)}%\n- Buffer applied: +10%`;
                            navigator.clipboard.writeText(md).then(() => {
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            });
                          }}
                        >
                          <Clipboard className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy as Markdown'}
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>

                                {/* Action Menu */}
                                <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border border-gray-200 bg-transparent hover:bg-gray-50 text-black rounded-md px-2.5 py-1.5 flex items-center justify-center">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1">
                      <div className="flex flex-col gap-1">
                        <button
                          className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
                          onClick={handleViewDetails}
                          disabled={isNavigating === 'view'}
                        >
                          {isNavigating === 'view' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          View Details
                        </button>
                        <button
                          className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2"
                          onClick={handleEdit}
                          disabled={isNavigating === 'edit'}
                        >
                          {isNavigating === 'edit' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Edit className="h-4 w-4" />
                          )}
                          Edit
                        </button>
                        <button
                          className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground gap-2 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setShowDeleteDialog(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
            </div>

            <TaskBreakdownModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                client={client}
                usersMap={usersMap}
            />

            <DeleteClientDialog
                client={client}
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onSuccess={handleDeleteSuccess}
            />
          </div>
        </div>
    );
}

export default function ClientCardGrid({
  clientTimeData,
  usersMap,
  cycle,
  startDate,
  endDate,
}: {
  clientTimeData: ClientTimeData[];
  usersMap: Record<string, string>;
  cycle: 'current' | 'previous' | 'custom';
  startDate?: string;
  endDate?: string;
}) {
  const { includeLeadTime, setIncludeLeadTime } = useCalculationSettings();
  const router = useRouter();
  const [isAddingClient, setIsAddingClient] = useState(false);

  const handleAddClient = () => {
    setIsAddingClient(true);
    router.push('/clients/new');
  };

  // Check for duplicate clickup_list_ids
  const listIdGroups: Record<string, ClientTimeData[]> = {};
  clientTimeData.forEach(client => {
    if (client.clickup_list_id) {
      if (!listIdGroups[client.clickup_list_id]) {
        listIdGroups[client.clickup_list_id] = [];
      }
      listIdGroups[client.clickup_list_id].push(client);
    }
  });
  
  const duplicateListIds = Object.entries(listIdGroups).filter(([_, clients]) => clients.length > 1);

  return (
    <div className="space-y-8">
        {/* Calculation settings card removed as per new design */}
        
        {/* Date selector & settings */}
        <div className="flex justify-end items-center gap-4 flex-wrap">
          <div className="mr-auto">
            <SyncButton />
          </div>
        
          <CalculationSettingsButton />
          <CycleSelector initialCycle={cycle} initialStartDate={startDate} initialEndDate={endDate} />
          <Button onClick={handleAddClient} disabled={isAddingClient}>
            {isAddingClient ? (
              <Loader2 className="h-4 w-4 mr-0 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2 hidden" />
            )}
            Add New Client
          </Button>
        </div>

        {duplicateListIds.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Duplicate ClickUp List IDs Detected</h3>
            <p className="text-yellow-700 mb-3">
              Multiple clients share the same ClickUp List ID. This can cause sync issues where time entries only appear for one client.
            </p>
            <div className="space-y-2">
              {duplicateListIds.map(([listId, clients]) => (
                <div key={listId} className="bg-yellow-100 p-3 rounded">
                  <p className="font-medium text-yellow-800">
                    List ID: {listId}
                  </p>
                  <p className="text-yellow-700">
                    Shared by: {clients.map(c => c.name).join(', ')}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-yellow-600 mt-2">
              💡 To fix this, either delete duplicate clients or assign unique ClickUp List IDs.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {clientTimeData.map((client, index) => {
                const isPartOfDuplicate = duplicateListIds.some(([listId]) => listId === client.clickup_list_id);
                const duplicateInfo = isPartOfDuplicate 
                  ? listIdGroups[client.clickup_list_id || '']?.filter(c => c.id !== client.id) 
                  : [];
                
                return (
                    <div 
                        key={client.id}
                        className="opacity-0 translate-y-4 animate-fade-in-up"
                        style={{ 
                            animationDelay: `${index * 100}ms`,
                            animationFillMode: 'forwards'
                        }}
                    >
                    <ClientCard 
                        client={client}
                        usersMap={usersMap}
                        includeLeadTime={includeLeadTime}
                        isPartOfDuplicate={isPartOfDuplicate}
                        duplicateInfo={duplicateInfo}
                        cycle={cycle}
                    />
                    </div>
                );
            })}
        </div>
    </div>
  );
} 


