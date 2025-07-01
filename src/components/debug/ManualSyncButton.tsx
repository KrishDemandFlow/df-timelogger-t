'use client'

import { useState } from 'react';

export default function ManualSyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();
      setResult(data);
      console.log('Sync result:', data);
    } catch (error) {
      console.error('Sync error:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={isLoading}
        className={`px-4 py-2 rounded text-white font-medium ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isLoading ? '🔄 Syncing...' : '🔄 Run Manual Sync'}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-white rounded border">
          <h4 className="font-semibold mb-2">Sync Results:</h4>
          <pre className="text-xs overflow-auto max-h-60 bg-gray-100 p-2 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 