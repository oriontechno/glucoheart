'use client';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Text } from 'lucide-react';
import { CellAction } from './cell-action';
import { Article } from '@/constants/mock-api';
import { getArticleCategoriesSync } from '@/lib/api/article-categories.service';
import {
  createArticleColumnsConfig,
  type ArticleColumnsConfig
} from '@/lib/columns/article-columns';
import Image from 'next/image';

// Re-export the type for convenience
export type { ArticleColumnsConfig };

// Client-side columns implementation using server config
export const createArticleColumnsFromConfig = (
  config: ArticleColumnsConfig
): ColumnDef<Article>[] => [
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
      const categoryOption = config.categoryOptions.find(
        (option) => option.value === categoryValue
      );
      return <div>{categoryOption?.label || categoryValue}</div>;
    },
    enableColumnFilter: true,
    enableSorting: true,
    meta: {
      label: 'Category',
      variant: 'select',
      options: config.categoryOptions.map((option) => ({
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

// Dynamic columns function that accepts categories (backward compatibility)
export const createArticleColumns = (
  categoryOptions: Array<{ value: string; label: string }> = []
): ColumnDef<Article>[] => {
  const config = createArticleColumnsConfig(categoryOptions);
  return createArticleColumnsFromConfig(config);
};

// Fallback columns with safe category loading for backward compatibility
export const columns: ColumnDef<Article>[] = (() => {
  const categoryOptions = getArticleCategoriesSync();
  return createArticleColumns(categoryOptions);
})();
