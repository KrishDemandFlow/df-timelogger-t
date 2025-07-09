import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ClientForm from '@/components/clients/ClientForm';
import type { Database } from '@/lib/supabase/database.types';

type Client = Database['public']['Tables']['Clients']['Row'];

interface EditClientPageProps {
  params: {
    id: string;
  };
}

async function getClient(id: string): Promise<Client | null> {
  const supabase = createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('Clients')
    .select('*')
    .eq('id', parseInt(id))
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const client = await getClient(params.id);

  if (!client) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-center min-h-[calc(100vh-2rem)]">
        <div className="w-full max-w-2xl">
          <ClientForm initialData={client} />
        </div>
      </div>
    </div>
  );
} 