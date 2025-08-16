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
import { DiscussionThread } from '@/constants/mock-api';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  title: z.string().min(2, {
    message: 'Discussion thread title must be at least 2 characters.'
  }),
  content: z.string().min(10, {
    message: 'Discussion thread content must be at least 10 characters.'
  })
});

export default function DiscussionThreadsForm({
  initialData,
  pageTitle
}: {
  initialData: DiscussionThread | null;
  pageTitle: string;
}) {
  const defaultValues = {
    title: initialData?.title || '',
    content: initialData?.content || ''
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Add timestamps for new DiscussionThreads
    const articleData = {
      ...values,
      // These would typically be handled by the backend
      created_at: initialData
        ? initialData.created_at
        : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
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
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discussion Thread Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter discussion thread title'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='content'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Enter discussion thread content'
                      className='min-h-[120px] resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type='submit' className='w-full'>
              {initialData ? 'Update Article' : 'Create Article'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
