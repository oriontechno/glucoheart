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
import { Textarea } from '@/components/ui/textarea';
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
    defaultValues
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const healthMetricData = {
      ...values
    };

    try {
      if (initialData?.id) {
        const result = await healthMetricsService.update(
          initialData.id,
          healthMetricData
        );
      } else {
        const result = await healthMetricsService.create(healthMetricData);
      }
      // Redirect to health metrics list page
      router.push('/dashboard/health-metrics');
    } catch (error) {
      // You can add error handling here (toast notification, etc)
      console.error('Error submitting health metric:', error);
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
            {/* Blood Glucose Random */}
            <FormField
              control={form.control}
              name='bloodGlucoseRandom'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood Glucose Random (mg/dL)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Enter blood glucose random level'
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Blood Glucose Fasting */}
            <FormField
              control={form.control}
              name='bloodGlucoseFasting'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood Glucose Fasting (mg/dL)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Enter blood glucose fasting level'
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Blood Glucose Postprandial */}
            <FormField
              control={form.control}
              name='bloodGlucosePostprandial'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood Glucose Postprandial (mg/dL)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Enter blood glucose postprandial level'
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* HbA1c */}
            <FormField
              control={form.control}
              name='hba1c'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HbA1c (%)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.1'
                      max='15'
                      placeholder='Enter HbA1c level'
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hemoglobin */}
            <FormField
              control={form.control}
              name='hemoglobin'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hemoglobin (g/dL)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.1'
                      placeholder='Enter hemoglobin level'
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Blood Pressure */}
            <FormField
              control={form.control}
              name='bloodPressure'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood Pressure (mmHg)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter blood pressure (e.g., 120/80)'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Time */}
            <FormField
              control={form.control}
              name='dateTime'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type='datetime-local'
                      {...field}
                      value={
                        field.value
                          ? new Date(field.value).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(new Date(e.target.value).toISOString())
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Enter any additional notes'
                      maxLength={255}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type='submit' className='w-full'>
              {initialData ? 'Update Health Metric' : 'Create Health Metric'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
