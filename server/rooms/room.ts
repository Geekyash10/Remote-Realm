import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { RoomModel } from "../models/roomModel";


class Player extends Schema {
    @type("string") sessionId: string;
    @type("string") name: string;
    @type("number") x: number = 705;
    @type("number") y: number = 500;
    @type("string") animation: string = "player_idle_down";
    @type("string") character: string;

    constructor(sessionId: string, name: string, character: string) {
        super();
        this.sessionId = sessionId;
        this.name = name;
        this.character = character;
    }
}

class RoomState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type("string") roomName: string;
    @type("string") roomDescription: string;
    @type("string") roomPassword: string;
    @type("boolean") isPrivate: boolean;

    constructor(roomName: string, roomDescription: string, roomPassword: string, isPrivate: boolean) {
        super();
        this.roomName = roomName;
        this.roomDescription = roomDescription;
        this.roomPassword = roomPassword;
        this.isPrivate = isPrivate;
    }
}

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

        // Initialize whiteboard
        

        // Handle player position updates
        this.onMessage("updatePlayer", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = message.x;
                player.y = message.y;
                player.animation = message.animation;
            }
        });

        this.onMessage("media-state-change", (client, message) => {
            const { videoEnabled, audioEnabled } = message;

            // Broadcast to all other clients
            this.broadcast(
                "media-state-change",
                {
                    peerId: client.sessionId,
                    videoEnabled,
                    audioEnabled,
                },
                { except: client }
            );
        });

        // Handle chat messages
        this.onMessage("chat", (client, message) => {
            this.broadcast("chat", {
                text: message.text,
                sender: client.sessionId,
                timestamp: new Date().toISOString()
            });
        });

        // Handle player movement broadcasts
        this.onMessage("playerMoved", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = message.x;
                player.y = message.y;
                player.animation = message.animation;
        
                // Broadcast movement to all clients except sender
                this.broadcast("playerMoved", {
                    sessionId: client.sessionId,
                    x: player.x,
                    y: player.y,
                    animation: player.animation
                }, { except: client });
            }
        });
        
        // Handle system messages
        this.onMessage("system", (client, message) => {
            this.broadcast("system", message);
        });

        // Handle player joined notifications
        this.onMessage("player-joined", (client, message) => {
            // Broadcast to all clients except the sender
            this.broadcast("player-joined", { id: client.sessionId }, { except: client });
        });

        // Handle WebRTC signaling
        this.onMessage("webrtc-signal", (client, message) => {
            const { to, signal } = message;
            
            if (!to || !signal) {
                console.warn("Invalid WebRTC signal message:", message);
                return;
            }

            // Forward the signal to the target client
            const targetClient = this.clients.find(c => c.sessionId === to);
            if (targetClient) {
                targetClient.send("webrtc-signal", { 
                    from: client.sessionId, 
                    signal 
                });
            } else {
                console.warn(`Target client ${to} not found for signal from ${client.sessionId}`);
            }
        });

        // Handle whiteboard updates
       
        // Handle whiteboard clear
       
        // Store private room in database
        if (isPrivate) {
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
        console.log("nfcndjnj",options);
        console.log(`Player ${options.playerName || "Guest"} joining with ID ${client.sessionId}`);

        console.log(this.state.isPrivate);
        console.log(options.isPrivate);
      

        const playerName = options.playerName || "Guest";

        // Check if the player already exists
        if (this.state.players.has(client.sessionId)) {
            console.warn(`Player with session ID ${client.sessionId} already exists`);
            return;
        }
        
        // Create new player
        const player = new Player(
            client.sessionId, 
            playerName || "Guest",
            options.character || 'adam'
        );

        // Set spawn position based on room type
        if (this.state.isPrivate) {
            player.x = 705 + (Math.random() * 100);
            player.y = 500 + (Math.random() * 100);
        } else {
            player.x = 705 + (Math.random() * 300) - 150;
            player.y = 500 + (Math.random() * 300) - 150;
        }
        
        // Add player to room state
        this.state.players.set(client.sessionId, player);

        // Notify existing clients about the new player
        this.broadcast("playerJoined", {
            sessionId: client.sessionId,
            name: playerName,
            character: player.character,
            x: player.x,
            y: player.y,
            animation: player.animation
        }, { except: client });

        // Send room info to new client
        client.send("roomInfo", {
            isPrivate: this.state.isPrivate,
            currentPlayers: this.clients.length
        });

        // Send current whiteboard state to the new client
     

        // Notify all clients to establish WebRTC connections
        this.broadcast("player-joined", { id: client.sessionId });

        // Update database for private rooms
        if (this.state.isPrivate) {
            try {
                await RoomModel.findOneAndUpdate(
                    { roomId: this.roomId },
                    { $push: { players: { sessionId: client.sessionId, name: player.name } } }
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

            // Notify all clients to remove the video element of the leaving player
            this.broadcast("removeVideo", { sessionId: client.sessionId });

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







