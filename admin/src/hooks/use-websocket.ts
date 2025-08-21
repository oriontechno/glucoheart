'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message } from '@/types/chat';
import { config } from '@/config/env';

interface UseWebSocketOptions {
  enabled?: boolean;
  onNewMessage?: (message: Message) => void;
  onSessionUpdate?: (data: any) => void;
}

export function useWebSocket({
  enabled = true,
  onNewMessage,
  onSessionUpdate
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;

    const connectSocket = async () => {
      try {
        // Get token from iron session
        const tokenResponse = await fetch('/api/auth/websocket-token', {
          credentials: 'include'
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to get websocket token');
        }

        const { token } = await tokenResponse.json();

        // Create socket connection
        const socket = io(`${config.NEXT_PUBLIC_BACKEND_URL}/chat`, {
          auth: { token },
          transports: ['websocket'],
          forceNew: true
        });

        socket.on('connect', () => {
          console.log('✅ Socket connected');
          setIsConnected(true);
          setError(null);
        });

        socket.on('disconnect', (reason) => {
          console.log('❌ Socket disconnected:', reason);
          setIsConnected(false);
        });

        socket.on('error', (err) => {
          console.error('❌ Socket error:', err);
          setError(err);
          setIsConnected(false);
        });

        // Listen for new messages
        socket.on('message.new', (message: Message) => {
          console.log('📨 New message received:', message);
          onNewMessage?.(message);
        });

        // Listen for session updates
        socket.on('session.nurseAssigned', (data) => {
          console.log('👩‍⚕️ Nurse assigned:', data);
          onSessionUpdate?.(data);
        });

        socketRef.current = socket;
      } catch (err) {
        console.error('❌ Socket connection error:', err);
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [enabled, onNewMessage, onSessionUpdate]);

  const joinSession = async (sessionId: number) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Socket not connected, cannot join session');
      return false;
    }

    try {
      const response = await socketRef.current.emitWithAck('session.join', {
        sessionId
      });
      if (response.ok) {
        setCurrentSessionId(sessionId);
        console.log(`✅ Joined session ${sessionId}`);
        return true;
      } else {
        console.error('❌ Failed to join session:', response.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error joining session:', error);
      return false;
    }
  };

  const leaveSession = async (sessionId: number) => {
    if (!socketRef.current || !isConnected) return;

    try {
      await socketRef.current.emitWithAck('session.leave', { sessionId });
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      console.log(`✅ Left session ${sessionId}`);
    } catch (error) {
      console.error('❌ Error leaving session:', error);
    }
  };

  const sendMessage = async (sessionId: number, content: string) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Socket not connected, cannot send message');
      return false;
    }

    try {
      const response = await socketRef.current.emitWithAck('message.send', {
        sessionId,
        content
      });
      if (response.ok) {
        console.log('✅ Message sent');
        return response.message;
      } else {
        console.error('❌ Failed to send message:', response.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  };

  return {
    isConnected,
    error,
    joinSession,
    leaveSession,
    sendMessage,
    currentSessionId
  };
}
