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

    // Gunakan namespace '/discussion'
    this.socket = io('/discussion', {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // WAJIB Polling dulu
      auth: { token: this.token },
      withCredentials: true,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to Discussion Socket via Proxy');
      setTimeout(() => {
        this.isReady = true;
        this.onConnectionChange?.(true);
      }, 500);
    });

    this.socket.on('disconnect', () => {
      this.isReady = false;
      this.onConnectionChange?.(false);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️ Discussion socket error:', err.message);
      this.isReady = false;
      this.onConnectionChange?.(false);
    });

    this.socket.on('discussion.message.new', (data: DiscussionWebSocketMessage) => {
      if (this.processedMessageIds.has(data.id)) return;
      this.processedMessageIds.add(data.id);

      // Cleanup cache memory
      if (this.processedMessageIds.size > 200) {
        this.processedMessageIds.clear();
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
          email: 'unknown',
          role: data.senderIsStaff ? 'ADMIN' : 'USER',
        }
      };
      this.onMessage?.(discussionMessage);
    });

    this.socket.on('discussion.room.updated', (data: any) => {
      this.onRoomUpdate?.(data);
    });
  }

  joinRoom(roomId: number): Promise<any> { return Promise.resolve({ ok: true }); }
  leaveRoom(roomId: number): Promise<void> { return Promise.resolve(); }
  joinLobby(): Promise<any> { return Promise.resolve({ ok: true }); }
  leaveLobby(): Promise<void> { return Promise.resolve(); }

  sendMessage(roomId: number, content: string): Promise<any> {
    if (!this.socket?.connected) return Promise.reject(new Error('Socket not connected'));

    return new Promise((resolve, reject) => {
      this.socket!.emit('discussion.message.send', { roomId, content }, (res: any) => {
        res?.ok ? resolve(res) : reject(new Error(res?.error || 'Failed'));
      });
    });
  }

  isConnected() { return this.socket?.connected ?? false; }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isReady = false;
  }
}