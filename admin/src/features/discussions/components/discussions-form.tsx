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
import { useReactTable } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { Discussion } from '@/types/chat';
import { DiscussionMessagesService } from '@/lib/api/discussion-messages.service';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const formSchema = z.object({
  topic: z.string().min(2, {
    message: 'Discussion name must be at least 2 characters.'
  }),
  description: z.string().optional(),
  isPublic: z.boolean().default(true)
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
    isPublic: initialData?.isPublic || true
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Add timestamps for new Discussions
    const discussionData = {
      ...values
    };

    try {
      if (initialData?.id) {
        // const result = await DiscussionMessagesService.update(
        //   initialData.id,
        //   articleData
        // );
      } else {
        const result = await DiscussionMessagesService.create(discussionData);
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
            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discussion Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter discussion description'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='isPublic'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public Discussion</FormLabel>

                  <FormControl>
                    <RadioGroup
                      className='mt-2 flex gap-6'
                      onValueChange={(val) => field.onChange(val === 'yes')}
                      value={field.value ? 'yes' : 'no'}
                    >
                      <FormItem className='flex items-center space-y-0 space-x-2'>
                        <FormControl>
                          <RadioGroupItem id='is_public_yes' value='yes' />
                        </FormControl>
                        <FormLabel
                          htmlFor='is_public_yes'
                          className='font-normal'
                        >
                          Yes
                        </FormLabel>
                      </FormItem>

                      <FormItem className='flex items-center space-y-0 space-x-2'>
                        <FormControl>
                          <RadioGroupItem id='is_public_no' value='no' />
                        </FormControl>
                        <FormLabel
                          htmlFor='is_public_no'
                          className='font-normal'
                        >
                          No
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
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
