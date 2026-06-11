'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SyncMessage {
  type: 'SYNC' | 'CHAT';
  action?: 'PLAY' | 'PAUSE' | 'SEEK';
  time?: number;
  sender?: string;
  text?: string;
  timestamp: number;
}

interface UseRoomSyncProps {
  roomCode: string;
  displayName: string;
  onSyncReceived: (action: 'PLAY' | 'PAUSE' | 'SEEK', time: number, timestamp: number) => void;
}

export function useRoomSync({ roomCode, displayName, onSyncReceived }: UseRoomSyncProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<SyncMessage[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    const socket = new WebSocket(`${protocol}//${host}/api/sync?room=${roomCode}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Sync Engine: Connected to WebSocket');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data: SyncMessage = JSON.parse(event.data);
        
        if (data.type === 'SYNC' && data.sender !== displayName) {
          if (data.action && data.time !== undefined) {
            onSyncReceived(data.action, data.time, data.timestamp);
          }
        } else if (data.type === 'CHAT') {
          setMessages((prev) => [...prev, data]);
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
  }, [roomCode, displayName, onSyncReceived]);

  const sendSyncAction = useCallback((action: 'PLAY' | 'PAUSE' | 'SEEK', time: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const payload: SyncMessage = {
        type: 'SYNC',
        action,
        time,
        sender: displayName,
        timestamp: Date.now(),
      };
      socketRef.current.send(JSON.stringify(payload));
    }
  }, [displayName]);

  const sendChatMessage = useCallback((text: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const payload: SyncMessage = {
        type: 'CHAT',
        text,
        sender: displayName,
        timestamp: Date.now(),
      };
      socketRef.current.send(JSON.stringify(payload));
      // Optimistically add own message
      setMessages((prev) => [...prev, payload]);
    }
  }, [displayName]);

  return { isConnected, sendSyncAction, sendChatMessage, messages };
}
