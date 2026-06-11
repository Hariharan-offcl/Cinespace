'use client';

import React, { useState, useRef } from 'react';

interface MediaSelectorProps {
  onMediaSelected: (url: string, type: 'file' | 'youtube') => void;
}

import { supabase } from '@/frontend/config/supabase';

export default function MediaSelector({ onMediaSelected }: MediaSelectorProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateYoutubeUrl = (url: string) => {
    const regExp = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:&.*)?$/;
    return regExp.test(url);
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (validateYoutubeUrl(youtubeUrl)) {
      onMediaSelected(youtubeUrl, 'youtube');
    } else {
      setError('Please enter a valid YouTube URL');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit.');
      return;
    }

    setIsUploading(true);
    setError('');
    
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(data.path);

      setIsUploading(false);
      onMediaSelected(publicUrl, 'file');
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            activeTab === 'upload' ? 'text-blue-500 bg-blue-500/5 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Upload Video
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            activeTab === 'url' ? 'text-blue-500 bg-blue-500/5 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          YouTube Link
        </button>
      </div>

      <div className="p-8">
        {activeTab === 'upload' ? (
          <div className="space-y-6">
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                isUploading 
                  ? 'border-zinc-800 bg-zinc-900/50 cursor-not-allowed' 
                  : 'border-zinc-700 hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
                disabled={isUploading}
              />
              
              {!isUploading ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-zinc-200 font-medium">Click to upload or drag and drop</p>
                    <p className="text-zinc-500 text-sm mt-1">MP4, WebM (Max 50MB)</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="w-full bg-zinc-800 rounded-full h-2 max-w-[200px] mx-auto overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-blue-500 font-bold text-lg">{uploadProgress}%</p>
                  <p className="text-zinc-400 animate-pulse font-medium">Uploading to Supabase...</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleYoutubeSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 px-1 text-center block">Paste YouTube Video URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-zinc-600 transition-all"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 px-4 rounded-lg border border-red-400/20">{error}</p>}
            <button
              type="submit"
              disabled={!youtubeUrl}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl font-bold text-lg transition-all active:scale-[0.98]"
            >
              Set Media
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
