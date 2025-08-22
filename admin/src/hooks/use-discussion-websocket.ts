'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DiscussionWebSocketService } from '@/lib/websocket/discussion-websocket.service';
import { DiscussionMessage } from '@/types/chat';

interface UseDiscussionWebSocketProps {
  token: string;
  enabled?: boolean;
}

export function useDiscussionWebSocket({
  token,
  enabled = true
}: UseDiscussionWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [newMessages, setNewMessages] = useState<DiscussionMessage[]>([]);
  const [roomUpdates, setRoomUpdates] = useState<any[]>([]);
  const serviceRef = useRef<DiscussionWebSocketService | null>(null);

  const handleMessage = useCallback((message: DiscussionMessage) => {
    setNewMessages((prev) => [...prev, message]);
  }, []);

  const handleRoomUpdate = useCallback((data: any) => {
    setRoomUpdates((prev) => [...prev, data]);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  useEffect(() => {
    if (!enabled || !token) return;

    serviceRef.current = new DiscussionWebSocketService(
      token,
      handleMessage,
      handleRoomUpdate,
      handleConnectionChange
    );

    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
        serviceRef.current = null;
      }
    };
  }, [token, enabled, handleMessage, handleRoomUpdate, handleConnectionChange]);

  const joinRoom = useCallback(async (roomId: number) => {
    if (!serviceRef.current) return;
    try {
      await serviceRef.current.joinRoom(roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  }, []);

  const leaveRoom = useCallback(async (roomId: number) => {
    if (!serviceRef.current) return;
    try {
      await serviceRef.current.leaveRoom(roomId);
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  }, []);

  const joinLobby = useCallback(async () => {
    if (!serviceRef.current) return;
    try {
      await serviceRef.current.joinLobby();
    } catch (error) {
      console.error('Failed to join lobby:', error);
    }
  }, []);

  const leaveLobby = useCallback(async () => {
    if (!serviceRef.current) return;
    try {
      await serviceRef.current.leaveLobby();
    } catch (error) {
      console.error('Failed to leave lobby:', error);
    }
  }, []);

  const sendMessage = useCallback(async (roomId: number, content: string) => {
    if (!serviceRef.current) return;
    try {
      return await serviceRef.current.sendMessage(roomId, content);
    } catch (error) {
      console.error('Failed to send message via WebSocket:', error);
      throw error;
    }
  }, []);

  const clearNewMessages = useCallback(() => {
    setNewMessages([]);
  }, []);

  const clearRoomUpdates = useCallback(() => {
    setRoomUpdates([]);
  }, []);

  return {
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
  };
}
