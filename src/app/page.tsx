import TimeTrackingDashboard from '@/components/dashboard/TimeTrackingDashboard';
import { Suspense } from 'react';
import Spinner from '@/components/ui/spinner';

interface PageProps {
  searchParams: { [key: string]: string | string[] };
}

export default function HomePage({ searchParams }: PageProps) {
  const cycle = typeof searchParams.cycle === 'string' ? (searchParams.cycle as 'current' | 'previous' | 'custom') : 'current';
  const startDate = typeof searchParams.start === 'string' ? searchParams.start : undefined;
  const endDate = typeof searchParams.end === 'string' ? searchParams.end : undefined;

  return (
    <div className="container max-w-8xl mx-auto p-4 space-y-6">
      {/* Header row removed; controls moved into dashboard */}
      <Suspense
        fallback={
          <div className="text-center py-10 space-y-3">
            <Spinner size={36} className="mx-auto" />
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        }
      >
        <TimeTrackingDashboard cycle={cycle} startDate={startDate} endDate={endDate} />
      </Suspense>
    </div>
  );
} 