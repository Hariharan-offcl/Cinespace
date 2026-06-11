'use client';

import React, { useState } from 'react';

interface PasscodeGateProps {
  roomCode: string;
  onVerified: (displayName: string) => void;
}

export default function PasscodeGate({ roomCode, onVerified }: PasscodeGateProps) {
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [step, setStep] = useState<'passcode' | 'name'>('passcode');
  const [error, setError] = useState('');

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // TODO: Implement GraphQL verifyRoomPasscode(roomCode, passcode) call
    // For now, simulating success if passcode is 4 digits
    if (passcode.length === 4) {
      setStep('name');
    } else {
      setError('Please enter a 4-digit passcode.');
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      localStorage.setItem(`cinespace_name_${roomCode}`, displayName);
      onVerified(displayName);
    } else {
      setError('Please enter a display name.');
    }
  };

  const updatePasscode = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setPasscode(digits);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-8 shadow-2xl border border-zinc-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-500 mb-2">Cinespace</h1>
          <p className="text-zinc-400">Joining Room: <span className="text-zinc-200 font-mono font-bold">{roomCode}</span></p>
        </div>
        
        {step === 'passcode' ? (
          <form onSubmit={handlePasscodeSubmit} className="space-y-6">
            <div className="text-center">
              <label className="block text-sm font-medium text-zinc-400 mb-4">
                Enter 4-Digit Passcode
              </label>
              <div className="flex justify-center gap-3 mb-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-16 border-2 rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                      passcode.length > i 
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                        : 'border-zinc-700 bg-zinc-800'
                    }`}
                  >
                    {passcode[i] ? '•' : ''}
                  </div>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={passcode}
                onChange={(e) => updatePasscode(e.target.value)}
                className="opacity-0 absolute h-0 w-0"
                autoFocus
              />
              <p className="text-xs text-zinc-500 mt-4">Ask the room creator for the code</p>
            </div>
            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
            <button
              type="submit"
              disabled={passcode.length !== 4}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl font-bold text-lg transition-all active:scale-[0.98]"
            >
              Verify & Continue
            </button>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2 text-center">
                What should we call you?
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name..."
                className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-center text-lg placeholder:text-zinc-600"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-lg transition-all active:scale-[0.98]"
            >
              Enter Theater
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
