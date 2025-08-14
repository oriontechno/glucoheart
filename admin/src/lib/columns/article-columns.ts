import { ColumnDef } from '@tanstack/react-table';
import { Article } from '@/constants/mock-api';

// Server-safe column definition factory
export function createArticleColumnsConfig(categoryOptions: Array<{value: string, label: string}> = []) {
  return {
    imageColumn: {
      accessorKey: 'image_url',
      header: 'IMAGE'
    },
    titleColumn: {
      id: 'title',
      accessorKey: 'title',
      meta: {
        label: 'Title',
        placeholder: 'Search...',
        variant: 'text'
      },
      enableColumnFilter: true,
      enableSorting: true
    },
    categoryColumn: {
      id: 'category',
      accessorKey: 'category',
      enableColumnFilter: true,
      enableSorting: true,
      meta: {
        label: 'Category',
        variant: 'select',
        options: categoryOptions.map((option) => ({
          ...option,
          value: String(option.value)
        }))
      }
    },
    createdAtColumn: {
      accessorKey: 'created_at',
      enableSorting: true
    },
    actionsColumn: {
      id: 'actions'
    },
    categoryOptions
  };
}

export type ArticleColumnsConfig = ReturnType<typeof createArticleColumnsConfig>;
