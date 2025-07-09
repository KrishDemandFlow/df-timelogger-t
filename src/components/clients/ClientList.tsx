'use client';

import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import ClientCard from './ClientCard';
import type { Database } from '@/lib/supabase/database.types';

type Client = Database['public']['Tables']['Clients']['Row'];

interface ClientListProps {
  initialClients: Client[];
}

export default function ClientList({ initialClients }: ClientListProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clickup_list_id?.includes(searchTerm)
  );

  // Refresh clients list
  const refreshClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const updatedClients = await response.json();
        setClients(updatedClients);
      }
    } catch (error) {
      console.error('Error refreshing clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientDeleted = () => {
    refreshClients();
  };

  const handleAddClient = () => {
    router.push('/clients/new');
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No clients</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first client.
          </p>
          <div className="mt-6">
            <Button onClick={handleAddClient} className="inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <Button onClick={handleAddClient} className="inline-flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {searchTerm ? (
          <>
            {filteredClients.length} of {clients.length} clients
            {searchTerm && (
              <span className="ml-2">
                matching "{searchTerm}"
              </span>
            )}
          </>
        ) : (
          <>{clients.length} clients</>
        )}
      </div>

      {/* Client grid */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard 
              key={client.id} 
              client={client} 
              onClientDeleted={handleClientDeleted}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto max-w-md">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search term or add a new client.
            </p>
            <div className="mt-6">
              <Button onClick={handleAddClient} className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 