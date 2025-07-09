import ClientForm from '@/components/clients/ClientForm';

export default function NewClientPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <div className="w-full max-w-2xl">
          <ClientForm />
        </div>
      </div>
    </div>
  );
} 