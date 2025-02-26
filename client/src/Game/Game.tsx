import { useEffect } from "react";
import Phaser from "phaser";
import { GameScene } from "./Scenes/GameScene";
import { Room } from "colyseus.js";

interface GameProps {
	width?: number;
	height?: number;
	roomId?: string;
	username?: string;
	room?: Room;
	isPrivate?: boolean; // Add isPrivate prop
}

export const Game: React.FC<GameProps> = ({
	width = 800,
	height = 600,
	roomId,
	username,
	room,
	isPrivate,
}) => {
	useEffect(() => {
		const config: Phaser.Types.Core.GameConfig = {
			type: Phaser.AUTO,
			backgroundColor: "#CFF5FC",
			parent: "game-container",
			pixelArt: true,
			scene: [GameScene],
			physics: {
				default: "arcade",
				arcade: {
					gravity: { y: 0, x: 0 },
					debug: true,
				},
			},
			scale: {
				mode: Phaser.Scale.FIT,
				autoCenter: Phaser.Scale.CENTER_BOTH,
				width: 800,
				height: 600,
			},
			callbacks: {
				preBoot: (game) => {
					game.registry.set("roomId", roomId);
					game.registry.set("username", username);
					game.registry.set("room", room);
					game.registry.set("isPrivate", isPrivate); // Set isPrivate in registry
				},
			},
		};

		const game = new Phaser.Game(config);

		game.scene.start("GameScene", { roomId, username, room, isPrivate });

		return () => {
			game.destroy(true);
		};
	}, [width, height, roomId, username, room, isPrivate]);

	return (
		<div
			id="game-container"
			style={{
				width: "800px",
				height: "600px",
				margin: "0 auto",
			}}
		/>
	);
};
