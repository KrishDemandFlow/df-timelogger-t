'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  clickup_list_id: z.string().min(1, 'ClickUp List ID is required'),
  billing_cycle_start_day: z.coerce.number().min(1).max(31),
  weekly_allocated_hours: z.coerce.number().min(0),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  // TODO: Add props for initial data for editing
}

export default function ClientForm({}: ClientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setServerError(errorData.error || 'Something went wrong');
      setIsSubmitting(false);
      return;
    }

    // Redirect to the clients list page upon success
    router.push('/'); // Assuming '/' is the main page with the client list
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{serverError}</p>
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Client Name
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="clickup_list_id" className="block text-sm font-medium text-gray-700">
          ClickUp List ID
        </label>
        <input
          id="clickup_list_id"
          type="text"
          {...register('clickup_list_id')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.clickup_list_id && <p className="mt-2 text-sm text-red-600">{errors.clickup_list_id.message}</p>}
      </div>

      <div>
        <label htmlFor="billing_cycle_start_day" className="block text-sm font-medium text-gray-700">
          Billing Cycle Start Day (1-31)
        </label>
        <input
          id="billing_cycle_start_day"
          type="number"
          {...register('billing_cycle_start_day')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.billing_cycle_start_day && <p className="mt-2 text-sm text-red-600">{errors.billing_cycle_start_day.message}</p>}
      </div>

      <div>
        <label htmlFor="weekly_allocated_hours" className="block text-sm font-medium text-gray-700">
          Weekly Allocated Hours
        </label>
        <input
          id="weekly_allocated_hours"
          type="number"
          step="0.1"
          {...register('weekly_allocated_hours')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.weekly_allocated_hours && <p className="mt-2 text-sm text-red-600">{errors.weekly_allocated_hours.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Client'}
      </button>
    </form>
  );
} 