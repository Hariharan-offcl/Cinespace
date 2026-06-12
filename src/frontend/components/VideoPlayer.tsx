'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface VideoPlayerProps {
  url: string;
  type: 'file' | 'youtube';
  playing: boolean;
  currentTime: number;
  onAction: (playing: boolean, time: number) => void;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function VideoPlayer({ url, type, playing, currentTime, onAction }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const blockBroadcastUntil = useRef(0);

  // --- 1. Extract YouTube ID & Handle File Ready ---
  useEffect(() => {
    const getYoutubeId = (vUrl: string) => {
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = vUrl.match(regExp);
      return (match && match[7].length === 11) ? match[7] : null;
    };
    
    if (type === 'youtube') {
      setIsReady(false);
      setVideoId(getYoutubeId(url));
    } else {
      // Files are ready as soon as the source is set
      setIsReady(true);
    }
  }, [url, type]);

  // --- 2. Initialize YouTube Player ---
  useEffect(() => {
    if (type !== 'youtube' || !videoId) return;

    let player: any = null;
    let isMounted = true;

    const createPlayer = () => {
      if (!isMounted || !document.getElementById('yt-player-target')) return;

      // Clear existing player if any
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }

      player = new window.YT.Player('yt-player-target', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
          enablejsapi: 1,
          widget_referrer: typeof window !== 'undefined' ? window.location.origin : ''
        },
        events: {
          onReady: () => {
            console.log('Cinema API Ready');
            setIsReady(true);
            if (playing) player.playVideo();
            player.seekTo(currentTime, true);
          },
          onStateChange: (event: any) => {
            // Avoid broadcasting if we just received a sync from someone else
            if (Date.now() < blockBroadcastUntil.current) return;

            const time = player.getCurrentTime();
            // 1 = PLAYING, 2 = PAUSED
            if (event.data === 1) onAction(true, time);
            else if (event.data === 2) onAction(false, time);
          }
        }
      });
      ytPlayerRef.current = player;
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      if (!document.getElementById('youtube-sdk')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-sdk';
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
          document.body.appendChild(tag);
        }
      }
      
      // Use a more robust way to wait for the API
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          createPlayer();
          clearInterval(checkYT);
        }
      }, 100);
      
      return () => clearInterval(checkYT);
    }

    return () => {
      isMounted = false;
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [videoId, type]);

  // --- 3. React to Sync from Others ---
  useEffect(() => {
    if (!isReady) return;

    // Block our own listeners from sending this back out
    blockBroadcastUntil.current = Date.now() + 1500;

    if (type === 'file' && videoRef.current) {
      if (playing) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
      
      const drift = Math.abs(videoRef.current.currentTime - currentTime);
      if (drift > 1.5) videoRef.current.currentTime = currentTime;

    } else if (type === 'youtube' && ytPlayerRef.current && ytPlayerRef.current.playVideo) {
      try {
        const state = ytPlayerRef.current.getPlayerState();
        if (playing && state !== 1) ytPlayerRef.current.playVideo();
        else if (!playing && state !== 2) ytPlayerRef.current.pauseVideo();

        const localTime = ytPlayerRef.current.getCurrentTime();
        if (Math.abs(localTime - currentTime) > 2.0) {
          ytPlayerRef.current.seekTo(currentTime, true);
        }
      } catch (e) {
        console.warn('YT Player not fully interactive yet');
      }
    }
  }, [playing, currentTime, isReady, type]);

  // --- 4. Controls (Skip/Seek) ---
  const skip = (seconds: number) => {
    let newTime = 0;
    if (type === 'file' && videoRef.current) {
      newTime = Math.max(0, videoRef.current.currentTime + seconds);
      videoRef.current.currentTime = newTime;
      onAction(playing, newTime);
    } else if (type === 'youtube' && ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
      newTime = Math.max(0, ytPlayerRef.current.getCurrentTime() + seconds);
      ytPlayerRef.current.seekTo(newTime, true);
      onAction(playing, newTime);
    }
  };

  return (
    <div className="w-full aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl relative border border-white/5 group">
      {type === 'file' ? (
        <video 
          ref={videoRef}
          src={url} 
          className="w-full h-full object-contain"
          onPlay={() => {
            if (Date.now() > blockBroadcastUntil.current) {
              onAction(true, videoRef.current?.currentTime || 0);
            }
          }}
          onPause={() => {
            if (Date.now() > blockBroadcastUntil.current) {
              onAction(false, videoRef.current?.currentTime || 0);
            }
          }}
        />
      ) : (
        <div className="w-full h-full">
          <div id="yt-player-target" className="w-full h-full" />
        </div>
      )}

      {/* Custom Sync Controls Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
        <button 
          onClick={() => skip(-10)}
          className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl hover:bg-blue-600 transition-all active:scale-90"
          title="Back 10s"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>

        <button 
          onClick={() => {
            const newPlaying = !playing;
            let time = 0;
            if (type === 'file') time = videoRef.current?.currentTime || 0;
            else if (type === 'youtube') time = ytPlayerRef.current?.getCurrentTime() || 0;
            onAction(newPlaying, time);
          }}
          className="bg-blue-600 border border-blue-400 p-4 rounded-3xl hover:bg-blue-500 transition-all active:scale-95 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
        >
          {playing ? (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <button 
          onClick={() => skip(10)}
          className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl hover:bg-blue-600 transition-all active:scale-90"
          title="Forward 10s"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" />
          </svg>
        </button>
      </div>

      {!isReady && type === 'youtube' && (
        <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Syncing Handshake...</p>
        </div>
      )}
    </div>
  );
}
