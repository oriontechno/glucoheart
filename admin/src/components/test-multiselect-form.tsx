// Test MultiSelect implementation for Articles
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { MultiSelect } from '@/components/multi-select';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

const FormSchema = z.object({
  categories: z
    .array(z.string())
    .min(1, { message: 'Please select at least one category.' })
});

const categoriesList = [
  { value: 'health', label: 'Health' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'mental-health', label: 'Mental Health' },
  { value: 'technology', label: 'Technology' },
  { value: 'research', label: 'Research' }
];

export default function TestMultiSelectForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      categories: []
    }
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log('Selected categories:', data.categories);
    console.log('Backend format:', data.categories.join('.'));
    toast.success(`Selected: ${data.categories.join(', ')}`);
  }

  return (
    <div className='mx-auto max-w-md p-6'>
      <h2 className='mb-4 text-lg font-semibold'>
        Test Categories MultiSelect
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='categories'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Article Categories</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={categoriesList}
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Choose categories...'
                    searchable={true}
                    hideSelectAll={false}
                    maxCount={3}
                  />
                </FormControl>
                <FormMessage />
                <p className='text-muted-foreground text-xs'>
                  Select one or more categories for this article
                </p>
              </FormItem>
            )}
          />
          <Button type='submit' className='w-full'>
            Test Submit
          </Button>
        </form>
      </Form>
    </div>
  );
}
