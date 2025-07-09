import { createSupabaseServerClient } from '@/lib/supabase/server';
import ClientList from '@/components/clients/ClientList';
import type { Database } from '@/lib/supabase/database.types';

type Client = Database['public']['Tables']['Clients']['Row'];

async function getClients(): Promise<Client[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('Clients')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return data || [];
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Clients</h1>
      <ClientList initialClients={clients} />
    </div>
  );
} 