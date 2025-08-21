'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, ChevronsUpDown, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usersService } from '@/lib/api/users.service';
import { chatSessionMessagesService } from '@/lib/api/chat-session-messages.service';

interface Nurse {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  role: string;
  profilePicture?: string;
}

interface AssignNurseDialogProps {
  sessionId: number;
  currentAssignedNurseId?: number;
  onAssignSuccess?: (updatedNurse?: any) => void;
  children: React.ReactNode;
}

export default function AssignNurseDialog({
  sessionId,
  currentAssignedNurseId,
  onAssignSuccess,
  children
}: AssignNurseDialogProps) {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Load nurses when dialog opens
  useEffect(() => {
    if (open) {
      loadNurses();
    }
  }, [open]);

  const loadNurses = async () => {
    try {
      setIsLoading(true);
      const response = await usersService.getUsers({
        roles: 'NURSE',
        limit: 100, // Get more nurses for selection
        search: searchValue,
        actives: 'true' // Only get active nurses
      });

      if (response.success && response.users) {
        const nursesList: Nurse[] = response.users.map((user: any) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture
        }));
        setNurses(nursesList);

        // Set currently assigned nurse if exists
        if (currentAssignedNurseId) {
          const currentNurse = nursesList.find(
            (nurse) => nurse.id === currentAssignedNurseId
          );
          if (currentNurse) {
            setSelectedNurse(currentNurse);
          }
        }
      }
    } catch (error) {
      console.error('Error loading nurses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignNurse = async () => {
    if (!selectedNurse) return;

    try {
      setIsAssigning(true);
      const response = await chatSessionMessagesService.assignNurse(
        sessionId,
        selectedNurse.id
      );

      if (response.success) {
        setOpen(false);
        // Pass the assigned nurse data to the callback
        onAssignSuccess?.(selectedNurse);
      } else {
        alert('Failed to assign nurse: ' + response.error);
      }
    } catch (error) {
      console.error('Error assigning nurse:', error);
      alert('An error occurred while assigning nurse. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    // Reload nurses with search
    if (value.length > 2 || value.length === 0) {
      loadNurses();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center space-x-2'>
            <UserPlus className='h-5 w-5' />
            <span>Assign Nurse</span>
          </DialogTitle>
          <DialogDescription>
            Select a nurse to assign to this chat session. The assigned nurse
            will be able to respond to messages from the patient.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Nurse Selection */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Select Nurse</label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={comboboxOpen}
                  className='w-full justify-between'
                  disabled={isLoading}
                >
                  {selectedNurse ? (
                    <div className='flex items-center space-x-2'>
                      <Avatar className='h-6 w-6'>
                        <AvatarImage src={selectedNurse.profilePicture} />
                        <AvatarFallback className='text-xs'>
                          {selectedNurse.firstName.charAt(0)}
                          {selectedNurse.lastName?.charAt(0) || ''}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {selectedNurse.firstName} {selectedNurse.lastName || ''}
                      </span>
                    </div>
                  ) : (
                    'Select nurse...'
                  )}
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-[400px] p-0'>
                <Command>
                  <CommandInput
                    placeholder='Search nurses...'
                    onValueChange={handleSearch}
                  />
                  <CommandEmpty>
                    {isLoading ? 'Loading nurses...' : 'No nurses found.'}
                  </CommandEmpty>
                  <CommandGroup className='max-h-64 overflow-auto'>
                    {nurses.map((nurse) => (
                      <CommandItem
                        key={nurse.id}
                        value={nurse.email}
                        onSelect={() => {
                          setSelectedNurse(nurse);
                          setComboboxOpen(false);
                        }}
                        className='flex items-center space-x-2 p-2'
                      >
                        <Avatar className='h-8 w-8'>
                          <AvatarImage src={nurse.profilePicture} />
                          <AvatarFallback className='text-xs'>
                            {nurse.firstName.charAt(0)}
                            {nurse.lastName?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div className='flex-1'>
                          <div className='font-medium'>
                            {nurse.firstName} {nurse.lastName || ''}
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            {nurse.email}
                          </div>
                        </div>
                        <Badge
                          variant='secondary'
                          className='bg-green-100 text-green-800'
                        >
                          NURSE
                        </Badge>
                        <Check
                          className={cn(
                            'ml-auto h-4 w-4',
                            selectedNurse?.id === nurse.id
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Selected Nurse Info */}
          {selectedNurse && (
            <div className='bg-muted/50 rounded-lg border p-3'>
              <div className='flex items-center space-x-3'>
                <Avatar className='h-10 w-10'>
                  <AvatarImage src={selectedNurse.profilePicture} />
                  <AvatarFallback>
                    {selectedNurse.firstName.charAt(0)}
                    {selectedNurse.lastName?.charAt(0) || ''}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className='font-medium'>
                    {selectedNurse.firstName} {selectedNurse.lastName || ''}
                  </div>
                  <div className='text-muted-foreground text-sm'>
                    {selectedNurse.email}
                  </div>
                </div>
                <Badge
                  variant='secondary'
                  className='bg-green-100 text-green-800'
                >
                  NURSE
                </Badge>
              </div>
            </div>
          )}
        </div>

        <div className='flex justify-end space-x-2'>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignNurse}
            disabled={!selectedNurse || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className='mr-2 h-4 w-4' />
                Assign
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
