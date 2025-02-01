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
			width,
			height,
			parent: "game-container",
			scene: GameScene,
			physics: {
				default: "arcade",
				arcade: {
					gravity: { y: 0, x: 0 },
					debug: false,
				},
			},
			scale: {
				mode: Phaser.Scale.FIT,
				autoCenter: Phaser.Scale.CENTER_BOTH,
			},
		};

		const game = new Phaser.Game(config);

		return () => {
			game.destroy(true);
		};
	}, [width, height]);

	return <div id="game-container" />;
};
