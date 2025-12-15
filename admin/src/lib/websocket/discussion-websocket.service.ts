'use client';

import { io, Socket } from 'socket.io-client';
import { DiscussionMessage } from '@/types/chat';

export interface DiscussionWebSocketMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  createdAt: string;
  senderIsStaff?: boolean;
  sender?: {
    id: number;
    firstName: string;
    lastName?: string;
    email: string;
    role: string;
    profilePicture?: string;
  };
}

export class DiscussionWebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isReady = false;
  private processedMessageIds = new Set<number>();

  constructor(
    private token: string,
    private onMessage?: (message: DiscussionMessage) => void,
    private onRoomUpdate?: (data: any) => void,
    private onConnectionChange?: (connected: boolean) => void
  ) {
    this.connect();
  }

  private connect() {
    if (this.socket?.connected) return;

    this.socket = io('/discussion', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token: this.token
      },
      forceNew: true,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Discussion WebSocket via Proxy');
      this.reconnectAttempts = 0;
      setTimeout(() => {
        this.isReady = true;
        this.onConnectionChange?.(true);
      }, 100);
    });

    this.socket.on('disconnect', (reason) => {
      this.isReady = false;
      this.onConnectionChange?.(false);
      if (reason !== 'io server disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Discussion WebSocket connection error:', error);
      this.isReady = false;
      this.onConnectionChange?.(false);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('❌ Discussion WebSocket error:', error);
    });

    this.socket.on(
      'discussion.message.new',
      (data: DiscussionWebSocketMessage) => {
        if (this.processedMessageIds.has(data.id)) return;
        this.processedMessageIds.add(data.id);

        if (this.processedMessageIds.size > 500) {
          const idsArray = Array.from(this.processedMessageIds);
          const oldIds = idsArray.slice(0, idsArray.length - 500);
          oldIds.forEach((id) => this.processedMessageIds.delete(id));
        }

        const discussionMessage: DiscussionMessage = {
          id: data.id,
          discussion_id: data.roomId,
          user_id: data.senderId,
          content: data.content,
          created_at: data.createdAt,
          updated_at: data.createdAt,
          user: data.sender || {
            id: data.senderId,
            firstName: 'Unknown',
            lastName: '',
            email: '',
            role: data.senderIsStaff ? 'ADMIN' : 'USER',
            profilePicture: undefined
          }
        };

        this.onMessage?.(discussionMessage);
      }
    );

    this.socket.on('discussion.room.updated', (data: any) => {
      this.onRoomUpdate?.(data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  joinRoom(roomId: number): Promise<any> {
    return Promise.resolve({ ok: true });
  }

  leaveRoom(roomId: number): Promise<void> {
    return Promise.resolve();
  }

  joinLobby(): Promise<any> {
    return Promise.resolve({ ok: true });
  }

  leaveLobby(): Promise<void> {
    return Promise.resolve();
  }

  sendMessage(roomId: number, content: string): Promise<any> {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'discussion.message.send',
        { roomId, content },
        (response: any) => {
          if (response?.ok) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Failed to send message'));
          }
        }
      );
    });
  }

  isConnected(): boolean {
    return (this.socket?.connected && this.isReady) || false;
  }

  disconnect() {
    if (this.socket) {
      this.isReady = false;
      this.socket.disconnect();
      this.socket = null;
    }
    this.processedMessageIds.clear();
  }
}