'use client';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Text, XCircle } from 'lucide-react';
import { CellAction } from './cell-action';
import { ACTIVE_OPTIONS, ROLE_OPTIONS } from './options';
import { User } from '@/constants/mock-api';

export const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<User['name']>()}</div>,
    meta: {
      label: 'Name',
      placeholder: 'Search ...',
      variant: 'text',
      icon: Text
    },
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Email' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<User['email']>()}</div>,
    enableColumnFilter: true,
    enableSorting: true
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
    id: 'active',
    accessorKey: 'is_active',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Active' />
    ),
    enableColumnFilter: true,
    enableSorting: true,
    meta: {
      label: 'Active',
      variant: 'select',
      options: ACTIVE_OPTIONS.map(option => ({ ...option, value: String(option.value) }))
    },
    cell: ({ row }) => {
      const isActive = row.getValue('active');
      console.log('isActive', isActive);
      return <div>{isActive ? <Badge variant='destructive'>Active</Badge> : <Badge>Inactive</Badge>}</div>;
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }: { column: Column<User, unknown> }) => (
      <DataTableColumnHeader column={column} title='Created At' />
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const createdAt = row.getValue('created_at');
      return (
        <div>
          {createdAt
            ? new Date(createdAt as string | number | Date).toISOString().slice(0, 10)
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
