'use client';

import { io, Socket } from 'socket.io-client';
import { DiscussionMessage } from '@/types/chat';
import { config } from '@/config/env';

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
  private isReady = false; // Add ready state flag
  private processedMessageIds = new Set<number>(); // Track processed messages

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

    this.socket = io(`${config.NEXT_PUBLIC_BACKEND_URL}/discussion`, {
      transports: ['websocket'],
      auth: {
        token: this.token
      },
      forceNew: true,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;

      // Set ready flag after a small delay to ensure socket is fully initialized
      setTimeout(() => {
        this.isReady = true;
        this.onConnectionChange?.(true);
      }, 100);
    });

    this.socket.on('disconnect', (reason) => {
      this.isReady = false;
      this.onConnectionChange?.(false);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }

      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Discussion WebSocket connection error:', error);
      this.isReady = false;
      this.onConnectionChange?.(false);
      this.handleReconnect();
    });

    // Additional error handling for auth failures
    this.socket.on('error', (error) => {
      console.error('❌ Discussion WebSocket error:', error);
    });

    this.socket.on('auth_error', (error) => {
      console.error('❌ Discussion WebSocket auth error:', error);
    });

    // Listen for new messages
    this.socket.on(
      'discussion.message.new',
      (data: DiscussionWebSocketMessage) => {
        // Check for duplicate messages
        if (this.processedMessageIds.has(data.id)) {
          return;
        }

        // Add message ID to processed set
        this.processedMessageIds.add(data.id);

        // Clean up old message IDs (keep only last 500 messages)
        if (this.processedMessageIds.size > 500) {
          const idsArray = Array.from(this.processedMessageIds);
          const oldIds = idsArray.slice(0, idsArray.length - 500);
          oldIds.forEach((id) => this.processedMessageIds.delete(id));
        }

        // Convert websocket message format to DiscussionMessage format
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

    // Listen for room updates (for discussion list)
    this.socket.on('discussion.room.updated', (data: any) => {
      this.onRoomUpdate?.(data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  joinRoom(roomId: number): Promise<any> {
    // Backend automatically joins public room on connection
    // No manual room subscription needed
    return Promise.resolve({ ok: true });
  }

  leaveRoom(roomId: number): Promise<void> {
    // Backend automatically manages room membership via public feed
    // No manual unsubscribe needed
    return Promise.resolve();
  }

  joinLobby(): Promise<any> {
    // Backend automatically joins all logged-in users to public discussion feed
    // No manual lobby join needed
    return Promise.resolve({ ok: true });
  }

  leaveLobby(): Promise<void> {
    // Backend automatically manages lobby membership
    // No manual lobby leave needed
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
            console.error(
              `❌ Failed to send message to discussion room ${roomId}:`,
              response?.error
            );
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
    // Clear processed message IDs on disconnect
    this.processedMessageIds.clear();
  }
}
