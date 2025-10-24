import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
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
class Task extends Schema {
	@type("string") id: string;
	@type("string") text: string;
	@type("boolean") completed: boolean = false;
	@type("string") createdBy: string;
	@type("string") createdAt: string;

	constructor(id: string, text: string, createdBy: string) {
		super();
		this.id = id;
		this.text = text;
		this.createdBy = createdBy;
		this.createdAt = new Date().toISOString();
	}
}

class RoomState extends Schema {
	@type({ map: Player }) players = new MapSchema<Player>();
	@type("string") roomName: string;
	@type("string") roomDescription: string;
	@type("string") roomPassword: string;
	@type("boolean") isPrivate: boolean;
	@type("string") whiteboardId: string;
	@type([Task]) tasks = new ArraySchema<Task>();

	constructor(
		roomName: string,
		roomDescription: string,
		roomPassword: string,
		isPrivate: boolean
	) {
		super();
		this.roomName = roomName;
		this.roomDescription = roomDescription;
		this.roomPassword = roomPassword;
		this.isPrivate = isPrivate;
		this.whiteboardId = `virtual-office-${Date.now()}`;
	}
}

export class MyRoom extends Room<RoomState> {
	private whiteboardBaseUrl = process.env.WHITEBOARD_URL;

	private activeScreenSharePeerId: string | null = null;

	async onCreate(options: any) {
		// Set room type
		const isPrivate = options.isPrivate || false;

		// Set metadata to help with room filtering
		this.setMetadata({
			isPrivate,
			roomType: isPrivate ? "private" : "public",
		});

		this.setState(
			new RoomState(
				options.roomName || "Public Room",
				options.roomDescription || "",
				options.roomPassword || "",
				isPrivate
			)
		);

		// Initialize whiteboard

		try {
			const whiteboardId = `virtual-office-${this.roomId}`;
			await this.initializeWhiteboard(whiteboardId, isPrivate);
			this.state.whiteboardId = whiteboardId;
		} catch (error) {
			console.error("Error initializing whiteboard:", error);
		}

		// Add whiteboard message handlers
		this.onMessage("whiteboard-access", (client, message) => {
			// Send whiteboard access info to the client
			client.send("whiteboard-info", {
				whiteboardId: this.state.whiteboardId,
				isPrivate: this.state.isPrivate,
				// baseUrl: "https://remote-realm.onrender.com/boards/",
				baseUrl: `${this.whiteboardBaseUrl}/boards/`,
			});
		});

		this.onMessage("whiteboard-sync", (client) => {
			client.send("whiteboard-info", {
				whiteboardId: this.state.whiteboardId,
				isPrivate: this.state.isPrivate,
				baseUrl: `${this.whiteboardBaseUrl}/boards/`,
			});
		});

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
				// send the username
				sender:
					this.state.players.get(client.sessionId)?.name || "Guest",
				timestamp: new Date().toISOString(),
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
				this.broadcast(
					"playerMoved",
					{
						sessionId: client.sessionId,
						x: player.x,
						y: player.y,
						animation: player.animation,
					},
					{ except: client }
				);
			}
		});

		// Handle system messages
		this.onMessage("system", (client, message) => {
			this.broadcast("system", message);
		});

		// Handle player joined notifications

		// Handle WebRTC signaling
		this.onMessage("webrtc-signal", (client, message) => {
			const { to, signal } = message;

			if (!to || !signal) {
				console.warn("Invalid WebRTC signal message:", message);
				return;
			}

			// Forward the signal to the target client
			const targetClient = this.clients.find((c) => c.sessionId === to);
			if (targetClient) {
				targetClient.send("webrtc-signal", {
					from: client.sessionId,
					signal,
				});
			} else {
				console.warn(
					`Target client ${to} not found for signal from ${client.sessionId}`
				);
			}
		});

		this.onMessage("get-tasks", (client) => {
			// Send current tasks to the client
			client.send("task-update", Array.from(this.state.tasks));
		});

		// Add these handlers to your MyRoom class within onCreate

		// Update add-task handler
		this.onMessage("add-task", (client, message) => {
			// Create new task with unique ID
			const taskId = `task_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;
			const task = new Task(taskId, message.text, message.createdBy);
			this.state.tasks.push(task);

			// Broadcast task update to all clients
			this.broadcast("task-update", Array.from(this.state.tasks));

			// Send notification about the new task
			this.broadcast("task-notification", {
				task: {
					id: task.id,
					text: task.text,
					completed: task.completed,
					createdBy: task.createdBy,
					createdAt: task.createdAt,
				},
				action: "add",
			});
		});

		// Update toggle-task handler
		this.onMessage("toggle-task", (client, message) => {
			const { taskId } = message;
			const taskIndex = this.state.tasks.findIndex(
				(task) => task.id === taskId
			);

			if (taskIndex !== -1) {
				// Toggle the completed state
				if (this.state.tasks[taskIndex]) {
					this.state.tasks[taskIndex].completed =
						!this.state.tasks[taskIndex].completed;
				}

				// Get the player name from the client session id
				const player = this.state.players.get(client.sessionId);
				if (player) {
					// Send notification if task is marked as complete
					if (this.state.tasks[taskIndex]?.completed) {
						this.broadcast("task-notification", {
							task: {
								id: this.state.tasks[taskIndex].id,
								text: this.state.tasks[taskIndex]?.text || "",
								completed:
									this.state.tasks[taskIndex].completed,
								createdBy:
									this.state.tasks[taskIndex].createdBy,
								createdAt:
									this.state.tasks[taskIndex].createdAt,
							},
							action: "complete",
						});
					}
				}

				// Broadcast task update to all clients
				this.broadcast("task-update", Array.from(this.state.tasks));
			}
		});

		// Update delete-task handler
		this.onMessage("delete-task", (client, message) => {
			const { taskId } = message;
			const taskIndex = this.state.tasks.findIndex(
				(task) => task.id === taskId
			);

			if (taskIndex !== -1) {
				// Get task before removing
				const deletedTask = this.state.tasks[taskIndex];

				// Get the player name from the client session id
				const player = this.state.players.get(client.sessionId);
				if (player) {
					// Send notification about the task deletion
					this.broadcast("task-notification", {
						task: {
							id: deletedTask?.id,
							text: deletedTask?.text || "",
							completed: deletedTask?.completed,
							createdBy: deletedTask?.createdBy,
							createdAt: deletedTask?.createdAt,
						},
						action: "delete",
					});
				}

				// Remove the task
				this.state.tasks.splice(taskIndex, 1);

				// Broadcast task update to all clients
				this.broadcast("task-update", Array.from(this.state.tasks));
			}
		});

		// Add these inside the onCreate method in MyRoom class
		this.onMessage("get-screen-share-status", (client) => {
			// Send current screen share status to the requesting client
			client.send("screen-share-status", {
				activePeerId: this.activeScreenSharePeerId,
			});
		});

		// Update existing screen share handlers to track status
		this.onMessage("screen-share-started", (client, message) => {
			const { peerId } = message;

			// Track who is currently sharing
			this.activeScreenSharePeerId = peerId;

			// Broadcast to all clients except the sender
			this.broadcast(
				"screen-share-started",
				{
					peerId: client.sessionId,
				},
				{ except: client }
			);
		});

		this.onMessage("screen-share-stopped", (client, message) => {
			const { peerId } = message;

			// Clear tracking if this is the active sharer
			if (this.activeScreenSharePeerId === peerId) {
				this.activeScreenSharePeerId = null;
			}

			// Broadcast to all clients except the sender
			this.broadcast(
				"screen-share-stopped",
				{
					peerId: client.sessionId,
				},
				{ except: client }
			);
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
					players: [],
				}).save();
			} catch (error) {
				console.error("Error saving room:", error);
				throw error;
			}
		}
	}
	private async initializeWhiteboard(
		whiteboardId: string,
		isPrivate: boolean
	) {
		try {
			// If your WBO instance provides an API, you can use it to create a board
			// This is a placeholder - adjust based on your WBO API
			/*
            const response = await axios.post(`${this.whiteboardBaseUrl}/create`, {
                id: whiteboardId,
                name: `Whiteboard for room ${this.roomId}`,
                public: !isPrivate
            });
            
            if (response.status !== 200) {
                throw new Error('Failed to create whiteboard');
            }
            */

			// If WBO doesn't have an API for creating boards, boards will be created
			// automatically when they're first accessed via the iframe
			console.log(`Whiteboard initialized with ID: ${whiteboardId}`);
			return true;
		} catch (error) {
			console.error("Error creating whiteboard:", error);
			throw error;
		}
	}

	async onJoin(client: Client, options: any) {
		console.log("nfcndjnj", options);
		console.log(
			`Player ${options.playerName || "Guest"} joining with ID ${
				client.sessionId
			}`
		);

		console.log(this.state.isPrivate);
		console.log(options.isPrivate);

		const playerName = options.playerName || "Guest";

		// Check if the player already exists
		if (this.state.players.has(client.sessionId)) {
			console.warn(
				`Player with session ID ${client.sessionId} already exists`
			);
			return;
		}

		// Create new player
		const player = new Player(
			client.sessionId,
			playerName || "Guest",
			options.character || "adam"
		);

		// Set spawn position based on room type
		if (this.state.isPrivate) {
			player.x = 705 + Math.random() * 100;
			player.y = 500 + Math.random() * 100;
		} else {
			player.x = 705 + Math.random() * 300 - 150;
			player.y = 500 + Math.random() * 300 - 150;
		}

		// Add player to room state
		this.state.players.set(client.sessionId, player);

		// Notify existing clients about the new player
		this.broadcast(
			"playerJoined",
			{
				sessionId: client.sessionId,
				name: playerName,
				character: player.character,
				x: player.x,
				y: player.y,
				animation: player.animation,
			},
			{ except: client }
		);

		// Send room info to new client
		client.send("roomInfo", {
			isPrivate: this.state.isPrivate,
			currentPlayers: this.clients.length,
		});

		// Send current whiteboard state to the new client

		// Notify all clients to establish WebRTC connections

		// Update database for private rooms
		if (this.state.isPrivate) {
			try {
				await RoomModel.findOneAndUpdate(
					{ roomId: this.roomId },
					{
						$push: {
							players: {
								sessionId: client.sessionId,
								name: player.name,
							},
						},
					}
				);
			} catch (error) {
				console.error("Error updating room model:", error);
			}
		}

		client.send("whiteboard-info", {
			whiteboardId: this.state.whiteboardId,
			isPrivate: this.state.isPrivate,
			baseUrl: "https://remote-realm.onrender.com/boards/",
		});
	}

	async onLeave(client: Client) {
		const player = this.state.players.get(client.sessionId);

		if (player) {
			this.state.players.delete(client.sessionId);

			this.broadcast("playerLeft", {
				sessionId: client.sessionId,
				name: player.name,
			});

			// Notify all clients to remove the video element of the leaving player
			this.broadcast("removeVideo", { sessionId: client.sessionId });

			this.broadcast("update", {
				players: Array.from(this.state.players.values()).map((p) => ({
					sessionId: p.sessionId,
					name: p.name,
					x: p.x,
					y: p.y,
					animation: p.animation,
					character: p.character,
				})),
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

		console.log(
			`Player ${client.sessionId} has left the room ${this.roomId}`
		);

		if (this.state.players.size === 0) {
			this.disconnect();
		}
	}

	async onDispose() {
		if (this.state.isPrivate) {
			try {
				await RoomModel.findOneAndDelete({ roomId: this.roomId });
				console.log(
					`Room ${this.roomId} cleaned up from database during disposal`
				);
			} catch (error) {
				console.error("Error during room disposal cleanup:", error);
			}
		}
		console.log(`Room ${this.roomId} disposed!`);
	}
}
