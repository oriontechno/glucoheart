'use client';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Text } from 'lucide-react';
import { CellAction } from './cell-action';
import {
  createArticleColumnsConfig,
  type ArticleColumnsConfig
} from '@/lib/columns/article-columns';
import Image from 'next/image';
import { Article } from '@/types/entity';
import { config as envConfig } from '@/config/env';
import { Badge } from '@/components/ui/badge';

// Re-export the type for convenience
export type { ArticleColumnsConfig };

// Client-side columns implementation using server config
export const createArticleColumnsFromConfig = (
  config: ArticleColumnsConfig
): ColumnDef<Article>[] => [
  {
    id: 'coverImageUrl',
    accessorKey: 'coverImageUrl',
    header: 'IMAGE',
    cell: ({ row }) => {
      return (
        <div className='relative aspect-square overflow-hidden'>
          <Image
            src={
              row.getValue('coverImageUrl')
                ? `${envConfig.API_URL}${row.getValue('coverImageUrl')}`
                : 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'
            }
            alt={row.getValue('title')}
            fill
            className='rounded-lg object-cover'
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
    id: 'status',
    accessorKey: 'status',
    header: ({ column }: { column: Column<Article, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ cell }) => {
      const statusValue = cell.getValue<Article['status']>();
      return (
        <Badge
          color={statusValue === 'published' ? 'green' : 'red'}
          variant={'default'}
        >
          {statusValue || 'No Status'}
        </Badge>
      );
    }
  },
  {
    id: 'categories',
    accessorKey: 'categories',
    header: ({ column }: { column: Column<Article, unknown> }) => (
      <DataTableColumnHeader column={column} title='Categories' />
    ),
    cell: ({ cell }) => {
      const categoryValue = cell.getValue<Article['categories']>();
      return (
        <div>
          {categoryValue?.map((cat) => cat.name).join(', ') || 'No Category'}
        </div>
      );
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
    accessorKey: 'updated_at',
    header: ({ column }: { column: Column<Article, unknown> }) => (
      <DataTableColumnHeader column={column} title='Updated At' />
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const updatedAt = row.getValue('updated_at');
      return (
        <div>
          {updatedAt
            ? new Date(updatedAt as string | number | Date).toLocaleDateString(
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
