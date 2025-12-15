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

    // Bersihkan socket lama jika ada
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const connectSocket = async () => {
      try {
        const tokenResponse = await fetch('/api/auth/websocket-token');
        if (!tokenResponse.ok) throw new Error('Failed to get token');
        const { token } = await tokenResponse.json();

        const socket = io('/chat', {
          path: '/socket.io', 
          auth: { token },
          transports: ['polling', 'websocket'], 
          withCredentials: true,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
          console.log('✅ Connected to Chat Socket via Vercel Proxy');
          setIsConnected(true);
          setError(null);
        });

        socket.on('connect_error', (err) => {
          console.warn('⚠️ Socket connection attempt failed:', err.message);
          setIsConnected(false);
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 Socket Disconnected:', reason);
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
    if (!socketRef.current?.connected) return false;
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
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('session.leave', { sessionId });
    if (currentSessionId === sessionId) setCurrentSessionId(null);
  };

  const sendMessage = async (sessionId: number, content: string) => {
    if (!socketRef.current?.connected) return false;
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

  return { isConnected, error, joinSession, leaveSession, sendMessage, currentSessionId };
}