'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message } from '@/types/chat';

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

  const onNewMessageRef = useRef(onNewMessage);
  const onSessionUpdateRef = useRef(onSessionUpdate);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onSessionUpdate]);

  useEffect(() => {
    if (!enabled) return;

    const connectSocket = async () => {
      try {
        const tokenResponse = await fetch('/api/auth/websocket-token', {
          credentials: 'include'
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to get websocket token');
        }

        const { token } = await tokenResponse.json();

        const socket = io('/chat', {
          path: '/socket.io', // Default path, harus sesuai dengan rewrite di next.config
          auth: { token },
          transports: ['websocket', 'polling'], // Tambahkan polling sebagai fallback jika websocket gagal di proxy
          forceNew: true,
          reconnectionAttempts: 5
        });

        socket.on('connect', () => {
          console.log('✅ Connected to Chat WebSocket via Proxy');
          setIsConnected(true);
          setError(null);
        });

        socket.on('disconnect', (reason) => {
          console.log('❌ Disconnected:', reason);
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error('⚠️ Connection Error:', err.message);
          setError(err.message);
          setIsConnected(false);
        });

        socket.on('message.new', (message: Message) => {
          onNewMessageRef.current?.(message);
        });

        socket.on('session.nurseAssigned', (data) => {
          onSessionUpdateRef.current?.(data);
        });

        socketRef.current = socket;
      } catch (err) {
        console.error('❌ Socket initialization error:', err);
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
  }, [enabled]);

  const joinSession = async (sessionId: number) => {
    if (!socketRef.current || !isConnected) {
      return false;
    }
    try {
      const response = await socketRef.current.emitWithAck('session.join', { sessionId });
      if (response.ok) {
        setCurrentSessionId(sessionId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error joining session:', error);
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
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  };

  const sendMessage = async (sessionId: number, content: string) => {
    if (!socketRef.current || !isConnected) return false;
    try {
      const response = await socketRef.current.emitWithAck('message.send', {
        sessionId,
        content
      });
      return response.ok ? response.message : false;
    } catch (error) {
      console.error('Error sending message:', error);
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