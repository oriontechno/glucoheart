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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { discussionsService } from '@/lib/api/discussions.service';
import { useReactTable } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { Discussion } from '@/types/chat';

const formSchema = z.object({
  topic: z.string().min(2, {
    message: 'Discussion name must be at least 2 characters.'
  }),
  description: z.string().optional(),
  is_public: z.boolean().default(false)
});

export default function DiscussionsForm({
  initialData,
  pageTitle
}: {
  initialData: Discussion | null;
  pageTitle: string;
}) {
  const router = useRouter();

  const defaultValues = {
    topic: initialData?.topic || '',
    description: initialData?.description || '',
    is_public: initialData?.is_public || false
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Add timestamps for new Discussions
    const articleData = {
      ...values
    };

    try {
      if (initialData?.id) {
        const result = await discussionsService.update(
          initialData.id,
          articleData
        );
      } else {
        const result = await discussionsService.create(articleData);
      }

      // Redirect to article categories list page
      router.push('/dashboard/discussions');
    } catch (error) {
      // You can add error handling here (toast notification, etc)
    }
  }

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle className='text-left text-2xl font-bold'>
          {pageTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='topic'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discussion Topic</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter discussion topic' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' className='w-full'>
              {initialData ? 'Update Discussion' : 'Create Discussion'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
