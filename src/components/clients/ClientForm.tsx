'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Loader2, HelpCircle, Play } from 'lucide-react';
import type { Database } from '@/lib/supabase/database.types';

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100, 'Client name must be less than 100 characters'),
  clickup_list_id: z.string().min(1, 'ClickUp List ID is required'),
  billing_cycle_start_day: z.coerce.number().min(1, 'Must be between 1-31').max(31, 'Must be between 1-31'),
  weekly_allocated_hours: z.coerce.number().min(0.1, 'Must be at least 0.1 hours').max(168, 'Cannot exceed 168 hours per week'),
});

type ClientFormData = z.infer<typeof clientSchema>;
type Client = Database['public']['Tables']['Clients']['Row'];

interface ClientFormProps {
  initialData?: Client;
  onSuccess?: () => void;
}

export default function ClientForm({ initialData, onSuccess }: ClientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData ? {
      name: initialData.name || '',
      clickup_list_id: initialData.clickup_list_id || '',
      billing_cycle_start_day: initialData.billing_cycle_start_day || 1,
      weekly_allocated_hours: initialData.weekly_allocated_hours || 0,
    } : {
      billing_cycle_start_day: 1,
      weekly_allocated_hours: 0,
    }
  });

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    setServerError(null);
    
    try {
      const url = initialData 
        ? `/api/clients/${initialData.id}`
        : '/api/clients';
      
      const method = initialData ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        setServerError(error.error || 'Failed to save client');
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Always redirect to dashboard for both new and edited clients
        // Use full page refresh to ensure data is updated
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setServerError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Client' : 'Add New Client'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{serverError}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Client Name</Label>
            <Input
              id="name"
              type="text"
              {...register('name')}
              placeholder="Enter client name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="clickup_list_id">ClickUp List ID</Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="py-1.5 gap-2 h-auto leading-none px-2 text-xs"
                  >
                    How to
                    <HelpCircle className="h-1 w-1" />
                    
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      
                      How to Find Your ClickUp List ID
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                  
                    <div className="relative w-full bg-gray-100">
                      <video 
                        className="aspect-video  w-full h-full object-cover rounded-lg shadow-sm"
                        controls
                        autoPlay
                        preload="metadata"
                      >
                        <source 
                          src="https://cdn.jsdelivr.net/gh/KrishDemandFlow/df-timelogger-t@main/getting-clickup-%20id.mp4" 
                          type="video/mp4" 
                        />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Navigate to your ClickUp workspace</p>
                      <p>• Go to the specific List you want to track time for</p>
                      <p>• Copy the List URL, and get the ID from the URL</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Input
              id="clickup_list_id"
              type="text"
              {...register('clickup_list_id')}
              placeholder="Enter ClickUp List ID"
              className={errors.clickup_list_id ? 'border-red-500' : ''}
            />
            {errors.clickup_list_id && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.clickup_list_id.message}
              </p>
            )}
            <p className="text-sm text-gray-500">
              The Internal ClickUp List ID for this client&apos;s tasks
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_cycle_start_day">Billing Cycle Start Day</Label>
            <Input
              id="billing_cycle_start_day"
              type="number"
              min="1"
              max="31"
              {...register('billing_cycle_start_day')}
              className={errors.billing_cycle_start_day ? 'border-red-500' : ''}
            />
            {errors.billing_cycle_start_day && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.billing_cycle_start_day.message}
              </p>
            )}
            <p className="text-sm text-gray-500">
              The day of the month when the billing cycle starts.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekly_allocated_hours">Weekly Allocated Hours</Label>
            <Input
              id="weekly_allocated_hours"
              type="number"
              min="0.1"
              max="168"
              step="0.1"
              {...register('weekly_allocated_hours')}
              placeholder="e.g., 10"
              className={errors.weekly_allocated_hours ? 'border-red-500' : ''}
            />
            {errors.weekly_allocated_hours && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.weekly_allocated_hours.message}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Hours allocated per week for this client (eg: 1 Day = 8 Hours)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {initialData ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                initialData ? 'Update Client' : 'Create Client'
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/')}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 