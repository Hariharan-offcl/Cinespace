'use client';

import React, { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  url: string;
  type: 'file' | 'youtube';
  onAction?: (action: 'PLAY' | 'PAUSE' | 'SEEK', time: number) => void;
  remoteAction?: { action: 'PLAY' | 'PAUSE' | 'SEEK'; time: number; timestamp: number } | null;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function VideoPlayer({ url, type, onAction, remoteAction }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const [isYtReady, setIsYtReady] = useState(false);

  // --- Remote Sync Handling ---
  useEffect(() => {
    if (!remoteAction) return;

    const { action, time, timestamp } = remoteAction;
    
    // Calculate network latency (simplified timestamp delta)
    const latency = (Date.now() - timestamp) / 1000;
    
    // Adjust time only if playing to account for trip duration
    const adjustedTime = action === 'PLAY' || action === 'SEEK' ? time + latency : time;

    if (type === 'file' && videoRef.current) {
      const drift = Math.abs(videoRef.current.currentTime - adjustedTime);
      
      if (action === 'PLAY') videoRef.current.play();
      if (action === 'PAUSE') videoRef.current.pause();
      
      // Only seek if drift > 1.0s or it's a manual SEEK command
      if (action === 'SEEK' || drift > 1.0) {
        videoRef.current.currentTime = adjustedTime;
      }
    } else if (type === 'youtube' && ytPlayerRef.current && isYtReady) {
      const currentTime = ytPlayerRef.current.getCurrentTime();
      const drift = Math.abs(currentTime - adjustedTime);

      if (action === 'PLAY') ytPlayerRef.current.playVideo();
      if (action === 'PAUSE') ytPlayerRef.current.pauseVideo();

      if (action === 'SEEK' || drift > 1.0) {
        ytPlayerRef.current.seekTo(adjustedTime, true);
      }
    }
  }, [remoteAction, type, isYtReady]);

  // --- Native Video Logic ---
  const handleNativePlay = () => {
    // Prevent feedback loop: only emit if not a remote action
    if (onAction && videoRef.current) onAction('PLAY', videoRef.current.currentTime);
  };

  const handleNativePause = () => {
    if (onAction && videoRef.current) onAction('PAUSE', videoRef.current.currentTime);
  };

  const handleNativeSeek = () => {
    if (onAction && videoRef.current) onAction('SEEK', videoRef.current.currentTime);
  };

  // --- YouTube Logic ---
  useEffect(() => {
    if (type !== 'youtube') return;

    // Load YT API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initYoutubePlayer();
      };
    } else {
      initYoutubePlayer();
    }

    function initYoutubePlayer() {
      const videoId = extractYoutubeId(url);
      ytPlayerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => setIsYtReady(true),
          onStateChange: (event: any) => {
            // 1 = playing, 2 = paused
            const time = ytPlayerRef.current.getCurrentTime();
            if (event.data === window.YT.PlayerState.PLAYING) {
              onAction?.('PLAY', time);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              onAction?.('PAUSE', time);
            }
          },
        },
      });
    }

    return () => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
      }
    };
  }, [type, url]);

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative">
      {type === 'file' ? (
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full"
          controls
          onPlay={handleNativePlay}
          onPause={handleNativePause}
          onSeeked={handleNativeSeek}
        />
      ) : (
        <div id="youtube-player" className="w-full h-full" />
      )}
      
      {!isYtReady && type === 'youtube' && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}
