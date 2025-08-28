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
import { useRouter } from 'next/navigation';
import { HealthMetric } from '@/types/entity';
import { healthMetricsService } from '@/lib/api/health-metrics.service';

const formSchema = z.object({
  bloodGlucoseRandom: z.number().min(0, {
    message: 'Blood Glucose Random must be a positive number.'
  }),
  bloodGlucoseFasting: z.number().min(0, {
    message: 'Blood Glucose Fasting must be a positive number.'
  }),
  hba1c: z.number().min(0).max(15, {
    message: 'HbA1c must be between 0 and 15.'
  }),
  hemoglobin: z.number().min(0, {
    message: 'Hemoglobin must be a positive number.'
  }),
  bloodGlucosePostprandial: z.number().min(0, {
    message: 'Blood Glucose Postprandial must be a positive number.'
  }),
  bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, {
    message: 'Blood Pressure must be in format 120/80.'
  }),
  dateTime: z.string().datetime({
    message: 'DateTime must be a valid ISO date string.'
  }),
  notes: z.string().max(255, {
    message: 'Notes must not exceed 255 characters.'
  })
});

export default function HealthMetricForm({
  initialData,
  pageTitle
}: {
  initialData: HealthMetric | null;
  pageTitle: string;
}) {
  const router = useRouter();

  const defaultValues: z.infer<typeof formSchema> = {
    bloodGlucoseRandom: initialData?.bloodGlucoseRandom ?? 0,
    bloodGlucoseFasting: initialData?.bloodGlucoseFasting ?? 0,
    hba1c: initialData?.hba1c ?? 0,
    hemoglobin: initialData?.hemoglobin ?? 0,
    bloodGlucosePostprandial: initialData?.bloodGlucosePostprandial ?? 0,
    bloodPressure: initialData?.bloodPressure ?? '',
    dateTime: initialData?.dateTime ?? new Date().toISOString(),
    notes: initialData?.notes ?? ''
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Add timestamps for new ArticleCategories
    const articleData = {
      ...values
    };

    try {
      if (initialData?.id) {
        const result = await healthMetricsService.update(
          initialData.id,
          articleData
        );
      } else {
        const result = await healthMetricsService.create(articleData);
      }

      // Redirect to health metrics list page
      router.push('/dashboard/health-metrics');
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
              name='bloodGlucoseFasting'
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
