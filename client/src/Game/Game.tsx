import { useEffect } from "react";
import Phaser from "phaser";
import { GameScene } from "./Scenes/GameScene";

interface GameProps {
	width?: number;
	height?: number;
}

export const Game: React.FC<GameProps> = ({ width = 800, height = 600 }) => {
	useEffect(() => {
		const config: Phaser.Types.Core.GameConfig = {
			type: Phaser.AUTO,
			backgroundColor: "CFF5FC",
			parent: "game-container",
			pixelArt: true,

			scene: GameScene,
			physics: {
				default: "arcade",
				arcade: {
					gravity: { y: 0, x: 0 },
					debug: true,
				},
			},
			mode: Phaser.Scale.RESIZE,

			width: window.innerWidth,
			height: window.innerHeight,
			min: {
				width: 800,
				height: 600,
			},
		};

		const game = new Phaser.Game(config);

		return () => {
			game.destroy(true);
		};
	}, [width, height]);

	return <div id="game-container" />;
};