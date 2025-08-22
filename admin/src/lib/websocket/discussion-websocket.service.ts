'use client';

import { io, Socket } from 'socket.io-client';
import { DiscussionMessage } from '@/types/chat';

export interface DiscussionWebSocketMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  createdAt: string;
  senderName?: string;
  senderAvatar?: string;
}

export class DiscussionWebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

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

    this.socket = io(`${process.env.NEXT_PUBLIC_API_URL}/discussion`, {
      transports: ['websocket'],
      auth: {
        token: this.token
      },
      forceNew: true,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('Discussion WebSocket connected');
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Discussion WebSocket disconnected:', reason);
      this.onConnectionChange?.(false);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }

      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Discussion WebSocket connection error:', error);
      this.onConnectionChange?.(false);
      this.handleReconnect();
    });

    // Listen for new messages
    this.socket.on(
      'discussion.message.created',
      (data: DiscussionWebSocketMessage) => {
        console.log('Received discussion message:', data);

        // Convert websocket message format to DiscussionMessage format
        const discussionMessage: DiscussionMessage = {
          id: data.id,
          discussion_id: data.roomId,
          user_id: data.senderId,
          content: data.content,
          created_at: data.createdAt,
          updated_at: data.createdAt,
          user: {
            id: data.senderId,
            firstName: data.senderName || 'Unknown',
            lastName: '',
            email: '',
            role: 'USER',
            profilePicture: data.senderAvatar
          }
        };

        this.onMessage?.(discussionMessage);
      }
    );

    // Listen for room updates (for discussion list)
    this.socket.on('discussion.room.updated', (data: any) => {
      console.log('Discussion room updated:', data);
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

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  joinRoom(roomId: number): Promise<any> {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('discussion.join', { roomId }, (response: any) => {
        if (response?.ok) {
          console.log(`Joined discussion room ${roomId}`);
          resolve(response);
        } else {
          console.error(
            `Failed to join discussion room ${roomId}:`,
            response?.error
          );
          reject(new Error(response?.error || 'Failed to join room'));
        }
      });
    });
  }

  leaveRoom(roomId: number): Promise<void> {
    if (!this.socket?.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.socket!.emit('discussion.leave', { roomId }, () => {
        console.log(`Left discussion room ${roomId}`);
        resolve();
      });
    });
  }

  joinLobby(): Promise<any> {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('discussion.lobby.join', {}, (response: any) => {
        if (response?.ok) {
          console.log('Joined discussion lobby');
          resolve(response);
        } else {
          console.error('Failed to join discussion lobby:', response?.error);
          reject(new Error(response?.error || 'Failed to join lobby'));
        }
      });
    });
  }

  leaveLobby(): Promise<void> {
    if (!this.socket?.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.socket!.emit('discussion.lobby.leave', {}, () => {
        console.log('Left discussion lobby');
        resolve();
      });
    });
  }

  sendMessage(roomId: number, content: string): Promise<any> {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit(
        'discussion.send.message',
        { roomId, content },
        (response: any) => {
          if (response?.ok) {
            console.log(`Message sent to discussion room ${roomId}`);
            resolve(response);
          } else {
            console.error(
              `Failed to send message to discussion room ${roomId}:`,
              response?.error
            );
            reject(new Error(response?.error || 'Failed to send message'));
          }
        }
      );
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
