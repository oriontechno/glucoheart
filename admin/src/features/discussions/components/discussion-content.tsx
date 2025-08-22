'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, UserPlus, MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  ChatSession,
  Message,
  ChatUser,
  ChatParticipantAPI,
  Discussion,
  DiscussionMessage
} from '@/types/chat';
import { cn } from '@/lib/utils';
import { chatSessionMessagesService } from '@/lib/api/chat-session-messages.service';
import {
  discussionMessagesService,
  DiscussionMessagesService
} from '@/lib/api/discussion-messages.service';
import AssignNurseDialog from './assign-nurse-dialog';

interface DiscussionContentProps {
  session: Discussion | null;
  currentUser: ChatUser;
  onSessionUpdate?: (sessionId: number, updates: Partial<Discussion>) => void;
  websocketConnected?: boolean;
  onJoinSession?: (sessionId: number) => void;
  onLeaveSession?: (sessionId: number) => void;
  onSendMessage?: (sessionId: number, content: string) => Promise<any>;
  newMessages?: DiscussionMessage[];
}

export default function DiscussionContent({
  session,
  currentUser,
  onSessionUpdate,
  websocketConnected = false,
  onJoinSession,
  onLeaveSession,
  onSendMessage: sendWebSocketMessage,
  newMessages = []
}: DiscussionContentProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change or typing state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  // Handle session joining/leaving via websocket
  useEffect(() => {
    if (session?.id && websocketConnected && onJoinSession) {
      onJoinSession(session.id);

      return () => {
        if (session?.id && onLeaveSession) {
          onLeaveSession(session.id);
        }
      };
    }
  }, [session?.id, websocketConnected, onJoinSession, onLeaveSession]);

  // Handle new messages from websocket
  useEffect(() => {
    if (newMessages.length > 0) {
      setMessages((prevMessages) => {
        const uniqueMessages = [...prevMessages];
        newMessages.forEach((newMsg) => {
          if (!uniqueMessages.some((msg) => msg.id === newMsg.id)) {
            uniqueMessages.push(newMsg);
          }
        });
        return uniqueMessages;
      });
    }
  }, [newMessages]);

  // Load messages when session changes
  useEffect(() => {
    if (session?.id) {
      setIsLoadingMessages(true);

      DiscussionMessagesService.getDiscussionMessages(session.id)
        .then((response) => {
          console.log({ response });
          if (response.success && response.messages) {
            setMessages(response.messages);
          } else {
            setMessages([]);
          }
        })
        .catch((error) => {
          console.error('Error loading discussion messages:', error);
          setMessages([]);
        })
        .finally(() => {
          setIsLoadingMessages(false);
        });
    } else {
      setMessages([]);
    }
  }, [session?.id, refreshTrigger]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !session || isSending) return;

    const messageContent = newMessage.trim();
    setIsSending(true);

    try {
      // Try websocket first if connected
      if (websocketConnected && sendWebSocketMessage) {
        const wsResult = await sendWebSocketMessage(session.id, messageContent);
        if (wsResult) {
          // Clear input on successful websocket send
          setNewMessage('');
          setIsSending(false);
          return;
        }
      }

      // HTTP fallback using discussion messages API
      const response = await DiscussionMessagesService.sendDiscussionMessage(
        session.id,
        messageContent
      );

      if (response.success) {
        setNewMessage('');

        // Refresh messages to get the new message
        setTimeout(() => {
          if (session?.id) {
            DiscussionMessagesService.getDiscussionMessages(session.id)
              .then((refreshResponse) => {
                if (refreshResponse.success && refreshResponse.messages) {
                  setMessages(refreshResponse.messages);
                }
              })
              .catch((error) => {
                console.error('Error refreshing messages:', error);
              });
          }
        }, 500);
      } else {
        console.error('Failed to send message:', response.error);
        alert('Failed to send message: ' + response.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('An error occurred while sending the message. Please try again.');
    } finally {
      setIsSending(false);
    }
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

  if (!session) {
    return (
      <Card className='flex h-full items-center justify-center'>
        <div className='text-muted-foreground text-center'>
          <h3 className='text-lg font-medium'>Select a discussion</h3>
          <p className='text-sm'>
            Choose a discussion from the list to view details
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className='flex h-full max-h-[calc(100vh-8rem)] flex-col gap-0 py-0'>
      {/* Discussion Header - Fixed */}
      <div className='bg-card shrink-0 border-b p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full'>
              <MessageCircle className='h-5 w-5' />
            </div>

            <div>
              <div className='flex items-center space-x-2'>
                <h3 className='text-lg font-medium'>{session.topic}</h3>
                <Badge variant={session.is_public ? 'default' : 'secondary'}>
                  {session.is_public ? 'Public' : 'Private'}
                </Badge>
              </div>
              <p className='text-muted-foreground text-sm'>
                {session.description || 'No description available'}
              </p>
              <p className='text-muted-foreground mt-1 text-xs'>
                Created by User {session.created_by} •{' '}
                {formatMessageTime(session.created_at)}
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className='flex items-center space-x-2'>
            <div className='flex items-center space-x-1 text-xs'>
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  websocketConnected ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className='text-muted-foreground'>
                {websocketConnected ? 'Live' : 'Offline'}
              </span>
            </div>
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
                const isCurrentUser = message.user_id === currentUser.id;
                const showAvatar =
                  index === 0 ||
                  messages[index - 1]?.user_id !== message.user_id;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex w-full',
                      isCurrentUser
                        ? 'justify-end' // Align to right for current user
                        : 'justify-start' // Align to left for other users
                    )}
                  >
                    <div
                      className={cn(
                        'flex max-w-[85%] space-x-3 sm:max-w-[70%]',
                        isCurrentUser && 'flex-row-reverse space-x-reverse'
                      )}
                    >
                      {/* Avatar */}
                      <div className='flex flex-col items-center'>
                        {showAvatar ? (
                          <Avatar className='h-8 w-8'>
                            <AvatarImage
                              src={message.user?.profilePicture}
                              alt={message.user?.firstName}
                            />
                            <AvatarFallback className='text-xs'>
                              {message.user?.firstName?.charAt(0) || 'U'}
                              {message.user?.lastName
                                ? message.user.lastName.charAt(0)
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
                              isCurrentUser &&
                                'flex-row-reverse space-x-reverse'
                            )}
                          >
                            <span className='font-medium'>
                              {isCurrentUser
                                ? 'You'
                                : `${message.user?.firstName}${message.user?.lastName ? ` ${message.user.lastName}` : ''}`}
                            </span>
                            {message.user?.role &&
                              message.user.role !== 'USER' && (
                                <Badge
                                  variant='outline'
                                  className={cn(
                                    'h-4 px-1 py-0 text-xs',
                                    getRoleColor(message.user.role)
                                  )}
                                >
                                  {message.user.role}
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
                          {formatMessageTime(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className='flex h-32 flex-col items-center justify-center space-y-2 text-center'>
                <p className='text-muted-foreground text-center'>
                  No messages yet. Start the conversation!
                </p>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className='flex space-x-3'>
                <Avatar className='h-8 w-8'>
                  <AvatarFallback className='text-xs'>U</AvatarFallback>
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
            placeholder={isSending ? 'Sending...' : 'Type your message...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className='flex-1'
            disabled={isTyping || isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isTyping || isSending}
            size='icon'
            className='shrink-0'
          >
            {isSending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Send className='h-4 w-4' />
            )}
          </Button>
        </div>
        <div className='mt-2 flex items-center justify-between'>
          <p className='text-muted-foreground text-xs'>
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </Card>
  );
}
