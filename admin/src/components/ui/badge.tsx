import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground'
      },
      // Pindahkan color ke dalam variants
      color: {
        gray: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600',
        green:
          'bg-green-100 text-green-800 border-green-300 dark:bg-green-800 dark:text-green-100 dark:border-green-600',
        blue: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-800 dark:text-blue-100 dark:border-blue-600',
        red: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-800 dark:text-red-100 dark:border-red-600',
        yellow:
          'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-800 dark:text-yellow-100 dark:border-yellow-600',
        purple:
          'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-800 dark:text-purple-100 dark:border-purple-600',
        orange:
          'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-800 dark:text-orange-100 dark:border-orange-600',
        pink: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-800 dark:text-pink-100 dark:border-pink-600',
        indigo:
          'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-800 dark:text-indigo-100 dark:border-indigo-600',
        teal: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-800 dark:text-teal-100 dark:border-teal-600'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

function Badge({
  className,
  variant,
  color,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp
      data-slot='badge'
      className={cn(badgeVariants({ variant, color }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
