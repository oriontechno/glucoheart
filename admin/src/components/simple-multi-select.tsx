'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder = 'Select items...',
  className,
  disabled = false
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = React.useCallback(
    (item: string) => {
      onValueChange(value.filter((i) => i !== item));
    },
    [onValueChange, value]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = e.target as HTMLInputElement;
      if (input.value === '') {
        if (e.key === 'Backspace') {
          onValueChange(value.slice(0, -1));
        }
      }
    },
    [onValueChange, value]
  );

  const selectables = options.filter((option) => !value.includes(option.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn(
            'w-full justify-between text-left font-normal',
            !value.length && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <div className='flex flex-wrap gap-1'>
            {value.length > 0
              ? value.map((item) => {
                  const option = options.find(
                    (option) => option.value === item
                  );
                  return (
                    <Badge
                      variant='secondary'
                      key={item}
                      className='mr-1 mb-1'
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnselect(item);
                      }}
                    >
                      {option?.label}
                      <button
                        className='ring-offset-background focus:ring-ring ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2'
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUnselect(item);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnselect(item);
                        }}
                      >
                        <X className='text-muted-foreground hover:text-foreground h-3 w-3' />
                      </button>
                    </Badge>
                  );
                })
              : placeholder}
          </div>
          <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-full p-0' align='start'>
        <Command>
          <CommandInput placeholder='Search...' onKeyDown={handleKeyDown} />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup className='max-h-64 overflow-auto'>
              {selectables.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onValueChange([...value, option.value]);
                    setOpen(true);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.icon && (
                    <option.icon className='text-muted-foreground mr-2 h-4 w-4' />
                  )}
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
