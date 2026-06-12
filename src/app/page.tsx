'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MediaSelector from '@/frontend/components/MediaSelector';

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [roomCodeToJoin, setRoomCodeToJoin] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'initial' | 'create' | 'join'>('initial');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) {
      setError('Please select a video first.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation CreateRoom($title: String!, $videoUrl: String!, $passcode: String) {
              createRoom(title: $title, videoUrl: $videoUrl, passcode: $passcode) {
                roomCode
              }
            }
          `,
          variables: { title, videoUrl, passcode: passcode || null },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      router.push(`/room/${result.data.createRoom.roomCode}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create room. Is the database connected?');
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation JoinRoom($roomCode: String!, $passcode: String) {
              joinRoom(roomCode: $roomCode, passcode: $passcode) {
                roomCode
              }
            }
          `,
          variables: { roomCode: roomCodeToJoin.toUpperCase(), passcode: passcode || null },
        }),
      });

      const result = await response.json();
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      router.push(`/room/${result.data.joinRoom.roomCode}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join room. Check code and passcode.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden selection:bg-blue-500/30">
      {/* Cinematic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-float pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-float [animation-delay:2s] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
        <div className="text-center mb-16 animate-in fade-in zoom-in duration-1000">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            Cinespace • Watch Together
          </div>
          <h1 className="text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 mb-4 italic leading-tight pr-6 inline-block">
            CINESPACE
          </h1>
          <p className="text-zinc-400 text-xl font-medium max-w-md mx-auto leading-relaxed">
            High-fidelity synchronized cinema for you and your circle.
          </p>
        </div>

        {step === 'initial' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <button 
              onClick={() => setStep('create')}
              className="glass glass-hover p-12 rounded-[40px] group text-left relative overflow-hidden active:scale-95 transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-all" />
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(59,130,246,0.4)] group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-3xl font-black mb-3">Host Room</h2>
              <p className="text-zinc-500 font-medium leading-relaxed">Start a new private theater session.</p>
            </button>

            <button 
              onClick={() => setStep('join')}
              className="glass glass-hover p-12 rounded-[40px] group text-left relative overflow-hidden active:scale-95 transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-all" />
              <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(99,102,241,0.4)] group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-black mb-3">Join Theater</h2>
              <p className="text-zinc-500 font-medium leading-relaxed">Already have a code? Enter it here.</p>
            </button>
          </div>
        )}

        {step === 'create' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setStep('initial')} className="mb-8 text-zinc-500 hover:text-white flex items-center gap-2.5 transition-colors font-bold uppercase tracking-widest text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              Back to Home
            </button>
            <div className="glass p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-black mb-10 text-center tracking-tight">Theater Setup</h2>
              {!videoUrl ? (
                <MediaSelector onMediaSelected={(url) => setVideoUrl(url)} />
              ) : (
                <form onSubmit={handleCreateRoom} className="space-y-8">
                  <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl flex items-center justify-between group">
                    <div className="truncate mr-4">
                      <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mb-1">Selected Media</p>
                      <p className="truncate text-sm text-zinc-300 font-medium">{videoUrl}</p>
                    </div>
                    <button type="button" onClick={() => setVideoUrl('')} className="text-blue-500 hover:text-blue-400 text-xs font-black uppercase tracking-widest bg-blue-500/10 px-4 py-2 rounded-xl transition-all">Change</button>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Room Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Friday Movie Night"
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all text-white font-medium"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Passcode (Optional 4-digits)</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                      placeholder="0000"
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all text-white text-center text-3xl font-black font-mono tracking-[0.5em]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !title}
                    className="w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-3xl font-black text-xl transition-all shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] active:scale-[0.98] flex items-center justify-center gap-4 group"
                  >
                    {isLoading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : 'Launch Theater'}
                  </button>
                </form>
              )}
              {error && <p className="mt-6 text-red-400 text-sm text-center font-bold bg-red-400/10 py-3 rounded-2xl border border-red-400/20">{error}</p>}
            </div>
          </div>
        )}

        {step === 'join' && (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={() => setStep('initial')} 
              className="mb-10 text-zinc-400 hover:text-white flex items-center gap-3 transition-all font-black uppercase tracking-[0.2em] text-[12px] bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/5 hover:border-white/10 shadow-lg active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Go Back
            </button>
            <div className="glass p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-black mb-10 text-center tracking-tight">Join Session</h2>
              <form onSubmit={handleJoinRoom} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Room Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={roomCodeToJoin}
                    onChange={(e) => setRoomCodeToJoin(e.target.value.toUpperCase())}
                    placeholder="A1B2C3"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all text-white text-center text-3xl font-black font-mono tracking-[0.2em]"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Passcode (If required)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                    placeholder="0000"
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all text-white text-center text-3xl font-black font-mono tracking-[0.5em]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || roomCodeToJoin.length !== 6}
                  className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-3xl font-black text-xl transition-all shadow-[0_20px_40px_-10px_rgba(99,102,241,0.3)] active:scale-[0.98] flex items-center justify-center gap-4"
                >
                  {isLoading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enter Room'}
                </button>
              </form>
              {error && <p className="mt-6 text-red-400 text-sm text-center font-bold bg-red-400/10 py-3 rounded-2xl border border-red-400/20">{error}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-20 relative z-10 flex flex-col items-center gap-4 opacity-30 hover:opacity-100 transition-opacity">
        <div className="h-px w-12 bg-zinc-800" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Built for Cinephiles</p>
      </div>
    </main>
  );
}
