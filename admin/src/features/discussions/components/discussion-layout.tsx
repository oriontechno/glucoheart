'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Discussion, ChatUser, Message } from '@/types/chat';
import { useWebSocket } from '@/hooks/use-websocket';
import DiscussionList from './discussion-list';
import ChatContent from './discussion-content';
import DiscussionContent from './discussion-content';

interface DiscussionsLayoutProps {
  sessions: Discussion[];
  currentUser: ChatUser;
}

export default function DiscussionsLayout({
  sessions: initialSessions,
  currentUser
}: DiscussionsLayoutProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<number>();
  const [sessions, setSessions] = useState<Discussion[]>(initialSessions);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);

  // Memoize callback functions to prevent websocket reconnection
  const handleNewMessage = useCallback(
    (message: Message) => {
      // Update last message for the relevant session
      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === message.sessionId) {
            return {
              ...session,
              lastMessage: message,
              lastMessageAt: message.createdAt
            };
          }
          return session;
        })
      );

      // Add to current messages if it's for the selected session
      if (message.sessionId === selectedSessionId) {
        setCurrentMessages((prevMessages) => {
          // Check if message already exists to avoid duplicates
          if (prevMessages.some((msg) => msg.id === message.id)) {
            return prevMessages;
          }
          return [...prevMessages, message];
        });
      }
    },
    [selectedSessionId]
  );

  const handleSessionUpdate = useCallback((data: any) => {
    // Handle session updates like nurse assignment
    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === data.sessionId) {
          return { ...session, ...data };
        }
        return session;
      })
    );
  }, []);

  // Global websocket connection for session list updates
  const { isConnected, joinSession, leaveSession, sendMessage } = useWebSocket({
    enabled: true,
    onNewMessage: handleNewMessage,
    onSessionUpdate: handleSessionUpdate
  });

  // Function to update a specific session
  const updateSession = (sessionId: number, updates: Partial<Discussion>) => {
    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      )
    );
  };

  // Reset current messages when session changes
  useEffect(() => {
    setCurrentMessages([]);
  }, [selectedSessionId]);

  // Update sessions when initialSessions change
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const selectedSession =
    sessions.find((s) => s.id === selectedSessionId) || null;

  useEffect(() => {}, [sessions, selectedSessionId]);

  return (
    <div className='grid h-full max-h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-3'>
      {/* Chat Session List - Left Side */}
      <div className='max-h-full overflow-hidden lg:col-span-1'>
        <DiscussionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSessionSelect={setSelectedSessionId}
          currentUser={currentUser}
        />
      </div>

      {/* Chat Content - Right Side */}
      <div className='max-h-full overflow-hidden lg:col-span-2'>
        <DiscussionContent
          session={selectedSession}
          currentUser={currentUser}
          onSessionUpdate={updateSession}
          websocketConnected={isConnected}
          onJoinSession={joinSession}
          onLeaveSession={leaveSession}
          onSendMessage={sendMessage}
          newMessages={currentMessages}
        />
      </div>
    </div>
  );
}
