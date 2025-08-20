'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ChatSession, ChatUser } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatSessionListProps {
  sessions: ChatSession[];
  selectedSessionId?: number;
  onSessionSelect: (sessionId: number) => void;
  currentUser: ChatUser;
}

export default function ChatSessionList({
  sessions,
  selectedSessionId,
  onSessionSelect,
  currentUser
}: ChatSessionListProps) {
  const getOtherParticipant = (session: ChatSession): ChatUser | null => {
    if (!session.participants) return null;

    // Find the participant who is not the current user
    const otherParticipant = session.participants.find(
      (p) => p.userId !== currentUser.id
    );

    return otherParticipant?.user || null;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'NURSE':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'SUPPORT':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  return (
    <Card className='flex h-full flex-col gap-2 p-0'>
      <div className='shrink-0 border-b p-4'>
        <h2 className='text-lg font-semibold'>Chat Sessions</h2>
      </div>
      <div className='flex-1 overflow-hidden'>
        <ScrollArea className='h-full'>
          <div className='space-y-2 px-2'>
            {sessions.map((session) => {
              const otherParticipant = getOtherParticipant(session);
              const isSelected = selectedSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={cn(
                    'hover:bg-muted/50 cursor-pointer rounded-lg p-3 transition-colors',
                    isSelected && 'bg-muted'
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className='flex items-start space-x-3'>
                    <Avatar className='h-10 w-10'>
                      <AvatarImage
                        src={otherParticipant?.profilePicture}
                        alt={otherParticipant?.firstName}
                      />
                      <AvatarFallback>
                        {otherParticipant?.firstName?.charAt(0) || 'U'}
                        {otherParticipant?.lastName?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2'>
                          <h3 className='truncate text-sm font-medium'>
                            {otherParticipant?.firstName}{' '}
                            {otherParticipant?.lastName}
                          </h3>
                          {otherParticipant?.role &&
                            otherParticipant.role !== 'USER' && (
                              <Badge
                                variant='secondary'
                                className={cn(
                                  'text-xs',
                                  getRoleColor(otherParticipant.role)
                                )}
                              >
                                {otherParticipant.role}
                              </Badge>
                            )}
                        </div>
                        {session.lastMessageAt && (
                          <span className='text-muted-foreground text-xs'>
                            {formatTime(session.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      {session.lastMessage && (
                        <p className='text-muted-foreground mt-1 truncate text-sm'>
                          {session.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div className='text-muted-foreground py-8 text-center'>
                <p>No chat sessions found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
