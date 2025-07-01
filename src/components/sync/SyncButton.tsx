'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SyncResult {
  message?: string;
  result?: any;
  timestamp: string | null;
}

export default function SyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the latest sync timestamp on initial render
  useEffect(() => {
    const fetchLastSync = async () => {
      try {
        const res = await fetch('/api/last-sync');
        if (!res.ok) {
          throw new Error(`Failed to fetch last sync: ${res.status}`);
        }
        const data: { lastSynced: string | null } = await res.json();
        if (data.lastSynced) {
          setLastSync({ message: '', timestamp: data.lastSynced });
        }
      } catch (err) {
        console.error('Error fetching last sync time:', err);
      }
    };

    fetchLastSync();
  }, []);

  const handleSync = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting sync request...');
      
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add a 65 second timeout for the fetch request (Edge Functions have 60s limit)
        signal: AbortSignal.timeout(65000),
      });

      console.log('Sync API response status:', response.status);
      console.log('Sync API response headers:', Object.fromEntries(response.headers.entries()));
      
      // Get response text first to check if it's empty
      const responseText = await response.text();
      console.log('Sync API response text:', responseText);
      
      if (!responseText.trim()) {
        throw new Error(`Empty response from server (HTTP ${response.status})`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      console.log('Sync API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${data.details || 'Sync failed'}`);
      }

      setLastSync(data);
      
      // Refresh the page after successful sync to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        onClick={handleSync}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          'Run Manual Sync'
        )}
      </Button>

      {/* Auto-sync info + last sync timestamp */}
      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1">
        <span>Auto-sync every <b>30&nbsp;min</b></span>
        {lastSync?.timestamp && (
          <>
            <span className="select-none">&middot;</span>
            <span>
              Last synced:&nbsp;<b>
              {new Date(lastSync.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              ,&nbsp;
              {new Date(lastSync.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
              </b>
            </span>
          </>
        )}
      </div>

      {/* Success message */}
      {lastSync?.message && !error && (
        <div className="text-sm text-green-600">
          ✅ {lastSync.message}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 max-w-[900px]">
           {error} - The sync may have completed successfully, but the page may not have updated. <b>Please refresh the page.</b>
        </div>
      )}
    </div>
  );
} 