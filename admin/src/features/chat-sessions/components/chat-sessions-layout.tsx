'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChatSession, ChatUser } from '@/types/chat';
import ChatSessionList from './chat-session-list';
import ChatContent from './chat-content';

interface ChatSessionsLayoutProps {
  sessions: ChatSession[];
  currentUser: ChatUser;
}

export default function ChatSessionsLayout({
  sessions: initialSessions,
  currentUser
}: ChatSessionsLayoutProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<number>();
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);

  // Update sessions when initialSessions change
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const selectedSession =
    sessions.find((s) => s.id === selectedSessionId) || null;

  // Function to update a specific session
  const updateSession = (sessionId: number, updates: Partial<ChatSession>) => {
    setSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      )
    );
  };

  useEffect(() => {
    console.log({ sessions, selectedSessionId });
  }, [sessions, selectedSessionId]);

  return (
    <div className='grid h-full max-h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-3'>
      {/* Chat Session List - Left Side */}
      <div className='max-h-full overflow-hidden lg:col-span-1'>
        <ChatSessionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSessionSelect={setSelectedSessionId}
          currentUser={currentUser}
        />
      </div>

      {/* Chat Content - Right Side */}
      <div className='max-h-full overflow-hidden lg:col-span-2'>
        <ChatContent
          session={selectedSession}
          currentUser={currentUser}
          onSessionUpdate={updateSession}
        />
      </div>
    </div>
  );
}
