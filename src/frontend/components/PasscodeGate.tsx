import React, { useState, useEffect, useRef } from 'react';

interface PasscodeGateProps {
  roomCode: string;
  onVerified: (displayName: string) => void;
}

export default function PasscodeGate({ roomCode, onVerified }: PasscodeGateProps) {
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [step, setStep] = useState<'loading' | 'passcode' | 'name'>('loading');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if room requires passcode on load
  useEffect(() => {
    const checkRoom = async () => {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetRoom($roomCode: String!) {
                getRoom(roomCode: $roomCode) {
                  roomCode
                }
              }
            `,
            variables: { roomCode },
          }),
        });
        const result = await response.json();
        
        if (!result.data || !result.data.getRoom) {
          setError('Room not found');
          setStep('loading'); // Show error state
          return;
        }
        
        // Try joining with no passcode
        const joinResponse = await fetch('/api/graphql', {
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
            variables: { roomCode, passcode: null },
          }),
        });
        const joinResult = await joinResponse.json();
        
        if (joinResult.errors && joinResult.errors[0].message === 'Invalid passcode') {
          setStep('passcode');
        } else if (joinResult.errors) {
          setError(joinResult.errors[0].message);
        } else {
          setStep('name');
        }
      } catch (err) {
        setError('Failed to connect to server');
      }
    };
    checkRoom();
  }, [roomCode]);

  // Auto-focus input when the passcode screen appears
  useEffect(() => {
    if (step === 'passcode') {
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.length !== 4) return;
    
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
          variables: { roomCode, passcode },
        }),
      });
      const result = await response.json();
      
      if (result.errors) {
        setError(result.errors[0].message);
        setPasscode(''); // Reset
        inputRef.current?.focus();
      } else {
        setStep('name');
      }
    } catch (err) {
      setError('Verification failed');
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      localStorage.setItem(`cinespace_name_${roomCode}`, displayName.trim());
      onVerified(displayName.trim());
    } else {
      setError('Please enter a display name.');
    }
  };

  const updatePasscode = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setPasscode(digits);
  };

  if (step === 'loading' && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
      <div className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-zinc-800">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400 mb-2 italic tracking-tighter">CINESPACE</h1>
          <p className="text-zinc-500 text-sm font-medium">Entering Room: <span className="text-blue-500 font-mono font-bold tracking-wider">{roomCode}</span></p>
        </div>
        
        {step === 'passcode' ? (
          <form onSubmit={handlePasscodeSubmit} className="space-y-8">
            <div className="text-center relative">
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">
                Enter Private Passcode
              </label>
              
              {/* Visual Boxes */}
              <div 
                className="flex justify-center gap-4 mb-2 cursor-text"
                onClick={() => inputRef.current?.focus()}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-14 h-20 border-2 rounded-2xl flex items-center justify-center text-3xl font-bold transition-all duration-300 ${
                      passcode.length > i 
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-105 text-blue-500' 
                        : 'border-zinc-800 bg-zinc-800/50'
                    } ${passcode.length === i ? 'border-blue-500/50 ring-2 ring-blue-500/20' : ''}`}
                  >
                    {passcode[i] ? '•' : ''}
                  </div>
                ))}
              </div>

              {/* REAL Hidden Input */}
              <input
                ref={inputRef}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={4}
                value={passcode}
                onChange={(e) => updatePasscode(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-text"
                autoComplete="off"
                aria-label="Room Passcode"
                autoFocus
              />
              
              <p className="text-xs text-zinc-600 mt-6 font-medium">Type the 4-digit code to enter</p>
            </div>
            
            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20 font-medium">{error}</p>}
            
            <button
              type="submit"
              disabled={passcode.length !== 4}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-[0.98]"
            >
              Verify Access
            </button>
          </form>
        ) : step === 'name' ? (
          <form onSubmit={handleNameSubmit} className="space-y-8">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6 text-center">
                Your Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should friends see you?"
                className="w-full px-6 py-5 bg-zinc-800/50 border border-zinc-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-center text-xl font-medium placeholder:text-zinc-600 transition-all"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={!displayName.trim()}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-[0.98]"
            >
              Enter Theater
            </button>
          </form>
        ) : (
          <div className="space-y-8 text-center">
             <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
             <p className="text-red-400 font-bold">{error}</p>
             <button
                onClick={() => window.location.href = '/'}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all"
              >
                Return to Landing
              </button>
          </div>
        )}
      </div>
    </div>
  );
}
