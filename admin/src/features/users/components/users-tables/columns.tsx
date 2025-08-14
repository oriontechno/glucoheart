'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Text, XCircle } from 'lucide-react';
import { CellAction } from './cell-action';
import { ROLE_OPTIONS } from './options';
import { User } from '@/types/entity';

export const columns: ColumnDef<User>[] = [
  {
    id: 'search',
    accessorKey: 'firstName',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='First Name' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<User['firstName']>()}</div>,
    meta: {
      label: 'First Name',
      placeholder: 'Search ...',
      variant: 'text',
      icon: Text
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'lastName',
    accessorKey: 'lastName',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Last Name' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<User['lastName']>()}</div>,
    enableColumnFilter: true,
    enableSorting: true,
    meta: {
      label: 'Last Name'
    }
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Email' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<User['email']>()}</div>,
    enableColumnFilter: true,
    enableSorting: true,
    meta: {
      label: 'Email'
    }
  },
  {
    id: 'role',
    accessorKey: 'role',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Role' />
    ),
    cell: ({ cell }) => {
      const status = cell.getValue<User['role']>();
      const Icon = status === 'super_admin' ? CheckCircle2 : XCircle;

      return (
        <Badge variant='outline' className='capitalize'>
          <Icon />
          {status}
        </Badge>
      );
    },
    enableColumnFilter: true,
    enableSorting: true,
    meta: {
      label: 'Roles',
      variant: 'select',
      options: ROLE_OPTIONS
    }
  },
  {
    accessorKey: 'created_at',
    header: ({ column }: { column: Column<User, unknown> }) => (
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
    id: 'actions',
    cell: ({ row }) => <CellAction data={row.original} />
  }
];
