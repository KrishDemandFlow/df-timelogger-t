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
import { AlertCircle, Loader2, HelpCircle } from 'lucide-react';
import type { Database } from '@/lib/supabase/database.types';

const teamMemberSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50, 'Username must be less than 50 characters'),
  clickup_user_id: z.string().min(1, 'ClickUp User ID is required'),
});

type TeamMemberFormData = z.infer<typeof teamMemberSchema>;
type TeamMember = Database['public']['Tables']['ClickUpUsers']['Row'];

interface TeamMemberFormProps {
  initialData?: TeamMember;
  onSuccess: () => void;
}

export default function TeamMemberForm({ initialData, onSuccess }: TeamMemberFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: initialData ? {
      username: initialData.username,
      clickup_user_id: initialData.clickup_user_id,
    } : undefined,
  });

  const onSubmit = async (data: TeamMemberFormData) => {
    setIsSubmitting(true);

    try {
      const url = initialData
        ? `/api/team-members/${initialData.id}`
        : '/api/team-members';

      const method = initialData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        // Handle server errors
        if (result.error) {
          if (typeof result.error === 'string') {
            setError('root', { message: result.error });
          } else {
            // Handle Zod validation errors
            Object.entries(result.error).forEach(([field, errors]) => {
              if (field === 'username' || field === 'clickup_user_id') {
                setError(field, { message: (errors as any)?._errors?.[0] || 'Invalid value' });
              }
            });
          }
        }
      }
    } catch (error) {
      setError('root', { message: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Team Member' : 'Add New Team Member'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Display root errors */}
          {errors.root && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{errors.root.message}</span>
              </div>
            </div>
          )}

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              {...register('username')}
              placeholder="Enter username"
              className={errors.username ? 'border-red-500' : ''}
            />
            {errors.username && (
              <p className="text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          {/* ClickUp User ID */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="clickup_user_id">ClickUp User ID *</Label>
                              <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-auto p-1">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>How to find ClickUp User ID</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="w-full">
                        <video
                          className="w-full h-auto rounded-lg"
                          controls
                          autoPlay
                          muted
                          loop
                        >
                          <source src="https://cdn.jsdelivr.net/gh/KrishDemandFlow/df-timelogger-t@main/team-member-id.mp4" type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      <div className="space-y-3 text-sm">
                        <p className='font-semibold' >To find a ClickUp User ID:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Go to your ClickUp workspace</li>
                          <li>Open the Teams page</li>
                          <li>Click on the 3 dots on the right of the user card</li>
                          <li>Click on <b>Copy member ID</b></li>
                        </ol>
                       
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
            </div>
            <Input
              id="clickup_user_id"
              {...register('clickup_user_id')}
              placeholder="Enter ClickUp User ID"
              className={errors.clickup_user_id ? 'border-red-500' : ''}
            />
            {errors.clickup_user_id && (
              <p className="text-sm text-red-600">{errors.clickup_user_id.message}</p>
            )}
          </div>

          {/* Submit buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {initialData ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                initialData ? 'Update Team Member' : 'Add Team Member'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 