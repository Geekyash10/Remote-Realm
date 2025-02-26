import { Room, Client } from "colyseus"; // Import the Room and Client classes from the colyseus package
import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema"; // Import the Schema, type, and ArraySchema classes from the @colyseus/schema package
import { RoomModel } from "../models/roomModel";


class Player extends Schema {
    @type("string") sessionId: string; // Define a sessionId property of type string
    @type("string") name: string; // Define a name property of type string
    @type("number") x: number = 705;
    @type("number") y: number = 500;
    @type("string") animation: string = "player_idle_down";
    @type("string") character: string; // Add character property

    constructor(sessionId: string, name: string, character: string) {
        super();
        this.sessionId = sessionId;
        this.name = name;
        this.character = character;
    } // Define a constructor that takes a sessionId and name as arguments and assigns them to the sessionId and name properties
}

class RoomState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type("string") roomName: string;
    @type("string") roomDescription: string;
    @type("string") roomPassword: string; // optional
    @type("boolean") isPrivate: boolean;

    constructor(roomName: string, roomDescription: string, roomPassword: string, isPrivate: boolean) {
        super();
        this.roomName = roomName;
        this.roomDescription = roomDescription;
        this.roomPassword = roomPassword; // optional
        this.isPrivate = isPrivate;
        
    }

} // Define a RoomState class that extends Schema and has a players property of type ArraySchema<Player>

// In MyRoom.ts
export class MyRoom extends Room<RoomState> {
    async onCreate(options: any) {
        // Set room type
        const isPrivate = options.isPrivate || false;

        // Set metadata to help with room filtering
        this.setMetadata({
            isPrivate,
            roomType: isPrivate ? 'private' : 'public'
        });

        this.setState(new RoomState(
            options.roomName || "Public Room",
            options.roomDescription || "",
            options.roomPassword || "",
            isPrivate
        ));

        // Handle player position updates with improved performance
        this.onMessage("updatePlayer", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = message.x;
                player.y = message.y;
                player.animation = message.animation;
                
                // Broadcast position update to all clients except sender
                // this.broadcast("playerMoved", {
                //     sessionId: client.sessionId,
                //     x: message.x,
                //     y: message.y,
                //     animation: message.animation
                // }, { except: client });
            }
        });

        // Handle chat messages
        this.onMessage("chat", (client, message) => {
            this.broadcast("chat", {
                text: message.text,
                sender: client.sessionId,
                timestamp: new Date().toISOString()
            });
        });

        this.onMessage("chat", (client, message) => {
            this.broadcast("chat", message);
        });
        this.onMessage("playerMoved", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = message.x;
                player.y = message.y;
                player.animation = message.animation;
        
                // Now broadcast the movement update to all clients
                this.broadcast("playerMoved", {
                    sessionId: client.sessionId,
                    x: player.x,
                    y: player.y,
                    animation: player.animation
                }, { except: client });
            }
        });
        

        this.onMessage("system", (client, message) => {
            this.broadcast("system", message);
        });

        if (options.isPrivate) {
            try {
                await new RoomModel({
                    roomId: this.roomId,
                    roomName: options.roomName,
                    roomDescription: options.roomDescription,
                    roomPassword: options.roomPassword,
                    isPrivate: true,
                    players: []
                }).save();
            } catch (error) {
                console.error("Error saving room:", error);
                throw error;
            }
        }
    }

    async onJoin(client: Client, options: any) {
        // Validate room access

        console.log(this.state.isPrivate);
        console.log(options.isPrivate);
      

        const playerName = options.playerName || "Guest"; // Ensure playerName is provided

        console.log(`Player ${playerName} joining with ID ${client.sessionId}`);

        // Check if the player already exists in the state
        if (this.state.players.has(client.sessionId)) {
            console.warn(`Player with session ID ${client.sessionId} already exists`);
            return;
        }

        // Create new player with position based on room type
        const player = new Player(
            client.sessionId, 
            playerName,
            options.character || 'adam'
        );

        // Different spawn areas for public and private rooms
        if (this.state.isPrivate) {
            // Private room spawn area
            player.x = 705 + (Math.random() * 100);
            player.y = 500 + (Math.random() * 100);
        } else {
            // Public room spawn area - wider area
            player.x = 705 + (Math.random() * 300) - 150;
            player.y = 500 + (Math.random() * 300) - 150;
        }
        
        this.state.players.set(client.sessionId, player);

        // Notify other clients
        this.broadcast("playerJoined", {
            sessionId: client.sessionId,
            name: playerName,
            character: options.character || 'adam',
            x: player.x,
            y: player.y,
            animation: player.animation
        }, { except: client });

        // Send room info to the joining client
        client.send("roomInfo", {
            isPrivate: this.state.isPrivate,
            currentPlayers: this.clients.length
        });

        // Update the room model in the database
        if (this.state.isPrivate) {
            try {
                await RoomModel.findOneAndUpdate(
                    { roomId: this.roomId },
                    { $push: { players: { sessionId: client.sessionId, name: playerName } } }
                );
            } catch (error) {
                console.error("Error updating room model:", error);
            }
        }
    }

    async onLeave(client: Client) {
        const player = this.state.players.get(client.sessionId);
        
        if (player) {
            this.state.players.delete(client.sessionId);

            this.broadcast("playerLeft", {
                sessionId: client.sessionId,
                name: player.name
            });

            this.broadcast("update", {
                players: Array.from(this.state.players.values()).map(p => ({
                    sessionId: p.sessionId,
                    name: p.name,
                    x: p.x,
                    y: p.y,
                    animation: p.animation,
                    character: p.character
                }))
            });

            // Update the room model in the database
            if (this.state.isPrivate) {
                try {
                    await RoomModel.findOneAndUpdate(
                        { roomId: this.roomId },
                        { $pull: { players: { sessionId: client.sessionId } } }
                    );
                } catch (error) {
                    console.error("Error updating room model:", error);
                }
            }
        }

        console.log(`Player ${client.sessionId} has left the room ${this.roomId}`);

        if (this.state.players.size === 0) {
            this.disconnect();
        }
    }

    async onDispose() {
        if (this.state.isPrivate) {
            try {
                await RoomModel.findOneAndDelete({ roomId: this.roomId });
                console.log(`Room ${this.roomId} cleaned up from database during disposal`);
            } catch (error) {
                console.error("Error during room disposal cleanup:", error);
            }
        }
        console.log(`Room ${this.roomId} disposed!`);
    }
}







