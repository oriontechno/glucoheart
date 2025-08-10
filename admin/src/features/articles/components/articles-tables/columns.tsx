'use client';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Text } from 'lucide-react';
import { CellAction } from './cell-action';
import { Article } from '@/constants/mock-api';
import Image from 'next/image';
import { ARTICLE_CATEGORY_OPTIONS } from './options';

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
            ? new Date(createdAt as string | number | Date)
                .toISOString()
                .slice(0, 10)
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
