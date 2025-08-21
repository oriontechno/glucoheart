'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  ChatSession,
  Message,
  ChatUser,
  ChatParticipantAPI
} from '@/types/chat';
import { cn } from '@/lib/utils';
import { chatSessionMessagesService } from '@/lib/api/chat-session-messages.service';

interface ChatContentProps {
  session: ChatSession | null;
  currentUser: ChatUser;
}

export default function ChatContent({
  session,
  currentUser
}: ChatContentProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change or typing state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  // Load messages when session changes
  useEffect(() => {
    if (session?.id) {
      setIsLoadingMessages(true);
      chatSessionMessagesService
        .getAdminSessionMessages(session.id)
        .then((response) => {
          if (response.success && response.messages) {
            // Convert API messages to expected format
            const convertedMessages: Message[] = response.messages.map(
              (apiMessage: any) => {
                return {
                  id: apiMessage.id,
                  sessionId: apiMessage.sessionId,
                  senderId: apiMessage.sender.id,
                  content: apiMessage.content,
                  createdAt: apiMessage.created_at, // API uses snake_case
                  sender: {
                    id: apiMessage.sender.id,
                    firstName: apiMessage.sender.firstName,
                    lastName: apiMessage.sender.lastName,
                    email: apiMessage.sender.email,
                    role: apiMessage.sender.role,
                    profilePicture: undefined // API doesn't provide profile picture
                  }
                };
              }
            );

            setMessages(convertedMessages);
          } else {
            setMessages([]);
          }
        })
        .catch((error) => {
          console.error('Error loading messages:', error);
          setMessages([]);
        })
        .finally(() => {
          setIsLoadingMessages(false);
        });
    } else {
      setMessages([]);
    }
  }, [session?.id]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !session) return;

    // Simulate typing response from other user
    setTimeout(() => {
      // setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }, 500);

    // Clear input after "sending"
    setNewMessage('');
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
    if (!session?.participants || session.participants.length === 0) {
      return null;
    }

    // Filter out current user and get the first other participant
    const otherParticipant = session.participants.find((p) => {
      // Handle both API format (ChatParticipantAPI) and converted format (ChatParticipant)
      if ('user' in p) {
        // Converted format - has user property
        return p.userId !== currentUser.id;
      } else {
        // API format - direct participant data
        return (p as ChatParticipantAPI).userId !== currentUser.id;
      }
    });

    if (!otherParticipant) {
      return null;
    }

    // Return user data based on format
    if ('user' in otherParticipant && otherParticipant.user) {
      // Converted format - return the user object
      return otherParticipant.user;
    } else {
      // API format - convert participant to ChatUser
      const apiParticipant = otherParticipant as ChatParticipantAPI;

      // Safety check for required fields
      if (!apiParticipant.userId) {
        return null;
      }

      const convertedUser = {
        id: apiParticipant.userId,
        firstName: apiParticipant.firstName || 'Unknown',
        lastName: apiParticipant.lastName || '',
        email: apiParticipant.email || '',
        role: apiParticipant.userRole || 'USER',
        profilePicture: undefined // API doesn't provide profile picture
      };

      return convertedUser;
    }
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

  // Show fallback if no other participant found
  if (!otherParticipant) {
    return (
      <Card className='flex h-full items-center justify-center'>
        <div className='text-muted-foreground text-center'>
          <h3 className='text-lg font-medium'>Unable to load chat</h3>
          <p className='text-sm'>
            This chat session appears to have no participants
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className='flex h-full max-h-[calc(100vh-8rem)] flex-col gap-0 py-0'>
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
              {otherParticipant?.lastName
                ? otherParticipant.lastName.charAt(0)
                : ''}
            </AvatarFallback>
          </Avatar>

          <div>
            <div className='flex items-center space-x-2'>
              <h3 className='font-medium'>
                {otherParticipant?.firstName}
                {otherParticipant?.lastName && ` ${otherParticipant.lastName}`}
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
      <div className='relative flex-1 overflow-hidden'>
        <ScrollArea
          ref={scrollAreaRef}
          className='h-full max-h-[calc(100vh-16rem)]'
        >
          <div className='space-y-4 p-4 pb-6'>
            {isLoadingMessages ? (
              <div className='flex h-32 items-center justify-center'>
                <div className='flex items-center space-x-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <p className='text-muted-foreground text-center'>
                    Loading messages...
                  </p>
                </div>
              </div>
            ) : messages && messages.length > 0 ? (
              messages.map((message, index) => {
                const isCurrentUser = message.senderId === currentUser.id;
                const showAvatar =
                  index === 0 ||
                  messages[index - 1]?.senderId !== message.senderId;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex space-x-3',
                      isCurrentUser && 'flex-row-reverse space-x-reverse'
                    )}
                  >
                    {/* Avatar */}
                    <div className='flex flex-col items-center'>
                      {showAvatar ? (
                        <Avatar className='h-8 w-8'>
                          <AvatarImage
                            src={message.sender?.profilePicture}
                            alt={message.sender?.firstName}
                          />
                          <AvatarFallback className='text-xs'>
                            {message.sender?.firstName?.charAt(0) || 'U'}
                            {message.sender?.lastName
                              ? message.sender.lastName.charAt(0)
                              : ''}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className='h-8 w-8' /> // Spacer for alignment
                      )}
                    </div>

                    {/* Message Content */}
                    <div
                      className={cn(
                        'flex max-w-[85%] flex-col space-y-1 sm:max-w-[70%]',
                        isCurrentUser && 'items-end'
                      )}
                    >
                      {showAvatar && (
                        <div
                          className={cn(
                            'text-muted-foreground flex items-center space-x-2 text-xs',
                            isCurrentUser && 'flex-row-reverse space-x-reverse'
                          )}
                        >
                          <span className='font-medium'>
                            {isCurrentUser
                              ? 'You'
                              : `${message.sender?.firstName}${message.sender?.lastName ? ` ${message.sender.lastName}` : ''}`}
                          </span>
                          {message.sender?.role &&
                            message.sender.role !== 'USER' && (
                              <Badge
                                variant='outline'
                                className={cn(
                                  'h-4 px-1 py-0 text-xs',
                                  getRoleColor(message.sender.role)
                                )}
                              >
                                {message.sender.role}
                              </Badge>
                            )}
                        </div>
                      )}

                      <div
                        className={cn(
                          'rounded-lg px-3 py-2 text-sm leading-relaxed',
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className='break-words whitespace-pre-wrap'>
                          {message.content}
                        </p>
                      </div>

                      <span
                        className={cn(
                          'text-muted-foreground text-xs',
                          isCurrentUser && 'text-right'
                        )}
                      >
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className='flex h-32 items-center justify-center'>
                <p className='text-muted-foreground text-center'>
                  No messages yet. Start the conversation!
                </p>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className='flex space-x-3'>
                <Avatar className='h-8 w-8'>
                  <AvatarImage
                    src={otherParticipant?.profilePicture}
                    alt={otherParticipant?.firstName}
                  />
                  <AvatarFallback className='text-xs'>
                    {otherParticipant?.firstName?.charAt(0) || 'U'}
                    {otherParticipant?.lastName
                      ? otherParticipant.lastName.charAt(0)
                      : ''}
                  </AvatarFallback>
                </Avatar>
                <div className='flex items-center space-x-2'>
                  <div className='bg-muted rounded-lg px-3 py-2'>
                    <div className='flex space-x-1'>
                      <div className='bg-muted-foreground h-2 w-2 animate-bounce rounded-full' />
                      <div
                        className='bg-muted-foreground h-2 w-2 animate-bounce rounded-full'
                        style={{ animationDelay: '0.1s' }}
                      />
                      <div
                        className='bg-muted-foreground h-2 w-2 animate-bounce rounded-full'
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Auto scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        {/* Gradient fade untuk indikasi scroll */}
        <div className='from-background pointer-events-none absolute right-0 bottom-0 left-0 h-4 bg-gradient-to-t to-transparent' />
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
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isTyping}
            size='icon'
            className='shrink-0'
          >
            <Send className='h-4 w-4' />
          </Button>
        </div>
        <div className='mt-2 flex items-center justify-between'>
          <p className='text-muted-foreground text-xs'>
            Press Enter to send, Shift+Enter for new line
          </p>
          {isTyping && (
            <p className='text-muted-foreground text-xs'>
              {otherParticipant?.firstName} is typing...
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
