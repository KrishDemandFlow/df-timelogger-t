"use client";

import type { ClientTimeData } from './ClientCardGrid';
import type { Database } from '@/lib/supabase/database.types';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimeLog = Database['public']['Tables']['TimeLogs']['Row'];

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

export default function TaskBreakdownModal({ 
    isOpen, 
    onClose, 
    client, 
    usersMap 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    client: ClientTimeData, 
    usersMap: Record<string, string> 
}) {
    if (!isOpen) return null;

    // Calculate total raw duration across all time logs
    const totalDurationHours = client.timeLogs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60;

    // Sort time logs by start_time in descending order (newest first)
    const sortedTimeLogs = [...client.timeLogs].sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    // Group the sorted logs by their date string keeping the insertion order (already newest first)
    const groupedTimeLogs = sortedTimeLogs.reduce((acc, log) => {
        const date = new Date(log.start_time).toDateString();
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(log);
        return acc;
    }, {} as Record<string, TimeLog[]>);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader className="pb-4">
                    <DialogTitle className="text-xl font-semibold">
                        {client.name} - Task Breakdown
                    </DialogTitle>
                    <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Raw execution time (no buffer)</span>
                        <Badge variant="outline" className="font-medium">
                            {formatHoursMinutes(totalDurationHours)}
                        </Badge>
                    </div>
                </DialogHeader>
                <ScrollArea className="h-[70vh] pr-4">
                    <div className="space-y-6">
                        {Object.entries(groupedTimeLogs)
                            // Ensure the date groups themselves are ordered newest first
                            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                            .map(([date, logs]) => {
                                const dailyTotal = logs.reduce((sum, log) => sum + log.duration_minutes, 0) / 60;
                                return (
                                    <div key={date} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="font-medium">
                                                    {new Date(date).toLocaleDateString('en-US', { 
                                                        weekday: 'short', 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })}
                                                </h3>
                                            </div>
                                            <Badge variant="outline" className="font-medium">
                                                {formatHoursMinutes(dailyTotal)}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {logs.map(log => (
                                                <div 
                                                    key={log.id} 
                                                    className={cn(
                                                        "rounded-lg border bg-card p-3",
                                                        "hover:bg-accent/50 transition-colors"
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0 flex-1">
                                                            <a 
                                                                href={`https://app.clickup.com/t/${log.clickup_task_id}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-sm font-medium hover:underline line-clamp-2"
                                                            >
                                                                {log.description || 'No description'}
                                                            </a>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {usersMap[(log as any).clickup_user_id ?? ''] || 'Unknown User'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                                            <Clock className="h-3 w-3" />
                                                            {formatHoursMinutes(log.duration_minutes / 60)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        {client.timeLogs.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                <p>No time entries logged for this billing cycle.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
} 