'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { createArticleColumnsFromConfig, type ArticleColumnsConfig } from './columns';

import { useDataTable } from '@/hooks/use-data-table';

import { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, useQueryState } from 'nuqs';

interface ArticlesTableParams<TData, TValue> {
  data: TData[];
  totalItems: number;
  columns?: ColumnDef<TData, TValue>[];
  columnsConfig?: ArticleColumnsConfig;
}

export function ArticlesTable<TData, TValue>({
  data,
  totalItems,
  columns,
  columnsConfig
}: ArticlesTableParams<TData, TValue>) {
  const [pageSize] = useQueryState('perPage', parseAsInteger.withDefault(10));

  const pageCount = Math.ceil(totalItems / pageSize);

  // Use columns from config if provided, otherwise use direct columns
  const tableColumns = columnsConfig 
    ? createArticleColumnsFromConfig(columnsConfig) as ColumnDef<TData, TValue>[]
    : columns!;

  const { table } = useDataTable({
    data,
    columns: tableColumns,
    pageCount: pageCount,
    shallow: false, //Setting to false triggers a network request with the updated querystring.
    debounceMs: 500
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
