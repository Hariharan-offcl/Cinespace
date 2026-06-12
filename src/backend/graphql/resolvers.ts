import { supabaseAdmin } from '../config/supabase';

// Helper function to generate a unique 6-character room code
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const failedAttemptsTracker: Record<string, { count: number; lockoutUntil: number }> = {};

export const resolvers = {
  Query: {
    getRoom: async (_: any, { roomCode }: { roomCode: string }) => {
      try {
        const { data, error } = await supabaseAdmin
          .from('rooms')
          .select('*')
          .eq('room_code', roomCode)
          .single();

        if (error) return null;
        
        // Map snake_case from Postgres to camelCase for GraphQL
        return {
          ...data,
          roomCode: data.room_code,
          videoUrl: data.video_url,
          videoType: data.video_type,
          currentTime: data.current_time,
          createdAt: data.created_at
        };
      } catch (error) {
        throw new Error('Error fetching room');
      }
    },
  },
  Mutation: {
    createRoom: async (_: any, { title, videoUrl, passcode }: { title: string; videoUrl: string; passcode?: string }) => {
      try {
        let roomCode = generateRoomCode();
        
        // Simple Detection: Check if URL is from YouTube
        const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
        const videoType = isYouTube ? 'YOUTUBE' : 'FILE';

        const { data, error } = await supabaseAdmin
          .from('rooms')
          .insert([
            {
              title,
              room_code: roomCode,
              video_url: videoUrl,
              video_type: videoType,
              passcode,
              playing: false,
              playback_time: 0,
            }
          ])
          .select()
          .single();

        if (error) throw error;

        return {
          ...data,
          roomCode: data.room_code,
          videoUrl: data.video_url,
          videoType: data.video_type,
          currentTime: data.playback_time,
          createdAt: data.created_at
        };
      } catch (error) {
        console.error('Create Room Error:', error);
        throw new Error('Error creating room');
      }
    },
    joinRoom: async (_: any, { roomCode, passcode }: { roomCode: string; passcode?: string }, context: any) => {
      const userKey = context.userIp || "anonymous_user"; 
      const now = Date.now();

      if (failedAttemptsTracker[userKey] && failedAttemptsTracker[userKey].lockoutUntil > now) {
        const remainingTime = Math.ceil((failedAttemptsTracker[userKey].lockoutUntil - now) / 1000);
        throw new Error(`Too many incorrect attempts. Locked out for ${remainingTime}s.`);
      }

      try {
        const { data: room, error } = await supabaseAdmin
          .from('rooms')
          .select('*')
          .eq('room_code', roomCode)
          .single();

        if (error || !room) throw new Error('Room not found');

        if (room.passcode && room.passcode !== passcode) {
          if (!failedAttemptsTracker[userKey]) {
            failedAttemptsTracker[userKey] = { count: 1, lockoutUntil: 0 };
          } else {
            failedAttemptsTracker[userKey].count += 1;
          }

          if (failedAttemptsTracker[userKey].count >= 5) {
            failedAttemptsTracker[userKey].lockoutUntil = now + 60000;
            failedAttemptsTracker[userKey].count = 0;
            throw new Error('Too many incorrect attempts. Locked out for 1 minute.');
          }
          throw new Error('Invalid passcode');
        }

        if (failedAttemptsTracker[userKey]) delete failedAttemptsTracker[userKey];

        return {
          ...room,
          roomCode: room.room_code,
          videoUrl: room.video_url,
          videoType: room.video_type,
          currentTime: room.playback_time,
          createdAt: room.created_at
        };
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Error joining room');
      }
    },
  },
};
