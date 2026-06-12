'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PasscodeGate from '@/frontend/components/PasscodeGate';
import VideoPlayer from '@/frontend/components/VideoPlayer';
import ChatBox from '@/frontend/components/ChatBox';
import { useRoomSync } from '@/frontend/hooks/useRoomSync';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  
  const [isVerified, setIsVerified] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<{
    title: string;
    videoUrl: string;
    videoType: 'YOUTUBE' | 'FILE';
  } | null>(null);
  
  // Local state for the player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  // Fetch initial room data from DB
  const fetchRoomData = useCallback(async () => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetRoom($roomCode: String!) {
              getRoom(roomCode: $roomCode) {
                title
                videoUrl
                videoType
              }
            }
          `,
          variables: { roomCode },
        }),
      });
      const result = await response.json();
      if (result.data.getRoom) {
        setRoomData(result.data.getRoom);
      } else {
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to fetch room data:', err);
    }
  }, [roomCode, router]);

  useEffect(() => {
    // We use sessionStorage instead of localStorage so that different tabs 
    // can have different user names for testing!
    const savedName = sessionStorage.getItem(`cinespace_name_${roomCode}`);
    if (savedName) {
      setDisplayName(savedName);
      setIsVerified(true);
      fetchRoomData();
    }
  }, [roomCode, fetchRoomData]);

  const handleSyncReceived = useCallback((state: { playing: boolean; currentTime: number }) => {
    console.log('Sync Received from Server:', state);
    setIsPlaying(state.playing);
    setCurrentTime(state.currentTime);
  }, []);

  const { isConnected, sendSyncAction, sendChatMessage, messages } = useRoomSync({
    roomCode,
    displayName: displayName || 'Anonymous',
    onSyncReceived: handleSyncReceived,
  });

  const handleVerified = (name: string) => {
    setDisplayName(name);
    setIsVerified(true);
    fetchRoomData();
  };

  const handleVideoAction = (playing: boolean, time: number) => {
    setIsPlaying(playing);
    setCurrentTime(time);
    sendSyncAction(playing, time);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  if (!isVerified) {
    return <PasscodeGate roomCode={roomCode} onVerified={handleVerified} />;
  }

  if (!roomData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Cinematic Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/5 bg-zinc-900/20 backdrop-blur-3xl z-50">
        <div className="flex items-center gap-8">
          <button onClick={() => router.push('/')} className="text-2xl font-black tracking-tighter text-blue-500 italic hover:scale-105 transition-transform active:scale-95">
            CINESPACE
          </button>
          <div className="h-10 w-px bg-white/10" />
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <h2 className="text-white font-black text-xl leading-none mb-2 tracking-tight">{roomData.title}</h2>
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-[0.3em] font-black">Theater ID</span>
              <span className="text-blue-500 font-mono text-[10px] font-black tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{roomCode}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className={`flex items-center gap-2.5 px-5 py-2 rounded-2xl border ${isConnected ? 'bg-green-500/5 border-green-500/20 text-green-500' : 'bg-red-500/5 border-red-500/20 text-red-500'} transition-colors`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isConnected ? 'Sync Online' : 'Sync Error'}</span>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-5 py-2.5 rounded-[20px] border border-white/10 shadow-inner group">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)] group-hover:scale-125 transition-transform" />
            <span className="text-xs font-black text-zinc-300 uppercase tracking-[0.1em]">{displayName}</span>
          </div>
        </div>
      </header>

      {/* Main Theater View */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Ambient Light Effect */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />

        {/* Left Side: Cinematic Player Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-12 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-6xl animate-in fade-in zoom-in duration-700">
            <div className="rounded-[40px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5 bg-zinc-950 ring-1 ring-white/10">
              <VideoPlayer 
                url={roomData.videoUrl} 
                type={roomData.videoType === 'YOUTUBE' ? 'youtube' : 'file'} 
                playing={isPlaying}
                currentTime={currentTime}
                onAction={handleVideoAction}
              />
            </div>

            {/* Controls & Metadata Panel */}
            <div className="mt-12 flex items-center justify-between glass p-8 rounded-[32px] shadow-2xl">
              <div className="flex items-center gap-10">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-3">Playback Source</span>
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                      {roomData.videoType}
                    </div>
                    <span className="truncate max-w-sm text-sm text-zinc-400 font-medium tracking-tight italic opacity-60">{roomData.videoUrl}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={copyLink}
                  className={`relative overflow-hidden group px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-3 ${
                    showCopyFeedback ? 'bg-green-600 text-white' : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                  }`}
                >
                  {showCopyFeedback ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      Invite Circle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Enhanced Chat Sidebar */}
        <aside className="w-[450px] border-l border-white/5 bg-zinc-900/10 backdrop-blur-3xl flex flex-col shadow-[-40px_0_80px_rgba(0,0,0,0.5)] z-40">
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
