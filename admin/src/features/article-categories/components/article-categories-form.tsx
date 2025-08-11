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
import { ArticleCategory } from '@/constants/mock-api';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Article Category name must be at least 2 characters.'
  })
});

export default function ArticleCategoriesForm({
  initialData,
  pageTitle
}: {
  initialData: ArticleCategory | null;
  pageTitle: string;
}) {
  const defaultValues = {
    name: initialData?.name || ''
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Add timestamps for new ArticleCategories
    const articleData = {
      ...values,
      // These would typically be handled by the backend
      created_at: initialData
        ? initialData.created_at
        : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Article data:', articleData);
    // Form submission logic would be implemented here
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
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Article Category Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter article category name'
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
