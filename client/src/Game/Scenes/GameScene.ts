import Phaser from "phaser";
import * as Colyseus from "colyseus.js";
import { WebRTCManager } from "../Utils/WebRTCManager";
// Import tile images
import Basement from "/Assets/Basement.png";
import ModernOffice from "/Assets/Modern_Office_Black_Shadow.png";
import Generic from "/Assets/Generic.png";
import Chair from "/Assets/chair.png";
import RoomBuilderWalls from "/Assets/Room_Builder_Walls.png";
import RoomBuilderOffice from "/Assets/Room_Builder_Office.png";
import RoomBuilderFloors from "/Assets/Room_Builder_Floors.png";
import ClassroomLibrary from "/Assets/Classroom_and_library.png";
import player_photo from "/Assets/character/adam.png";
import player_json from "/Assets/character/adam.json?url";
import { createCharacterAnims } from "../Character/CharacterAnims";
import "../Character/Char";
import joystick_base from "../../components/assets/ui/joystick-base.png";
import joystick_thumb from "../../components/assets/ui/joystick-thumb.png";
import { JoystickPlugin } from "../../components/JoystickPlugin";

// import Peer, { MediaConnection } from 'peerjs';

// Import map JSON
import clgMap from "/Assets/clgMap.json?url";
/**
 * GameScene class representing a Phaser scene for a multiplayer game.
 *
 * @class
 */

export class GameScene extends Phaser.Scene {
	private map!: Phaser.Tilemaps.Tilemap;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private player!: Phaser.Physics.Arcade.Sprite;
	private roomId?: string;
	private username?: string;
	private isPrivate?: boolean;
	private otherPlayers: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
	private currentRoom?: Colyseus.Room;
	private client?: Colyseus.Client;
	private listenersInitialized: boolean = false;
	private webRTCManager!: WebRTCManager;
	private shiftKey!: Phaser.Input.Keyboard.Key;
	private tKey!: Phaser.Input.Keyboard.Key;
	private taskManagerOpen: boolean = false;
	private joystick!: JoystickPlugin;

	constructor() {
		super("GameScene");
	}

	init(data: {
		roomId?: string;
		username?: string;
		room?: Colyseus.Room;
		isPrivate?: boolean;
	}) {
		console.log("GameScene init with data:", data);
		this.roomId = data.roomId;
		this.username = data.username;
		this.currentRoom = data.room;
		this.isPrivate = data.isPrivate;

		if (this.currentRoom) {
			this.webRTCManager = new WebRTCManager(
				this.currentRoom.sessionId,
				[
					{
						urls: "stun:stun.l.google.com:19302",
					},
					{
						urls: "stun:stun1.l.google.com:19302",
					},
					{
						urls: "stun:stun2.l.google.com:19302",
					},
				],
				this.currentRoom // Pass the room as the third parameter
			);
		}
		this.shiftKey = this.input.keyboard!.addKey(
			Phaser.Input.Keyboard.KeyCodes.SHIFT
		);
		this.tKey = this.input.keyboard!.addKey(
			Phaser.Input.Keyboard.KeyCodes.T
		);
		this.tKey.on("down", () => {
			// Toggle task manager state
			this.taskManagerOpen = !this.taskManagerOpen;

			// Emit a custom event that can be captured by React
			const evt = new CustomEvent("toggleTaskManager", {
				detail: { open: this.taskManagerOpen },
			});
			window.dispatchEvent(evt);
		});
	}

	async connectToRoom() {
		try {
			const client = new Colyseus.Client(
				"wss://remote-realm-server.onrender.com"
			);
			this.client = client;

			console.log(
				"Connecting to room with ID:",
				this.roomId,
				"and username:",
				this.username
			);

			if (this.currentRoom) {
				console.log(
					"Already connected to a room:",
					this.currentRoom.sessionId
				);
				this.setupRoomListeners(this.currentRoom);

				// Initialize WebRTCManager
				this.webRTCManager = new WebRTCManager(
					this.currentRoom.sessionId,
					[
						{
							urls: "stun:stun.l.google.com:19302",
						},
						{
							urls: "stun:stun1.l.google.com:19302",
						},
						{
							urls: "stun:stun2.l.google.com:19302",
						},
					]
				);
				await this.webRTCManager.initialize();
				await this.webRTCManager.setupLocalStream();

				return this.currentRoom;
			}

			let room: Colyseus.Room;
			if (this.isPrivate && this.roomId) {
				room = await client.joinById(this.roomId, {
					username: this.username,
				});
			} else {
				room = await client.joinOrCreate(this.roomId ?? "game", {
					username: this.username,
				});
			}

			this.currentRoom = room;
			this.setupRoomListeners(room);
			console.log(`Connected to room: ${room.sessionId}`);

			// Initialize WebRTCManager
			this.webRTCManager = new WebRTCManager(room.sessionId, [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun1.l.google.com:19302" },
				{ urls: "stun:stun2.l.google.com:19302" },
			]);
			await this.webRTCManager.initialize();
			await this.webRTCManager.setupLocalStream();

			return room;
		} catch (error) {
			console.error("Error connecting to room:", error);
			return null;
		}
	}

	setupRoomListeners(room: Colyseus.Room) {
		if (this.listenersInitialized) {
			console.warn("Listeners already initialized");
			return;
		}

		// When a new player joins
		room.state.players.onAdd((player: any, sessionId: string) => {
			console.log("Player joined:", sessionId, player);
			if (sessionId === room.sessionId) {
				// This is the local player, already created
				return;
			}

			// Check if the player already exists
			if (this.otherPlayers.has(sessionId)) {
				console.warn(
					`Player with session ID ${sessionId} already exists`
				);
				return;
			}

			// Create new player sprite for other players
			const otherPlayer = this.add.player(
				player.x || 705,
				player.y || 500,
				"player"
			);
			this.otherPlayers.set(sessionId, otherPlayer);

			// Listen for position updates
			player.onChange(() => {
				if (otherPlayer) {
					otherPlayer.setPosition(player.x, player.y);
					if (player.animation) {
						otherPlayer.play(player.animation, true);
					}
				}
			});

			// Delay peer connection attempt to allow the player to fully join
			setTimeout(() => {
				this.webRTCManager.initiatePeerConnection(sessionId);
			}, 2000);
		});

		// When a player leaves
		room.state.players.onRemove((player: any, sessionId: string) => {
			const otherPlayer = this.otherPlayers.get(sessionId);
			if (otherPlayer) {
				otherPlayer.destroy();
				this.otherPlayers.delete(sessionId);
			}
		});

		// Send local player position updates
		this.time.addEvent({
			delay: 33, // ~30fps
			callback: () => {
				if (this.player && room) {
					const currentAnimation =
						this.player.anims.currentAnim?.key ||
						"player_idle_down";
					room.send("updatePlayer", {
						x: this.player.x,
						y: this.player.y,
						animation: currentAnimation,
					});
				}
			},
			loop: true,
		});

		// Listen for player movement updates from server
		room.onMessage("playerMoved", (message) => {
			const otherPlayer = this.otherPlayers.get(message.sessionId);
			if (otherPlayer) {
				otherPlayer.setPosition(message.x, message.y);
				if (message.animation) {
					otherPlayer.play(message.animation, true);
				}
			}
		});

		// Listen for WebRTC signaling messages
		room.onMessage("webrtc-signal", (message) => {
			const { from, signal } = message;
			console.log(`Received signal from ${from}`);
		});

		// Listen for stopVideo messages
		room.onMessage("stopVideo", (message) => {
			const { sessionId } = message;
			console.log(`Stopping video for session ID: ${sessionId}`);
			if (this.webRTCManager) {
				this.webRTCManager.removeVideoElement(sessionId);
			}
		});

		// Listen for removeVideo messages
		room.onMessage("removeVideo", (message) => {
			const { sessionId } = message;
			console.log(`Removing video for session ID: ${sessionId}`);
			if (this.webRTCManager) {
				this.webRTCManager.removeVideoElement(sessionId);
			}
		});

		// Mark listeners as initialized
		this.listenersInitialized = true;
	}

	preload() {
		// Load the tilemap JSON
		this.load.tilemapTiledJSON("clgMap", clgMap);

		// Load tileset images
		this.load.image("basement", Basement);
		this.load.image("modern-office", ModernOffice);
		this.load.image("generic", Generic);
		this.load.image("chair", Chair);
		this.load.image("room-walls", RoomBuilderWalls);
		this.load.image("room-office", RoomBuilderOffice);
		this.load.image("room-floors", RoomBuilderFloors);
		this.load.image("classroom-library", ClassroomLibrary);
		this.load.atlas("player", player_photo, player_json);
		// add cursor command
		this.cursors = this.input.keyboard!.createCursorKeys();

		this.load.image("joystick-base", joystick_base);
		this.load.image("joystick-thumb", joystick_thumb);
		this.joystick = new JoystickPlugin(this, this.plugins);
	}

	async create() {
		await this.connectToRoom();
		createCharacterAnims(this.anims);
		this.createMap();
		this.joystick.createExternalJoystick();

		// Position the joystick at the bottom left of the window
		// The values represent the distance from left and bottom edges
		this.joystick.setPosition(1260, 40);

		// Handle window resize to reposition joystick
		// window.addEventListener("resize", () => {
		// 	this.joystick.setPosition(100, this.cameras.main.height - 100);
		// });
	}

	createMap() {
		// Create tilemap from JSON
		this.map = this.make.tilemap({ key: "clgMap" });

		// Add tilesets from JSON
		const basementTileset = this.map.addTilesetImage(
			"Basement",
			"basement"
		);
		const modernOfficeTileset = this.map.addTilesetImage(
			"Modern_Office_Black_Shadow",
			"modern-office"
		);
		const genericTileset = this.map.addTilesetImage("Generic", "generic");
		const chairTileset = this.map.addTilesetImage("chair", "chair");
		const wallsTileset = this.map.addTilesetImage(
			"Room_Builder_Walls",
			"room-walls"
		);
		const officeTileset = this.map.addTilesetImage(
			"Room_Builder_Office",
			"room-office"
		);
		const floorsTileset = this.map.addTilesetImage(
			"Room_Builder_Floors",
			"room-floors"
		);
		const classroomTileset = this.map.addTilesetImage(
			"Classroom_and_library",
			"classroom-library"
		);

		// Log layer names
		const layerNames = this.map.layers.map((layer) => layer.name);
		console.log(layerNames);

		const ground = [wallsTileset, officeTileset, floorsTileset].filter(
			(ts) => ts !== null
		);
		const obj = [
			basementTileset,
			modernOfficeTileset,
			genericTileset,
			chairTileset,
			classroomTileset,
		].filter((ts) => ts !== null);
		const groundLayer1 = this.map.createLayer("Floor", ground);
		const groundLayer2 = this.map.createLayer("Wall1", ground);
		const groundLayer3 = this.map.createLayer("Wall2", ground);

		const chairlayer = this.map.createLayer("Chair", obj);
		const computerlayer = this.map.createLayer("Comp", obj);
		const tablelayer = this.map.createLayer("Table", obj);

		if (groundLayer1)
			groundLayer1.setCollisionByProperty({ collides: true });
		if (groundLayer2)
			groundLayer2.setCollisionByProperty({ collides: true });
		if (groundLayer3)
			groundLayer3.setCollisionByProperty({ collides: true });
		if (chairlayer) chairlayer.setCollisionByProperty({ collides: true });
		if (tablelayer) tablelayer.setCollisionByProperty({ collides: true });
		if (computerlayer)
			computerlayer.setCollisionByProperty({
				collides: true,
			});
		this.player = this.add.player(705, 500, "player");

		// Set up camera
		this.cameras.main.zoom = 1.5;
		this.cameras.main.startFollow(this.player);

		// Add colliders
		if (groundLayer1) this.physics.add.collider(this.player, groundLayer1);
		if (groundLayer2) this.physics.add.collider(this.player, groundLayer2);
		if (groundLayer3) this.physics.add.collider(this.player, groundLayer3);
		if (tablelayer) this.physics.add.collider(this.player, tablelayer);
	}

	update(_t: number, _dt: number) {
		if (this.player) {
			// Pass both cursors and joystick to the player's update method
			this.player.update(this.cursors, this.joystick);
		}
	}
	shutdown() {
		if (this.webRTCManager) {
			this.webRTCManager.shutdown();
		}

		// Notify the server that the player is leaving
		if (this.currentRoom) {
			this.currentRoom.leave();
		}

		if (this.joystick) {
			this.joystick.shutdown();
		}
	}
}
