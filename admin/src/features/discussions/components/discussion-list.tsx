'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Discussion, ChatUser } from '@/types/chat';
import { cn } from '@/lib/utils';
import { MessageCircle, Lock, Unlock, User } from 'lucide-react';

interface DiscussionListProps {
  sessions: Discussion[];
  selectedSessionId?: number;
  onSessionSelect: (sessionId: number) => void;
  currentUser: ChatUser;
}

export default function DiscussionList({
  sessions,
  selectedSessionId,
  onSessionSelect,
  currentUser
}: DiscussionListProps) {
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  return (
    <Card className='flex h-full max-h-[calc(100vh-8rem)] flex-col gap-2 p-0'>
      <div className='shrink-0 border-b p-4'>
        <h2 className='text-lg font-semibold'>Discussions</h2>
      </div>
      <div className='relative flex-1 overflow-hidden'>
        <ScrollArea className='h-full max-h-[calc(100vh-12rem)]'>
          <div className='space-y-2 px-2 pb-2'>
            {sessions.map((discussion) => {
              const isSelected = selectedSessionId === discussion.id;

              return (
                <div
                  key={discussion.id}
                  className={cn(
                    'hover:bg-muted/50 cursor-pointer rounded-lg p-3 transition-all duration-200 hover:shadow-sm',
                    isSelected && 'bg-muted shadow-sm'
                  )}
                  onClick={() => onSessionSelect(discussion.id)}
                >
                  <div className='flex items-start space-x-3'>
                    <div className='flex-shrink-0'>
                      <div className='bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full'>
                        <MessageCircle className='h-5 w-5' />
                      </div>
                    </div>

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2'>
                          <h3 className='truncate text-sm font-medium'>
                            {discussion.topic}
                          </h3>
                          {discussion.is_public ? (
                            <div title='Public Discussion'>
                              <Unlock className='h-3 w-3 text-green-500' />
                            </div>
                          ) : (
                            <div title='Private Discussion'>
                              <Lock className='h-3 w-3 text-orange-500' />
                            </div>
                          )}
                        </div>
                        {discussion.last_message_at && (
                          <span className='text-muted-foreground text-xs'>
                            {formatTime(discussion.last_message_at)}
                          </span>
                        )}
                      </div>

                      {discussion.description && (
                        <p className='text-muted-foreground mt-1 text-xs'>
                          {discussion.description}
                        </p>
                      )}

                      {discussion.last_message && (
                        <p className='text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed'>
                          {discussion.last_message}
                        </p>
                      )}

                      <div className='mt-2 flex items-center space-x-2'>
                        <div className='flex items-center space-x-1'>
                          <User className='text-muted-foreground h-3 w-3' />
                          <span className='text-muted-foreground text-xs'>
                            Created by User {discussion.created_by}
                          </span>
                        </div>
                        <Badge variant='secondary' className='text-xs'>
                          {discussion.is_public ? 'Public' : 'Private'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div className='text-muted-foreground py-8 text-center'>
                <p>No discussions found</p>
                <p className='mt-1 text-xs'>
                  Create a new discussion to get started
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        {/* Gradient fade untuk indikasi scroll */}
        <div className='from-background pointer-events-none absolute right-0 bottom-0 left-0 h-6 bg-gradient-to-t to-transparent' />
      </div>
    </Card>
  );
}
