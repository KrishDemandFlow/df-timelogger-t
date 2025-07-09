import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

export default function ClientsLoading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Skeleton className="h-10 w-full pl-10" />
      </div>

      {/* Client cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-2 bg-[#f2f2f2] border border-[#ebebeb] rounded-xl flex flex-col gap-2">
            {/* Client name */}
            <div className="bg-white rounded-lg px-4 py-3">
              <Skeleton className="h-6 w-32" />
            </div>

            {/* Client details */}
            <div className="bg-white rounded-lg p-4 text-sm space-y-3">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" disabled className="w-full">
                Loading...
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled className="flex-1">
                  Edit
                </Button>
                <Button variant="outline" size="sm" disabled className="flex-1">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 