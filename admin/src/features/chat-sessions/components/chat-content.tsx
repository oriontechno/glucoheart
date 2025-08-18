'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ChatSession, Message, ChatUser } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatContentProps {
  session: ChatSession | null;
  currentUser: ChatUser;
}

export default function ChatContent({
  session,
  currentUser
}: ChatContentProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !session) return;

    console.log('📤 New message:', {
      sessionId: session.id,
      senderId: currentUser.id,
      content: newMessage.trim()
    });

    // Clear input after "sending"
    setNewMessage('');

    // TODO: Nanti bisa ditambahkan ke state local atau refresh data
    console.log('✅ Message added to input (static mode)');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'NURSE':
        return 'bg-green-100 text-green-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'SUPPORT':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);

      if (isToday(date)) {
        return format(date, 'HH:mm');
      } else if (isYesterday(date)) {
        return `Yesterday ${format(date, 'HH:mm')}`;
      } else {
        return format(date, 'dd MMM HH:mm');
      }
    } catch (error) {
      return 'Unknown time';
    }
  };

  const getOtherParticipant = (): ChatUser | null => {
    if (!session?.participants) return null;

    const otherParticipant = session.participants.find(
      (p) => p.userId !== currentUser.id
    );

    return otherParticipant?.user || null;
  };

  if (!session) {
    return (
      <Card className='flex h-full items-center justify-center'>
        <div className='text-muted-foreground text-center'>
          <h3 className='text-lg font-medium'>Select a chat session</h3>
          <p className='text-sm'>
            Choose a conversation from the list to view messages
          </p>
        </div>
      </Card>
    );
  }

  const otherParticipant = getOtherParticipant();

  return (
    <Card className='flex max-h-full flex-col'>
      {/* Chat Header - Fixed */}
      <div className='bg-card shrink-0 border-b p-4'>
        <div className='flex items-center space-x-3'>
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

          <div>
            <div className='flex items-center space-x-2'>
              <h3 className='font-medium'>
                {otherParticipant?.firstName} {otherParticipant?.lastName}
              </h3>
              {otherParticipant?.role && otherParticipant.role !== 'USER' && (
                <Badge
                  variant='secondary'
                  className={getRoleColor(otherParticipant.role)}
                >
                  {otherParticipant.role}
                </Badge>
              )}
            </div>
            <p className='text-muted-foreground text-sm'>
              {otherParticipant?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable with flexible height */}
      <div className='min-h-0 flex-1 overflow-hidden'>
        <ScrollArea className='h-full max-h-[50vh]'>
          <div className='space-y-4 p-4'>
            {session.messages?.map((message) => {
              const isFromCurrentUser = message.senderId === currentUser.id;
              const sender = message.sender;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    isFromCurrentUser ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg p-3',
                      isFromCurrentUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {/* Sender info (only for received messages) */}
                    {!isFromCurrentUser && (
                      <div className='mb-1 flex items-center space-x-2'>
                        <span className='text-sm font-medium'>
                          {sender?.firstName} {sender?.lastName}
                        </span>
                        {sender?.role && sender.role !== 'USER' && (
                          <Badge
                            variant='secondary'
                            className={cn('text-xs', getRoleColor(sender.role))}
                          >
                            {sender.role}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Message content */}
                    <p className='text-sm'>{message.content}</p>

                    {/* Message time */}
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        isFromCurrentUser
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}

            {(!session.messages || session.messages.length === 0) && (
              <div className='text-muted-foreground py-8 text-center'>
                <p>No messages yet</p>
                <p className='text-sm'>Start the conversation!</p>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input - Fixed */}
      <div className='bg-card shrink-0 border-t p-4'>
        <div className='flex space-x-2'>
          <Input
            placeholder='Type your message...'
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className='flex-1'
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size='icon'
            className='shrink-0'
          >
            <Send className='h-4 w-4' />
          </Button>
        </div>
        <p className='text-muted-foreground mt-1 text-xs'>
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}
