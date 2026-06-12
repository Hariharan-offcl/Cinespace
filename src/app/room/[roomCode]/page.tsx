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

  // Toast notifications state
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; type: 'join' | 'leave' }>>([]);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const showToast = useCallback((text: string, type: 'join' | 'leave') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const handleUserJoined = useCallback((name: string) => {
    showToast(`${name} joined`, 'join');
  }, [showToast]);

  const handleUserLeft = useCallback((name: string) => {
    showToast(`${name} left`, 'leave');
  }, [showToast]);

  const { isConnected, sendSyncAction, sendChatMessage, messages, typingUsers, sendTypingStatus, roomUsers } = useRoomSync({
    roomCode,
    displayName: displayName || 'Anonymous',
    enabled: isVerified,
    onSyncReceived: handleSyncReceived,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
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
      <header className="flex flex-col md:flex-row gap-4 items-center justify-between px-6 md:px-10 py-4 md:py-6 border-b border-white/5 bg-zinc-900/20 backdrop-blur-3xl z-50">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-center sm:text-left">
          <button onClick={() => router.push('/')} className="text-2xl md:text-3xl font-black tracking-[0.05em] text-blue-500 italic hover:scale-105 transition-transform active:scale-95 sm:pr-4 inline-block font-[family-name:var(--font-bebas)]">
            CINESPACE
          </button>
          <div className="hidden sm:block h-10 w-px bg-white/10" />
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <h2 className="text-white font-black text-lg md:text-xl leading-none mb-2 tracking-tight">{roomData.title}</h2>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-[0.3em] font-black">Theater ID</span>
              <span className="text-blue-500 font-mono text-[10px] font-black tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{roomCode}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8">
          {/* Home Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Home</span>
          </button>

          {/* Members Button */}
          <button
            onClick={() => setShowMembersModal(true)}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 transition-colors active:scale-95 cursor-pointer relative"
          >
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Members ({roomUsers.length})</span>
          </button>

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
      <main className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative no-scrollbar">
        {/* Ambient Light Effect */}
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />

        {/* Left Side: Cinematic Player Area */}
        <div className="w-full lg:flex-1 flex flex-col items-center justify-start relative p-4 md:p-6 lg:py-6 lg:px-12 overflow-y-auto lg:overflow-y-auto no-scrollbar">
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
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 glass p-5 sm:p-6 rounded-[24px] shadow-2xl">
              <div className="flex items-center gap-10 w-full sm:w-auto">
                <div className="flex flex-col w-full sm:w-auto">
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mb-3 text-center sm:text-left">Playback Source</span>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                      {roomData.videoType}
                    </div>
                    <span className="truncate max-w-xs sm:max-w-sm text-sm text-zinc-400 font-medium tracking-tight italic opacity-60 text-center sm:text-left">{roomData.videoUrl}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
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
        <aside className="w-full lg:w-[450px] h-[550px] lg:h-auto border-t lg:border-t-0 lg:border-l border-white/5 bg-zinc-900/10 backdrop-blur-3xl flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.3)] lg:shadow-[-40px_0_80px_rgba(0,0,0,0.5)] z-40">
          <ChatBox 
            messages={messages} 
            onSendMessage={sendChatMessage} 
            currentUserName={displayName || 'Anonymous'} 
            typingUsers={typingUsers}
            onTypingStatusChange={sendTypingStatus}
          />
        </aside>
      </main>

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl animate-slide-in pointer-events-auto ${
              toast.type === 'join'
                ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_10px_30px_-10px_rgba(34,197,94,0.3)]'
                : 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_10px_30px_-10px_rgba(239,68,68,0.3)]'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'join' ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{toast.text}</span>
          </div>
        ))}
      </div>

      {/* Members List Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md glass rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button 
              onClick={() => setShowMembersModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-black uppercase tracking-[0.05em] text-white flex items-center gap-3">
                <svg className="w-6 h-6 text-blue-500 animate-pulse-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Room Members
              </h3>
              <p className="text-zinc-500 text-[9px] uppercase tracking-widest font-black mt-2">
                Active connections in this session
              </p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
              {roomUsers.map((user, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    {/* User Avatar Circle */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs uppercase tracking-wider ${
                      user.isHost 
                        ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                        : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {user.displayName.slice(0, 2)}
                    </div>
                    <span className="text-xs font-black text-zinc-200 uppercase tracking-wider">
                      {user.displayName} {user.displayName === displayName && <span className="text-[9px] text-zinc-500 lowercase font-medium"> (you)</span>}
                    </span>
                  </div>
                  
                  {user.isHost && (
                    <span className="bg-blue-600/10 text-blue-500 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                      Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
