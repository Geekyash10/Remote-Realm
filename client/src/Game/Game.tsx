import { useEffect, useState } from "react";
import Phaser from "phaser";
import { GameScene } from "./Scenes/GameScene";
import { Room } from "colyseus.js";
import WhiteboardComponent from "../components/WhiteBoardComponent";
import TaskManager from "../components/TaskComponent";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
	const [taskManagerVisible, setTaskManagerVisible] = useState(false);
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
					debug: false,
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
		const handleToggleTaskManager = (event: any) => {
			setTaskManagerVisible(event.detail.open);
		};

		window.addEventListener("toggleTaskManager", handleToggleTaskManager);

		return () => {
			game.destroy(true);
			window.removeEventListener(
				"toggleTaskManager",
				handleToggleTaskManager
			);
		};
	}, [width, height, roomId, username, room, isPrivate]);

	return (
		<>
			<ToastContainer
				position="top-right"
				autoClose={5000}
				hideProgressBar={false}
				newestOnTop
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
				theme="light"
			/>
			<div
				id="game-container"
				style={{
					width: "100%", // Set width to 100%
					height: "600px", // Keep the height fixed or adjust as needed
					margin: "0 auto",
					position: "relative",
				}}
			/>
			<WhiteboardComponent roomId={roomId} isPrivate={isPrivate} />
			{username && (
				<TaskManager
					room={room}
					username={username}
					isVisible={taskManagerVisible}
					onClose={() => setTaskManagerVisible(false)}
				/>
			)}
		</>
	);
};
