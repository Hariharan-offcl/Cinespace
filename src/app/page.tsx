'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (title.length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }

    if (passcode.length !== 4) {
      setError('Passcode must be exactly 4 digits.');
      return;
    }

    setIsLoading(true);

    // TODO: Implement GraphQL createRoom(title, passcode) call
    // For now, simulating a successful creation and redirecting to a random room code
    setTimeout(() => {
      const mockRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      router.push(`/room/${mockRoomCode}`);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black tracking-tighter text-blue-500 mb-4 italic">CINESPACE</h1>
          <p className="text-zinc-400 text-lg font-medium">Watch together, anywhere.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleCreateRoom} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">Room Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Friday Movie Night"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 ml-1">4-Digit Passcode</label>
              <input
                type="text"
                maxLength={4}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-zinc-700"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !title || passcode.length !== 4}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-2xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Room...
                </>
              ) : (
                'Create New Theater'
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-zinc-500 text-sm">
          Have a room code? Just paste the URL in your browser.
        </p>
      </div>
    </main>
  );
}
