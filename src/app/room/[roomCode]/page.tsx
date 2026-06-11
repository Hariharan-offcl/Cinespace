'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import PasscodeGate from '@/frontend/components/PasscodeGate';
import MediaSelector from '@/frontend/components/MediaSelector';
import VideoPlayer from '@/frontend/components/VideoPlayer';
import ChatBox from '@/frontend/components/ChatBox';
import { useRoomSync } from '@/frontend/hooks/useRoomSync';

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  
  const [isVerified, setIsVerified] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'file' | 'youtube' | null>(null);
  
  // Real-time remote action state
  const [remoteAction, setRemoteAction] = useState<{ action: 'PLAY' | 'PAUSE' | 'SEEK'; time: number; timestamp: number } | null>(null);

  useEffect(() => {
    const savedName = localStorage.getItem(`cinespace_name_${roomCode}`);
    if (savedName) {
      setDisplayName(savedName);
      setIsVerified(true);
    }
  }, [roomCode]);

  const handleSyncReceived = useCallback((action: 'PLAY' | 'PAUSE' | 'SEEK', time: number, timestamp: number) => {
    setRemoteAction({ action, time, timestamp });
  }, []);

  const { isConnected, sendSyncAction, sendChatMessage, messages } = useRoomSync({
    roomCode,
    displayName: displayName || 'Anonymous',
    onSyncReceived: handleSyncReceived,
  });

  const handleVerified = (name: string) => {
    setDisplayName(name);
    setIsVerified(true);
  };

  const handleMediaSelected = (url: string, type: 'file' | 'youtube') => {
    setVideoUrl(url);
    setMediaType(type);
  };

  const handleVideoAction = (action: 'PLAY' | 'PAUSE' | 'SEEK', time: number) => {
    // Only send action if it wasn't triggered by a remote sync to avoid infinite loops
    sendSyncAction(action, time);
  };

  if (!isVerified) {
    return <PasscodeGate roomCode={roomCode} onVerified={handleVerified} />;
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tighter text-blue-500">CINESPACE</h1>
          <div className="h-6 w-[1px] bg-zinc-700" />
          <p className="text-zinc-400 font-mono text-sm uppercase">ROOM: {roomCode}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Connection Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isConnected ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
          <div className="flex items-center gap-3 bg-zinc-800/50 px-4 py-2 rounded-full border border-zinc-700">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{displayName}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Side: Video Player Area */}
        <div className="flex-1 flex flex-col bg-zinc-950 items-center justify-center relative">
          {!videoUrl ? (
            <div className="w-full max-w-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-zinc-200 mb-2 tracking-tight">Theater Setup</h2>
                <p className="text-zinc-500">Upload your clip or share a YouTube link</p>
              </div>
              <MediaSelector onMediaSelected={handleMediaSelected} />
            </div>
          ) : (
            <div className="w-full max-w-5xl p-6">
              <VideoPlayer 
                url={videoUrl} 
                type={mediaType!} 
                onAction={handleVideoAction}
                remoteAction={remoteAction}
              />
              <div className="mt-6 flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <div className="flex items-center gap-4">
                  <span className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-blue-400/20">
                    {mediaType}
                  </span>
                  <span className="truncate max-w-md text-sm text-zinc-400 font-medium">{videoUrl}</span>
                </div>
                <button 
                  onClick={() => setVideoUrl(null)}
                  className="text-zinc-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-2 group"
                >
                  <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Media
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Chat Sidebar (Task F5) */}
        <aside className="w-80 border-l border-zinc-800 bg-zinc-900/30 flex flex-col shadow-2xl overflow-hidden">
          <ChatBox 
            messages={messages} 
            onSendMessage={sendChatMessage} 
            currentUserName={displayName || 'Anonymous'} 
          />
        </aside>
      </main>
    </div>
  );
}
