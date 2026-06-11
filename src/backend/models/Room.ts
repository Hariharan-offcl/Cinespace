import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IRoom extends Document {
  roomCode: string;
  videoUrl: string;
  videoType: 'YOUTUBE' | 'FILE';
  passcode?: string;
  playing: boolean;
  currentTime: number;
  createdAt: Date;
}

const RoomSchema = new Schema<IRoom>({
  roomCode: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  videoUrl: { 
    type: String, 
    required: true 
  },
  videoType: {
    type: String,
    enum: ['YOUTUBE', 'FILE'],
    required: true
  },
  passcode: { 
    type: String 
  },
  playing: { 
    type: Boolean, 
    default: false 
  },
  currentTime: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// The 'models.Room' check prevents Mongoose from trying to re-define the model 
// during Next.js hot-reloads.
const Room = models.Room || model<IRoom>('Room', RoomSchema);

export default Room;
