'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  type: 'SYNC' | 'CHAT';
  sender?: string;
  text?: string;
  timestamp: number;
}

interface ChatBoxProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  currentUserName: string;
}

export default function ChatBox({ messages, onSendMessage, currentUserName }: ChatBoxProps) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/30">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <h2 className="font-bold text-xs uppercase tracking-[0.2em] text-zinc-400">Live Chat</h2>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
          <span className="text-[10px] font-bold text-blue-500 uppercase">Live</span>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      >
        {messages.filter(m => m.type === 'CHAT').length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-4">
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs font-medium italic">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.filter(m => m.type === 'CHAT').map((msg, idx) => {
            const isMe = msg.sender === currentUserName;
            return (
              <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isMe ? 'text-blue-400' : 'text-zinc-500'}`}>
                    {isMe ? 'You' : msg.sender}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isMe 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700/50'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800">
        <form onSubmit={handleSubmit} className="relative group">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-zinc-800 transition-all placeholder:text-zinc-600 pr-12"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500 hover:text-blue-400 disabled:text-zinc-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
        <p className="mt-2 text-[9px] text-zinc-600 text-center uppercase tracking-widest font-bold">
          Press Enter to Send
        </p>
      </div>
    </div>
  );
}
