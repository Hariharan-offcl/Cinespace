'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface RoomUser {
  displayName: string;
  isHost: boolean;
}

interface SyncMessage {
  type: 'JOIN' | 'SYNC_VIDEO' | 'CHAT_MESSAGE' | 'TYPING' | 'USER_JOINED' | 'USER_LEFT' | 'ROOM_USERS';
  roomCode?: string;
  payload?: any;
}

interface ChatMessage {
  sender: string;
  text: string;
  timestamp: string;
}

interface UseRoomSyncProps {
  roomCode: string;
  displayName: string;
  enabled?: boolean;
  onSyncReceived: (state: { playing: boolean; currentTime: number }) => void;
  onUserJoined?: (displayName: string) => void;
  onUserLeft?: (displayName: string) => void;
}

export function useRoomSync({ roomCode, displayName, enabled = true, onSyncReceived, onUserJoined, onUserLeft }: UseRoomSyncProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const typingTimeoutsRef = useRef<{ [username: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // We connect to /api/sync
    const socket = new WebSocket(`${protocol}//${host}/api/sync`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Sync Engine: Connected to WebSocket');
      setIsConnected(true);

      // 1. Send JOIN message immediately upon connection
      socket.send(JSON.stringify({
        type: 'JOIN',
        roomCode,
        payload: {
          displayName
        }
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data: SyncMessage = JSON.parse(event.data);
        
        if (data.type === 'SYNC_VIDEO') {
          // payload contains { playing, currentTime }
          onSyncReceived(data.payload);
        } else if (data.type === 'CHAT_MESSAGE') {
          setMessages((prev) => [...prev, data.payload]);
        } else if (data.type === 'USER_JOINED') {
          const { displayName: joinedUser } = data.payload;
          setMessages((prev) => [
            ...prev,
            {
              sender: 'system',
              text: `${joinedUser} joined`,
              timestamp: new Date().toISOString()
            }
          ]);
          if (onUserJoined) onUserJoined(joinedUser);
        } else if (data.type === 'USER_LEFT') {
          const { displayName: leftUser } = data.payload;
          setMessages((prev) => [
            ...prev,
            {
              sender: 'system',
              text: `${leftUser} left`,
              timestamp: new Date().toISOString()
            }
          ]);
          if (onUserLeft) onUserLeft(leftUser);
        } else if (data.type === 'ROOM_USERS') {
          const { users } = data.payload;
          setRoomUsers(users);
        } else if (data.type === 'TYPING') {
          const { username, isTyping } = data.payload;
          if (isTyping) {
            setTypingUsers((prev) => {
              if (prev.includes(username)) return prev;
              return [...prev, username];
            });
            if (typingTimeoutsRef.current[username]) {
              clearTimeout(typingTimeoutsRef.current[username]);
            }
            typingTimeoutsRef.current[username] = setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u !== username));
              delete typingTimeoutsRef.current[username];
            }, 6000);
          } else {
            if (typingTimeoutsRef.current[username]) {
              clearTimeout(typingTimeoutsRef.current[username]);
              delete typingTimeoutsRef.current[username];
            }
            setTypingUsers((prev) => prev.filter((u) => u !== username));
          }
        }
      } catch (err) {
        console.error('Sync Engine: Failed to parse message', err);
      }
    };

    socket.onclose = () => {
      console.log('Sync Engine: Disconnected');
      setIsConnected(false);
    };

    return () => {
      socket.close();
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [roomCode, displayName, enabled, onSyncReceived, onUserJoined, onUserLeft]);

  const sendSyncAction = useCallback((playing: boolean, currentTime: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: SyncMessage = {
        type: 'SYNC_VIDEO',
        roomCode,
        payload: {
          playing,
          currentTime
        }
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [roomCode]);

  const sendChatMessage = useCallback((text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: SyncMessage = {
        type: 'CHAT_MESSAGE',
        roomCode,
        payload: {
          sender: displayName,
          text
        }
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [roomCode, displayName]);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message: SyncMessage = {
        type: 'TYPING',
        roomCode,
        payload: {
          username: displayName,
          isTyping
        }
      };
      socketRef.current.send(JSON.stringify(message));
    }
  }, [roomCode, displayName]);

  return { isConnected, sendSyncAction, sendChatMessage, messages, typingUsers, sendTypingStatus, roomUsers };
}
