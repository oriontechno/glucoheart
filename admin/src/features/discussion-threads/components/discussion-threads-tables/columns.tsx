'use client';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Text } from 'lucide-react';
import { CellAction } from './cell-action';
import { DiscussionThread } from '@/constants/mock-api';

export const columns: ColumnDef<DiscussionThread>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }: { column: Column<DiscussionThread, unknown> }) => (
      <DataTableColumnHeader column={column} title='Title' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<DiscussionThread['title']>()}</div>,
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
    accessorKey: 'created_at',
    header: ({ column }: { column: Column<DiscussionThread, unknown> }) => (
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
