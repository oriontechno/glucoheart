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
import { Article } from '@/constants/mock-api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { FileUploader } from '@/components/file-uploader';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/constants/form';
import { useState, useEffect } from 'react';
import { articleCategoriesService } from '@/lib/api/article-categories.service';

export default function ArticlesForm({
  initialData,
  pageTitle
}: {
  initialData: Article | null;
  pageTitle: string;
}) {
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    initialData?.image_url || null
  );
  const [categoryOptions, setCategoryOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const apiResponse = await articleCategoriesService.getAll();
        // Format the API response to options format
        const options = apiResponse.map((category: any) => ({
          value: category.name,
          label: category.name.charAt(0).toUpperCase() + category.name.slice(1)
        }));
        setCategoryOptions(options);
      } catch (error) {
        console.error('Error loading categories:', error);
        // Fallback to empty array
        setCategoryOptions([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Get available category values for dynamic validation
  const availableCategories = categoryOptions.map((option) => option.value);

  // Dynamic schema based on available categories and existing data
  const formSchema = z.object({
    title: z.string().min(2, {
      message: 'Article title must be at least 2 characters.'
    }),
    content: z.string().min(10, {
      message: 'Article content must be at least 10 characters.'
    }),
    category: z.string().refine((val) => availableCategories.includes(val), {
      message: 'Please select a valid category.'
    }),
    image_url: z
      .any()
      .refine(
        (files) => {
          // For new articles, require at least one file if no existing image
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
        initialData ? 'Please select only one image.' : 'Image is required.'
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
    content: initialData?.content || '',
    category: initialData?.category || availableCategories[0] || '',
    image_url: [] as File[] // FileUploader expects File[] type
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: defaultValues
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Add timestamps for new articles
    const articleData = {
      ...values,
      // Handle image - use existing image URL if no new files uploaded
      image_url:
        values.image_url && values.image_url.length > 0
          ? values.image_url[0] // New file uploaded
          : existingImageUrl, // Use existing image URL
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
              name='image_url'
              render={({ field }) => (
                <div className='space-y-6'>
                  <FormItem className='w-full'>
                    <FormLabel>Images</FormLabel>
                    <FormControl>
                      <FileUploader
                        value={field.value}
                        onValueChange={field.onChange}
                        maxFiles={4}
                        maxSize={4 * 1024 * 1024}
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
              name='category'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isLoadingCategories}>
                        <SelectValue
                          placeholder={
                            isLoadingCategories
                              ? 'Loading categories...'
                              : 'Select category'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((option) => (
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
            <Button type='submit' className='w-full'>
              {initialData ? 'Update Article' : 'Create Article'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
