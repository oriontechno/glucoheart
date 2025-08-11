'use client';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Text } from 'lucide-react';
import { CellAction } from './cell-action';
import { Article, fakeArticleCategories } from '@/constants/mock-api';
import Image from 'next/image';

// Helper function to ensure categories are available and convert to options format
const formatCategoriesAsOptions = (categories: any[]) => {
  return categories.map((category) => ({
    value: category.name,
    label: category.name.charAt(0).toUpperCase() + category.name.slice(1)
  }));
};

// Function for async operations (recommended approach)
export const getArticleCategoriesFromMockData = async () => {
  try {
    // Use the proper getAll method from mock API
    const categories = await fakeArticleCategories.getAll({});
    return formatCategoriesAsOptions(categories);
  } catch (error) {
    // Fallback: ensure initialization and try again
    fakeArticleCategories.initialize();
    const categories = await fakeArticleCategories.getAll({});
    return formatCategoriesAsOptions(categories);
  }
};

// Legacy function for synchronous access (only for table columns)
const getCategoriesSync = () => {
  // Ensure categories are initialized
  if (fakeArticleCategories.records.length === 0) {
    fakeArticleCategories.initialize();
  }

  return formatCategoriesAsOptions(fakeArticleCategories.records);
};

// Get article category options for table columns (synchronous)
const ARTICLE_CATEGORY_OPTIONS = getCategoriesSync();

export const columns: ColumnDef<Article>[] = [
  {
    accessorKey: 'image_url',
    header: 'IMAGE',
    cell: ({ row }) => {
      return (
        <div className='relative aspect-square'>
          <Image
            src={row.getValue('image_url')}
            alt={row.getValue('title')}
            fill
            className='rounded-lg'
          />
        </div>
      );
    }
  },
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }: { column: Column<Article, unknown> }) => (
      <DataTableColumnHeader column={column} title='Title' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<Article['title']>()}</div>,
    meta: {
      label: 'Title',
      placeholder: 'Search...',
      variant: 'text',
      icon: Text
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'category',
    accessorKey: 'category',
    header: ({ column }: { column: Column<Article, unknown> }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    cell: ({ cell }) => {
      const categoryValue = cell.getValue<Article['category']>();
      const categoryOption = ARTICLE_CATEGORY_OPTIONS.find(
        (option) => option.value === categoryValue
      );
      return <div>{categoryOption?.label || categoryValue}</div>;
    },
    enableColumnFilter: true,
    enableSorting: true,
    meta: {
      label: 'Category',
      variant: 'select',
      options: ARTICLE_CATEGORY_OPTIONS.map((option) => ({
        ...option,
        value: String(option.value)
      }))
    }
  },
  {
    accessorKey: 'created_at',
    header: ({ column }: { column: Column<Article, unknown> }) => (
      <DataTableColumnHeader column={column} title='Created At' />
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const createdAt = row.getValue('created_at');
      return (
        <div>
          {createdAt
            ? new Date(createdAt as string | number | Date).toLocaleDateString(
                'en-US',
                {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }
              )
            : ''}
        </div>
      );
    }
  },

  {
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
