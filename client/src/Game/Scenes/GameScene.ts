import Phaser from "phaser";
import * as Colyseus from "colyseus.js";

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

// Import map JSON
import mapSmall from "/Assets/mapSmall.json?url";

export class GameScene extends Phaser.Scene {
	private map!: Phaser.Tilemaps.Tilemap;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private player!: Phaser.Physics.Arcade.Sprite;
	private playerDirection!: string;
	private client!: Colyseus.Client;
	private roomId?: string;
	private username?: string;
	private isPrivate?: boolean; // Add isPrivate property
	private otherPlayers: Map<string, Phaser.Physics.Arcade.Sprite> =
		new Map();
	private currentRoom?: Colyseus.Room;
	private listenersInitialized: boolean = false;

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
		this.currentRoom = data.room; // Set the room object
		this.isPrivate = data.isPrivate; // Set the isPrivate property
	}

	async connectToRoom() {
		try {
			const client = new Colyseus.Client(
				"ws://192.168.89.157:3000"
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
				// Don't return here, just setup listeners if not already set up
				this.setupRoomListeners(this.currentRoom);
				return this.currentRoom;
			}

			let room: Colyseus.Room;
			if (this.isPrivate && this.roomId) {
				room = await client.joinById(this.roomId, {
					username: this.username,
				});
			} else {
				console.log(this.roomId);
				room = await client.joinOrCreate(
					this.roomId ?? "game",
					{ username: this.username }
				);
			}

			this.currentRoom = room;
			this.setupRoomListeners(room);
			console.log(`Connected to room:`, room.sessionId);
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
					otherPlayer.setPosition(
						player.x,
						player.y
					);
					if (player.animation) {
						otherPlayer.play(
							player.animation,
							true
						);
					}
				}
			});
		});

		// When a player leaves
		room.state.players.onRemove(
			(player: any, sessionId: string) => {
				const otherPlayer =
					this.otherPlayers.get(sessionId);
				if (otherPlayer) {
					otherPlayer.destroy();
					this.otherPlayers.delete(sessionId);
				}
			}
		);

		// Send local player position updates more frequently
		this.time.addEvent({
			delay: 33, // Increase update frequency to ~30fps
			callback: () => {
				if (this.player && room) {
					const currentAnimation =
						this.player.anims.currentAnim
							?.key ||
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
			const otherPlayer = this.otherPlayers.get(
				message.sessionId
			);
			if (otherPlayer) {
				otherPlayer.setPosition(message.x, message.y);
				if (message.animation) {
					otherPlayer.play(
						message.animation,
						true
					);
				}
			}
		});

		this.listenersInitialized = true;
	}

	preload() {
		// Load the tilemap JSON
		this.load.tilemapTiledJSON("mapSmall", mapSmall);

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
	}

	async create() {
		await this.connectToRoom();
		createCharacterAnims(this.anims);
		this.createMap();
	}

	createMap() {
		// Create tilemap from JSON
		this.map = this.make.tilemap({ key: "mapSmall" });

		// Add tilesets from JSON
		const basementTileset = this.map.addTilesetImage(
			"Basement",
			"basement"
		);
		const modernOfficeTileset = this.map.addTilesetImage(
			"Modern_Office_Black_Shadow",
			"modern-office"
		);
		const genericTileset = this.map.addTilesetImage(
			"Generic",
			"generic"
		);
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

		// Add all tilesets to an array
		// console.log(this.map)

		const layerNames = this.map.layers.map((layer) => layer.name);
		console.log(layerNames);

		const ground = [
			wallsTileset,
			officeTileset,
			floorsTileset,
		].filter((ts) => ts !== null);
		const obj = [
			basementTileset,
			modernOfficeTileset,
			genericTileset,
			chairTileset,
			classroomTileset,
		].filter((ts) => ts !== null);
		const groundLayer1 = this.map.createLayer("Floor", ground);
		const groundLayer2 = this.map.createLayer("walls", ground);
		const groundLayer3 = this.map.createLayer("walls2", ground);
		this.map.createLayer("chairs", obj);
		this.map.createLayer("tables", obj);
		// console.log(groundLayer)

		// console.log(groundLayer1);
		// console.log(groundLayer2);
		// console.log(groundLayer3);

		if (groundLayer1)
			groundLayer1.setCollisionByProperty({ collides: true });
		if (groundLayer2)
			groundLayer2.setCollisionByProperty({ collides: true });
		if (groundLayer3)
			groundLayer3.setCollisionByProperty({ collides: true });
		// console.log(groundLayer)
		// console.log(groundLayer1);
		// console.log(groundLayer2);
		// console.log(groundLayer3);

		const debugGraphics = this.add.graphics().setAlpha(0.7);
		if (groundLayer1) {
			groundLayer1.renderDebug(debugGraphics, {
				tileColor: null,
				collidingTileColor: new Phaser.Display.Color(
					243,
					234,
					48,
					255
				),
				faceColor: new Phaser.Display.Color(
					40,
					39,
					37,
					255
				),
			});
		}
		if (groundLayer2) {
			groundLayer2.renderDebug(debugGraphics, {
				tileColor: null,
				collidingTileColor: new Phaser.Display.Color(
					243,
					234,
					48,
					255
				),
				faceColor: new Phaser.Display.Color(
					40,
					39,
					37,
					255
				),
			});
		}
		if (groundLayer3) {
			groundLayer3.renderDebug(debugGraphics, {
				tileColor: null,
				collidingTileColor: new Phaser.Display.Color(
					243,
					234,
					48,
					255
				),
				faceColor: new Phaser.Display.Color(
					40,
					39,
					37,
					255
				),
			});
		}

		this.player = this.add.player(705, 500, "player");

		this.cameras.main.zoom = 1.5;
		this.cameras.main.startFollow(this.player);
		if (groundLayer1)
			this.physics.add.collider(this.player, groundLayer1);
		if (groundLayer2)
			this.physics.add.collider(this.player, groundLayer2);
		if (groundLayer3)
			this.physics.add.collider(this.player, groundLayer3);
	}

	update(_t: number, _dt: number) {
		if (this.player) {
			this.player.update(this.cursors);
		}
	}
}
