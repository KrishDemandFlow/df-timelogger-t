import TimeTrackingDashboard from '@/components/dashboard/TimeTrackingDashboard';
import { Suspense } from 'react';
import Spinner from '@/components/ui/spinner';

interface PageProps {
  searchParams: { [key: string]: string | string[] };
}

export default function HomePage({ searchParams }: PageProps) {
  // Convert array values to strings and fix parameter names
  const processedSearchParams = {
    cycle: typeof searchParams.cycle === 'string' ? searchParams.cycle : undefined,
    customStart: typeof searchParams.customStart === 'string' ? searchParams.customStart : undefined,
    customEnd: typeof searchParams.customEnd === 'string' ? searchParams.customEnd : undefined,
  };

  return (
    <div className="container max-w-8xl mx-auto p-4 px-2 space-y-6">
      {/* Header row removed; controls moved into dashboard */}
      <Suspense
        fallback={
          <div className="text-center py-10 space-y-3">
            <Spinner size={36} className="mx-auto" />
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        }
      >
        <TimeTrackingDashboard searchParams={processedSearchParams} />
      </Suspense>
    </div>
  );
} 