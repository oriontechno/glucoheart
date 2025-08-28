'use client';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Column, ColumnDef } from '@tanstack/react-table';
import { Text } from 'lucide-react';
import { CellAction } from './cell-action';
import { HealthMetric } from '@/types/entity';

export const columns: ColumnDef<HealthMetric>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='ID' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<HealthMetric['id']>()}</div>,
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'userId',
    accessorKey: 'userId',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='User ID' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<HealthMetric['userId']>()}</div>,
    enableColumnFilter: true,
    enableSorting: true,
    meta: {
      label: 'User ID',
      placeholder: 'User ID',
      variant: 'number',
      icon: Text
    }
  },
  {
    id: 'bloodGlucoseRandom',
    accessorKey: 'bloodGlucoseRandom',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='Blood Glucose Random' />
    ),
    cell: ({ cell }) => (
      <div>{cell.getValue<HealthMetric['bloodGlucoseRandom']>()}</div>
    ),
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'bloodGlucoseFasting',
    accessorKey: 'bloodGlucoseFasting',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='Blood Glucose Fasting' />
    ),
    cell: ({ cell }) => (
      <div>{cell.getValue<HealthMetric['bloodGlucoseFasting']>()}</div>
    ),
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'hba1c',
    accessorKey: 'hba1c',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='HbA1c' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<HealthMetric['hba1c']>()}</div>,
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'hemoglobin',
    accessorKey: 'hemoglobin',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='Hemoglobin' />
    ),
    cell: ({ cell }) => (
      <div>{cell.getValue<HealthMetric['hemoglobin']>()}</div>
    ),
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'bloodGlucosePostprandial',
    accessorKey: 'bloodGlucosePostprandial',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader
        column={column}
        title='Blood Glucose Postprandial'
      />
    ),
    cell: ({ cell }) => (
      <div>{cell.getValue<HealthMetric['bloodGlucosePostprandial']>()}</div>
    ),
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'bloodPressure',
    accessorKey: 'bloodPressure',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='Blood Pressure' />
    ),
    cell: ({ cell }) => (
      <div>{cell.getValue<HealthMetric['bloodPressure']>()}</div>
    ),
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'notes',
    accessorKey: 'notes',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='Notes' />
    ),
    cell: ({ cell }) => <div>{cell.getValue<HealthMetric['notes']>()}</div>,
    enableColumnFilter: true,
    enableSorting: true
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='Created At' />
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const createdAt = row.getValue('createdAt');
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
    id: 'updatedAt',
    accessorKey: 'updatedAt',
    header: ({ column }: { column: Column<HealthMetric, unknown> }) => (
      <DataTableColumnHeader column={column} title='Updated At' />
    ),
    enableSorting: true,
    cell: ({ row }) => {
      const updatedAt = row.getValue('updatedAt');
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
