import ClientList from '@/components/clients/ClientList';

export default function ClientsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Clients</h1>
      <ClientList />
    </div>
  );
} 