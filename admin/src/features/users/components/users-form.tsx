'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import * as z from 'zod';
import { ROLE_OPTIONS } from './users-tables/options';
import { User } from '@/types/entity';
import { usersService } from '@/lib/api/users.service';

// Extract role values from ROLE_OPTIONS for type safety
const roleValues = ROLE_OPTIONS.map((option) => option.value) as [
  string,
  ...string[]
];

export default function UsersForm({
  initialData,
  pageTitle
}: {
  initialData: User | null;
  pageTitle: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData?.id;

  // Create dynamic schema based on edit mode
  const createFormSchema = (isEditing: boolean) => {
    const baseSchema = {
      firstName: z.string().min(2, {
        message: 'User first name must be at least 2 characters.'
      }),
      lastName: z.string().min(2, {
        message: 'User last name must be at least 2 characters.'
      }),
      email: z.string().email({
        message: 'Please enter a valid email address.'
      }),
      password: z.string().optional(),
      role: z.enum(roleValues, {
        required_error: 'Please select a role.'
      })
    };

    if (isEditing) {
      return z.object({
        ...baseSchema,
        password: z.string().optional()
      });
    } else {
      return z.object({
        ...baseSchema,
        password: z.string().min(6, {
          message: 'Password must be at least 6 characters.'
        })
      });
    }
  };

  const formSchema = createFormSchema(isEditing);

  const defaultValues = {
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    role: (initialData?.role || 'USER') as (typeof roleValues)[number],
    ...(isEditing ? { password: '' } : { password: '' }) // Always include password field
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      if (initialData?.id) {
        // Update existing user
        // For updates, only include password if it's not empty
        const updatePayload = { ...values };
        if (!values.password || values.password.trim() === '') {
          delete updatePayload.password;
        }

        await usersService.updateUser(initialData.id.toString(), updatePayload);
        toast.success('User updated successfully');
      } else {
        // Create new user - ensure password is present
        if (!values.password) {
          toast.error('Password is required for new users');
          setIsSubmitting(false);
          return;
        }
        await usersService.createUser({
          ...values,
          password: values.password
        });
        toast.success('User created successfully');
      }

      router.push('/dashboard/users');
      router.refresh();
    } catch (error: any) {
      // Handle different types of errors
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.errors) {
        // Handle validation errors from backend
        const errors = error.response.data.errors;
        if (Array.isArray(errors)) {
          errors.forEach((err: any) => {
            toast.error(`${err.field}: ${err.message}`);
          });
        } else {
          toast.error('Validation failed');
        }
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className='w-full md:w-1/2'>
      <CardHeader>
        <CardTitle className='text-left text-2xl font-bold'>
          {pageTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-1'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter first name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter last name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='Enter email address'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password{' '}
                      {isEditing && (
                        <span className='text-muted-foreground'>
                          (leave empty to keep current)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder={
                          isEditing
                            ? 'Enter new password (optional)'
                            : 'Enter password'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select role' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  {initialData ? 'Updating...' : 'Creating...'}
                </>
              ) : initialData ? (
                'Update User'
              ) : (
                'Create User'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
