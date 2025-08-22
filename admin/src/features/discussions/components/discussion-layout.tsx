'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Discussion, ChatUser, Message, DiscussionMessage } from '@/types/chat';
import { useDiscussionWebSocket } from '@/hooks/use-discussion-websocket';
import DiscussionList from './discussion-list';
import ChatContent from './discussion-content';
import DiscussionContent from './discussion-content';

interface DiscussionsLayoutProps {
  sessions: Discussion[];
  currentUser: ChatUser;
  token?: string; // Add token prop
}

export default function DiscussionsLayout({
  sessions: initialSessions,
  currentUser,
  token = '' // Default empty token
}: DiscussionsLayoutProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<number>();
  const [sessions, setSessions] = useState<Discussion[]>(initialSessions);
  const [currentMessages, setCurrentMessages] = useState<DiscussionMessage[]>(
    []
  );

  // Track processed message IDs to prevent duplicates
  const processedMessageIds = useRef(new Set<number>());

  // Memoize callback functions to prevent websocket reconnection
  const handleNewMessage = useCallback(
    (message: DiscussionMessage) => {
      // Check for duplicates using message ID
      if (processedMessageIds.current.has(message.id)) {
        return;
      }

      // Add message ID to processed set
      processedMessageIds.current.add(message.id);

      // Clean up old message IDs (keep only last 1000 messages)
      if (processedMessageIds.current.size > 1000) {
        const idsArray = Array.from(processedMessageIds.current);
        const oldIds = idsArray.slice(0, idsArray.length - 1000);
        oldIds.forEach((id) => processedMessageIds.current.delete(id));
      }

      // Update last message for the relevant session
      setSessions((prevSessions) =>
        prevSessions.map((session) => {
          if (session.id === message.discussion_id) {
            return {
              ...session,
              last_message: message.content,
              last_message_at: message.created_at
            };
          }
          return session;
        })
      );

      // Add to current messages if it's for the selected session
      if (message.discussion_id === selectedSessionId) {
        setCurrentMessages((prevMessages) => {
          // Double check if message already exists in current messages
          if (prevMessages.some((msg) => msg.id === message.id)) {
            return prevMessages;
          }
          return [...prevMessages, message];
        });
      }
    },
    [selectedSessionId]
  );

  const handleRoomUpdate = useCallback((data: any) => {
    // Handle room updates for the discussion list
    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === data.roomId && data.lastMessage) {
          return {
            ...session,
            last_message: data.lastMessage.content,
            last_message_at: data.lastMessage.createdAt
          };
        }
        return session;
      })
    );
  }, []);

  // Discussion WebSocket connection
  const {
    isConnected,
    newMessages,
    roomUpdates,
    joinRoom,
    leaveRoom,
    joinLobby,
    leaveLobby,
    sendMessage,
    clearNewMessages,
    clearRoomUpdates
  } = useDiscussionWebSocket({
    token,
    enabled: !!token
  });

  // Handle new messages from websocket
  useEffect(() => {
    if (newMessages.length > 0) {
      newMessages.forEach(handleNewMessage);
      clearNewMessages();
    }
  }, [newMessages, handleNewMessage, clearNewMessages]);

  // Handle room updates from websocket
  useEffect(() => {
    if (roomUpdates.length > 0) {
      roomUpdates.forEach(handleRoomUpdate);
      clearRoomUpdates();
    }
  }, [roomUpdates, handleRoomUpdate, clearRoomUpdates]);

  // Join lobby when connected and ready
  useEffect(() => {
    if (isConnected) {
      joinLobby().catch((error) => {
        console.error('Failed to join lobby:', error);
      });
    }
  }, [isConnected, joinLobby]);

  const handleSessionUpdate = useCallback((data: any) => {
    // Handle session updates like nurse assignment (not used for discussions)
    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === data.sessionId) {
          return { ...session, ...data };
        }
        return session;
      })
    );
  }, []);

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
    // Clear processed message IDs for new session to allow fresh message loading
    processedMessageIds.current.clear();
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
          onJoinSession={joinRoom}
          onLeaveSession={leaveRoom}
          onSendMessage={sendMessage}
          newMessages={currentMessages}
        />
      </div>
    </div>
  );
}
