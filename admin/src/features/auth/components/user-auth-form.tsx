'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authService } from '@/lib/api/auth.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { ChevronRightIcon, AlertCircle } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
});

type UserFormValue = z.infer<typeof formSchema>;

export default function UserAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const defaultValues = {
    email: '',
    password: ''
  };

  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: UserFormValue) => {
    setError('');
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await authService.signIn(data.email, data.password);

        if (result.user.role === 'ADMIN' || result.user.role === 'SUPPORT') {
          toast.success(`Welcome back, ${result.user.firstName}!`);

          // Redirect to dashboard or callback URL
          router.push(callbackUrl);
          router.refresh();
        } else if (
          result.user.role === 'USER' ||
          result.user.role === 'NURSE'
        ) {
          toast.error(
            `The ${result.user.role.charAt(0).toUpperCase() + result.user.role.slice(1).toLowerCase()} role cannot log in to the dashboard, ${result.user.firstName}!`
          );
        }
      } catch (err: any) {
        console.error('Login error:', err);

        // Handle validation errors for specific fields
        if (err.errors && Array.isArray(err.errors)) {
          const newFieldErrors: Record<string, string> = {};
          err.errors.forEach((error: any) => {
            if (error.field) {
              newFieldErrors[error.field] = error.message;
            }
          });
          setFieldErrors(newFieldErrors);
        }

        // Set general error message
        setError(err.error || 'Login failed. Please try again.');

        // Show toast for immediate feedback
        toast.error(err.error || 'Login failed. Please try again.');
      }
    });
  };

  return (
    <Card className='w-full max-w-md'>
      <CardContent className='space-y-6 pt-6'>
        {error && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='w-full space-y-6'
          >
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='Enter your email address'
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage>
                    {fieldErrors.email || form.formState.errors.email?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder='Enter your password'
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage>
                    {fieldErrors.password ||
                      form.formState.errors.password?.message}
                  </FormMessage>
                </FormItem>
              )}
            />

            <Button
              disabled={loading}
              className='mt-2 ml-auto w-full'
              type='submit'
            >
              {loading ? 'Signing In...' : 'Sign In'} <ChevronRightIcon />
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
