import ClientForm from '@/components/clients/ClientForm';

export default function NewClientPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Add New Client</h1>
      <div className="max-w-md">
        <ClientForm />
      </div>
    </div>
  );
} 