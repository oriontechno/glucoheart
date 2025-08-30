'use client';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Text } from 'lucide-react';
import { CellAction } from './cell-action';
import { Discussion } from '@/types/chat';
import { Badge } from '@/components/ui/badge';
import { DISCUSSION_IS_PUBLIC_OPTIONS } from './options';

export const columns: ColumnDef<Discussion>[] = [
  {
    id: 'search',
    accessorKey: 'topic',
    header: ({ column }: { column: Column<Discussion, unknown> }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<Discussion['topic']>()}</div>,
    meta: {
      label: 'Topic',
      placeholder: 'Search...',
      variant: 'text',
      icon: Text
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: ({ column }: { column: Column<Discussion, unknown> }) => (
      <DataTableColumnHeader column={column} title='Description' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<Discussion['description']>()}</div>,
    meta: {
      label: 'Description'
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'isPublic',
    accessorKey: 'is_public',
    header: ({ column }: { column: Column<Discussion, unknown> }) => (
      <DataTableColumnHeader column={column} title='Is Public' />
    ),
    cell: ({ cell }) => (
      <div>
        {cell.getValue<Discussion['is_public']>() ? (
          <Badge color='green'>Yes</Badge>
        ) : (
          <Badge color='red'>No</Badge>
        )}
      </div>
    ),
    meta: {
      label: 'Is Public',
      options: DISCUSSION_IS_PUBLIC_OPTIONS,
      variant: 'select'
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    accessorKey: 'created_at',
    header: ({ column }: { column: Column<Discussion, unknown> }) => (
      <DataTableColumnHeader column={column} title='Created At' />
    ),
    enableSorting: true,
    meta: {
      label: 'Created At'
    },
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
    header: ({ column }: { column: Column<Discussion, unknown> }) => (
      <DataTableColumnHeader column={column} title='Updated At' />
    ),
    enableSorting: true,
    meta: {
      label: 'Updated At'
    },
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
