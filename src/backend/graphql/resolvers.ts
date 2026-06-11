import Room from '../models/Room';

// Helper function to generate a unique 6-character room code
const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// A local memory dictionary to track bad login attempts per user
// Note: In production, this would reset if the server restarts.
const failedAttemptsTracker: Record<string, { count: number; lockoutUntil: number }> = {};

export const resolvers = {
  Query: {
    getRoom: async (_: any, { roomCode }: { roomCode: string }) => {
      try {
        return await Room.findOne({ roomCode });
      } catch (error) {
        throw new Error('Error fetching room');
      }
    },
  },
  Mutation: {
    createRoom: async (_: any, { videoUrl, passcode }: { videoUrl: string; passcode?: string }) => {
      try {
        let roomCode = generateRoomCode();
        
        // Ensure roomCode is unique
        let existingRoom = await Room.findOne({ roomCode });
        while (existingRoom) {
          roomCode = generateRoomCode();
          existingRoom = await Room.findOne({ roomCode });
        }

        const newRoom = new Room({
          roomCode,
          videoUrl,
          passcode,
          playing: false,
          currentTime: 0,
        });

        await newRoom.save();
        return newRoom;
      } catch (error) {
        throw new Error('Error creating room');
      }
    },
    joinRoom: async (_: any, { roomCode, passcode }: { roomCode: string; passcode?: string }, context: any) => {
      // Use userIp from context or fallback to a generic identifier
      const userKey = context.userIp || "anonymous_user"; 
      const now = Date.now();

      // 1. Check if the user is currently locked out
      if (failedAttemptsTracker[userKey] && failedAttemptsTracker[userKey].lockoutUntil > now) {
        const remainingTime = Math.ceil((failedAttemptsTracker[userKey].lockoutUntil - now) / 1000);
        throw new Error(`Too many incorrect attempts. You are locked out. Try again in ${remainingTime} seconds.`);
      }

      try {
        const room = await Room.findOne({ roomCode });
        if (!room) {
          throw new Error('Room not found');
        }

        // 2. If the room has a passcode, verify it
        if (room.passcode) {
          if (room.passcode !== passcode) {
            // Initialize or increment failed attempts count
            if (!failedAttemptsTracker[userKey]) {
              failedAttemptsTracker[userKey] = { count: 1, lockoutUntil: 0 };
            } else {
              failedAttemptsTracker[userKey].count += 1;
            }

            // If they fail 5 times in a row, lock them out for 60 seconds
            if (failedAttemptsTracker[userKey].count >= 5) {
              failedAttemptsTracker[userKey].lockoutUntil = now + 60000; // 60,000 ms = 1 minute
              failedAttemptsTracker[userKey].count = 0; // Reset counter for after the lockout expires
              throw new Error('Too many incorrect attempts. You are locked out for 1 minute.');
            }

            throw new Error('Invalid passcode');
          }
        }

        // 3. Success! Clear their failed history
        if (failedAttemptsTracker[userKey]) {
          delete failedAttemptsTracker[userKey];
        }

        return room;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Error joining room');
      }
    },
  },
};
