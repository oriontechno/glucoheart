'use client';

import { useState } from 'react';
import { ChatSession, ChatUser } from '@/types/chat';
import ChatSessionList from './chat-session-list';
import ChatContent from './chat-content';

interface ChatSessionsLayoutProps {
  sessions: ChatSession[];
  currentUser: ChatUser;
}

export default function ChatSessionsLayout({
  sessions,
  currentUser
}: ChatSessionsLayoutProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<number>();

  const selectedSession =
    sessions.find((s) => s.id === selectedSessionId) || null;

  return (
    <div className='grid h-full max-h-full grid-cols-1 gap-4 lg:grid-cols-3'>
      {/* Chat Session List - Left Side */}
      <div className='max-h-full lg:col-span-1'>
        <ChatSessionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSessionSelect={setSelectedSessionId}
          currentUser={currentUser}
        />
      </div>

      {/* Chat Content - Right Side */}
      <div className='max-h-full lg:col-span-2'>
        <ChatContent session={selectedSession} currentUser={currentUser} />
      </div>
    </div>
  );
}
