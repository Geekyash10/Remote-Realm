import { Room, Client } from "colyseus"; // Import the Room and Client classes from the colyseus package
import { Schema, type, ArraySchema } from "@colyseus/schema"; // Import the Schema, type, and ArraySchema classes from the @colyseus/schema package
import { RoomModel } from "../models/roomModel";


class Player extends Schema {
    @type("string") sessionId: string; // Define a sessionId property of type string
    @type("string") name: string; // Define a name property of type string

    constructor(sessionId: string, name: string) {
        super();
        this.sessionId = sessionId;
        this.name = name;
    } // Define a constructor that takes a sessionId and name as arguments and assigns them to the sessionId and name properties
}

class RoomState extends Schema {
    @type([Player]) players: ArraySchema<Player>;
    @type("string") roomName: string;
    @type("string") roomDescription: string;
    @type("string") roomPassword: string; // optional
    @type("boolean") isPrivate: boolean;

    constructor(roomName: string, roomDescription: string, roomPassword: string, isPrivate: boolean) {
        super();
        this.players = new ArraySchema<Player>();
        this.roomName = roomName;
        this.roomDescription = roomDescription;
        this.roomPassword = roomPassword; // optional
        this.isPrivate = isPrivate;
        
    }

} // Define a RoomState class that extends Schema and has a players property of type ArraySchema<Player>

// In MyRoom.ts
export class MyRoom extends Room<RoomState> {
    async onCreate(options: {
        roomName: string;
        roomDescription: string;
        roomPassword: string;
        isPrivate: boolean;
    }) {
        const isPrivate = options.isPrivate;
        
        // if room is private, save it to the database
        if (isPrivate) {
            try {
                // Wait for the room to be saved before allowing joins
                await new RoomModel({
                    roomId: this.roomId,
                    roomName: options.roomName,
                    roomDescription: options.roomDescription,
                    roomPassword: options.roomPassword,
                    isPrivate: isPrivate,
                    players: []
                }).save();
                
                console.log("Room saved to the database!");
            } catch (error) {
                console.error("Error saving room:", error);
                throw error;
            }
        }

        this.setState(new RoomState(
            options.roomName,
            options.roomDescription,
            options.roomPassword,
            isPrivate
        ));

        this.onMessage("chat", (_client, message) => {
            this.broadcast("chat", {
                text: message.text,
                sender: message.sender,
                timestamp: new Date().toISOString()
            });
        });
    
        console.log(`${isPrivate ? 'Private' : 'Public'} Room created! Room ID: ${this.roomId}`);
    }

    private broadcastPlayerUpdate() {
        const playerNames = Array.from(this.state.players).map(p => p?.name ?? 'Unknown');
        console.log("Broadcasting players update:", playerNames); // Add this
        this.broadcast("update", {
            players: playerNames
        });
    }

    async onJoin(client: Client, options: { 
        playerName: string, 
        roomId?: string,
        roomPassword?: string 
    }) {
        console.log(`Joining room ID: ${this.roomId}, Player: ${options.playerName}`);

        // if room is private, check the password
        if (this.state.isPrivate) {
            try {
                // Add a small delay to ensure the database operation is complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const room = await RoomModel.findOne({ roomId: this.roomId });
                
                if (!room) {
                    console.log(`No room found with ID: ${this.roomId}`);
                    throw new Error("Room not found");
                }

                console.log(`Room found: ${room.roomName}, Verifying password...`);

                if (room.roomPassword !== options.roomPassword) {
                    throw new Error("Incorrect room password");
                }

                const updatedRoom = await RoomModel.findOneAndUpdate(
                    { roomId: this.roomId },
                    { $push: { players: { sessionId: client.sessionId, name: options.playerName } } },
                    { new: true }
                );

                if (!updatedRoom) {
                    throw new Error("Failed to update player list");
                }

                const newPlayer = new Player(client.sessionId, options.playerName);
                this.state.players.push(newPlayer);
                this.broadcast("system", {
                    text: `${options.playerName} has joined the room`,
                    type: "system",
                });
                  this.broadcastPlayerUpdate();

                console.log(`Player ${options.playerName} joined private room ${this.roomId}!`);
            } catch (error) {
                console.error("Join room error:", error);
                throw error;
            }
        } else {
            // For public rooms
            const newPlayer = new Player(client.sessionId, options.playerName);
            this.state.players.push(newPlayer);
            this.broadcast("system", {
                text: `${options.playerName} has joined the room`,
                type: "system",
            });
            this.broadcastPlayerUpdate();
            console.log(`Player ${options.playerName} joined public room ${this.roomId}!`);
        }

        // this.broadcast("system", {
        //     text: `${options.playerName} joined the room`,
        //     type: "system",
        // });
    }

    onLeave(client: Client) {
        const leavingPlayer = this.state.players.find(p => p.sessionId === client.sessionId);
        
        this.state.players = new ArraySchema<Player>(
            ...this.state.players.filter(player => player.sessionId !== client.sessionId)
        );

       

        // if room is private, remove the player from the database
        if (this.state.isPrivate) {
            RoomModel.findOneAndUpdate
            (
                { roomName: this.state.roomName },
                { $pull: { players: { sessionId: client.sessionId } } },
                { new: true }
            ).then(() => {
                console.log("Player removed from the database!");
            });
        }
        if(leavingPlayer)
            this.broadcast("system", {
                text: `${leavingPlayer?.name} has left the room`,
                type: "system",
            });
        this.broadcastPlayerUpdate();
        console.log(`Player ${leavingPlayer?.name || client.sessionId} left the room!`);

        // Auto-dispose if no players remain
        if (this.state.players.length === 0) {
            console.log(`Room ${this.roomId} is empty - disposing...`);
            this.disconnect();
        }
        
    }

    async onDispose() {
        if (this.state.isPrivate) {
            try {
                // Double-check to ensure room is removed from database
                await RoomModel.findOneAndDelete({ roomId: this.roomId });
                console.log(`Room ${this.roomId} cleaned up from database during disposal`);
            } catch (error) {
                console.error("Error during room disposal cleanup:", error);
            }
        }
        console.log(`Room ${this.roomId} disposed!`);
    }
    
}







