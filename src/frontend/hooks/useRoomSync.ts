'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SyncMessage {
  type: 'JOIN' | 'SYNC_VIDEO' | 'CHAT_MESSAGE';
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
  onSyncReceived: (state: { playing: boolean; currentTime: number }) => void;
}

export function useRoomSync({ roomCode, displayName, onSyncReceived }: UseRoomSyncProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
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
        roomCode
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
    };
  }, [roomCode, onSyncReceived]);

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

  return { isConnected, sendSyncAction, sendChatMessage, messages };
}
