'use client';

import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/frontend/config/supabase';

interface MediaSelectorProps {
  onMediaSelected: (url: string, type: 'file' | 'youtube') => void;
}

export default function MediaSelector({ onMediaSelected }: MediaSelectorProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractYoutubeId = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') return urlObj.pathname.slice(1);
      if (urlObj.hostname.includes('youtube.com')) {
        if (urlObj.pathname.includes('/embed/')) return urlObj.pathname.split('/embed/')[1];
        if (urlObj.pathname.includes('/v/')) return urlObj.pathname.split('/v/')[1];
        return urlObj.searchParams.get('v');
      }
      return null;
    } catch (e) {
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[7].length === 11) ? match[7] : null;
    }
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const videoId = extractYoutubeId(youtubeUrl);
    if (videoId) {
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
    setUploadProgress(0);
    setError('');
    
    try {
      const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'Local-videos';

      // DEBUG: Check if we can see any buckets
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets?.map(b => b.name));
      if (bucketError) console.error('Bucket List Error:', bucketError);

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      console.log('Uploading file to Supabase:', fileName, 'Type:', file.type);

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Supabase Storage Error Details:', uploadError);
        throw new Error(uploadError.message || 'Upload failed');
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);


      setIsUploading(false);
      onMediaSelected(publicUrl, 'file');
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full bg-zinc-900/40 backdrop-blur-3xl rounded-[32px] border border-white/5 overflow-hidden shadow-2xl">
      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            activeTab === 'upload' ? 'text-blue-500 bg-blue-500/5 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Direct Upload
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            activeTab === 'url' ? 'text-blue-500 bg-blue-500/5 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          YouTube Link
        </button>
      </div>

      <div className="p-10">
        {activeTab === 'upload' ? (
          <div className="space-y-6">
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-500 ${
                isUploading 
                  ? 'border-zinc-800 bg-zinc-950/50 cursor-not-allowed' 
                  : 'border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 cursor-pointer group'
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
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-zinc-800 rounded-[24px] flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-blue-600/20 transition-all duration-500">
                    <svg className="w-10 h-10 text-zinc-500 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-black text-sm uppercase tracking-wider">Select Movie File</p>
                    <p className="text-zinc-500 text-xs mt-2 font-medium">MP4 or WebM • Max 50MB</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                  <div>
                    <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Uploading to Space</p>
                    <p className="text-zinc-600 text-[9px] mt-2 font-bold uppercase tracking-widest">Please do not close this window</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleYoutubeSubmit} className="space-y-8">
            <div className="space-y-4 text-center">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Global YouTube Search</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-16 pr-6 py-5 bg-zinc-950/50 border border-zinc-800 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 text-white font-medium placeholder:text-zinc-800 transition-all"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center bg-red-400/5 py-3 px-6 rounded-xl border border-red-400/20">{error}</p>}
            <button
              type="submit"
              disabled={!youtubeUrl}
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-[20px] font-black text-lg transition-all shadow-lg active:scale-[0.98] uppercase tracking-widest text-[11px]"
            >
              Prepare Cinema
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
