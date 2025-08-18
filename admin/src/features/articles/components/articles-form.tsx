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
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { FileUploader } from '@/components/file-uploader';
import { MultiSelect } from '@/components/multi-select';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/constants/form';
import { useState } from 'react';
import { Article } from '@/types/entity';
import { useCategories } from '../hooks/use-categories';
import { articlesService } from '@/lib/api/articles.service';
import { useRouter } from 'next/navigation';
import { config } from '@/config/env';

export default function ArticlesForm({
  initialData,
  pageTitle
}: {
  initialData: Article | null;
  pageTitle: string;
}) {
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    initialData?.coverImageUrl || null
  );

  // Fetch categories for MultiSelect
  const { categories, loading: categoriesLoading } = useCategories();

  const router = useRouter();

  // Dynamic schema based on available categories and existing data
  const formSchema = z.object({
    title: z
      .string()
      .min(3, {
        message: 'Article title must be at least 3 characters.'
      })
      .max(200, {
        message: 'Article title must not exceed 200 characters.'
      }),
    summary: z
      .string()
      .max(220, {
        message: 'Article summary must not exceed 220 characters.'
      })
      .optional(),
    content: z.string().min(1, {
      message: 'Article content is required.'
    }),
    status: z.enum(['draft', 'published']).default('draft'),
    categories: z
      .array(z.string())
      .min(1, { message: 'Please select at least one category.' })
      .default([]), // Array of category slugs
    coverImageAlt: z.string().optional(),
    coverImageUrl: z.string().optional(), // For URL-based cover
    cover: z
      .any()
      .refine(
        (files) => {
          // For new articles, require either file or URL if no existing image
          if (
            !initialData &&
            (!files || files.length === 0) &&
            !existingImageUrl
          ) {
            return false;
          }
          // For existing articles, files are optional
          if (files && files.length > 0) {
            return files.length === 1;
          }
          return true;
        },
        initialData
          ? 'Please select only one image.'
          : 'Cover image is required.'
      )
      .refine((files) => {
        if (!files || files.length === 0) return true;
        return files[0]?.size <= MAX_FILE_SIZE;
      }, `Max file size is 5MB.`)
      .refine((files) => {
        if (!files || files.length === 0) return true;
        return ACCEPTED_IMAGE_TYPES.includes(files[0]?.type);
      }, '.jpg, .jpeg, .png and .webp files are accepted.')
  });

  const defaultValues = {
    title: initialData?.title || '',
    summary: initialData?.summary || '',
    content: initialData?.content || '',
    status: (initialData?.status as 'draft' | 'published') || 'draft',
    categories: (() => {
      if (!initialData?.categories) return [];

      // Handle backend response format: array of category objects
      if (Array.isArray(initialData.categories)) {
        // Check if it's array of objects with slug property
        if (
          initialData.categories.length > 0 &&
          typeof initialData.categories[0] === 'object' &&
          'slug' in initialData.categories[0]
        ) {
          return initialData.categories.map((cat) => cat.slug);
        }
        // Check if it's array of strings (slugs)
        if (
          initialData.categories.length > 0 &&
          typeof initialData.categories[0] === 'string'
        ) {
          return initialData.categories as unknown as string[];
        }
      }

      // Handle dot-separated string format
      if (typeof initialData.categories === 'string') {
        return (initialData.categories as string).split('.').filter(Boolean);
      }

      return [];
    })(),
    coverImageAlt: initialData?.coverImageAlt || '',
    coverImageUrl: initialData?.coverImageUrl || '',
    cover: [] as File[] // FileUploader expects File[] type
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();

    // Add text fields
    formData.append('title', values.title);
    if (values.summary) formData.append('summary', values.summary);
    formData.append('content', values.content);
    formData.append('status', values.status);
    // Convert categories array to dot-separated string for backend
    if (values.categories && values.categories.length > 0) {
      formData.append('categories', values.categories.join('.'));
    }
    if (values.coverImageAlt)
      formData.append('coverImageAlt', values.coverImageAlt);
    if (values.coverImageUrl)
      formData.append('coverImageUrl', values.coverImageUrl);

    // Add cover file if uploaded
    if (values.cover && values.cover.length > 0) {
      formData.append('cover', values.cover[0]);
    }

    // Log the form data for debugging
    // console.log('Form submission data:');
    // console.log('Title:', values.title);
    // console.log('Summary:', values.summary);
    // console.log('Content:', values.content);
    // console.log('Status:', values.status);
    // console.log('Categories (array):', values.categories);
    // console.log('Categories (backend format):', values.categories.join('.'));
    // console.log('Cover file:', values.cover?.[0]?.name);
    // console.log('Cover URL:', values.coverUrl);

    // TODO: Implement actual API call
    if (initialData?.id) {
      try {
        await articlesService.update(initialData.id, formData);
        router.push('/dashboard/articles');
      } catch (error) {
      } finally {
        form.reset();
      }
      // Update existing article
      // await articlesService.update(initialData.id, formData);
    } else {
      try {
        // Create new article
        await articlesService.create(formData);
        router.push('/dashboard/articles');
      } catch (error) {
      } finally {
        form.reset();
      }
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
              name='cover'
              render={({ field }) => (
                <div className='space-y-6'>
                  <FormItem className='w-full'>
                    <FormLabel>Cover Image</FormLabel>
                    <FormControl>
                      <FileUploader
                        value={field.value}
                        onValueChange={field.onChange}
                        maxFiles={1}
                        maxSize={5 * 1024 * 1024}
                        // disabled={loading}
                        // progresses={progresses}
                        // pass the onUpload function here for direct upload
                        // onUpload={uploadFiles}
                        // disabled={isUploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </div>
              )}
            />
            <FormField
              control={form.control}
              name='coverImageAlt'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image Alt Text</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter image alt text' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Article Title</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter article title' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='summary'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Article Summary (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Enter article summary (max 220 characters)'
                      className='min-h-[80px] resize-none'
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
                      placeholder='Enter article content'
                      className='min-h-[120px] resize-none'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select status' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='draft'>Draft</SelectItem>
                      <SelectItem value='published'>Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='categories'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={categories.map((cat) => ({
                        value: cat.slug,
                        label: cat.name
                      }))}
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder={
                        categoriesLoading
                          ? 'Loading categories...'
                          : 'Choose categories...'
                      }
                      disabled={categoriesLoading}
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
              {initialData ? 'Update Article' : 'Create Article'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
