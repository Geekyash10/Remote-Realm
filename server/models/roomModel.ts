import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },  // Ensure roomId is stored
    roomName: { type: String, required: true },
    roomDescription: { type: String },
    roomPassword: { type: String },
    isPrivate: { type: Boolean, required: true },
    players: [{ sessionId: String, name: String }]  // Storing players
}, { timestamps: true });

export const RoomModel = mongoose.model('Room', RoomSchema);
