import { useState, useEffect } from "react";
import { Client, Room } from "colyseus.js";
import { PrivateRoomDialog } from "../components/PrivateRoomDialog";
import { PrivateRoomsList } from "../components/PrivateRoomsList";
import { Game } from "../Game/Game";

import {
	Building2,
	Users,
	LogOut,
	ArrowRight,
	Lock,
	PlusCircle,
	Home,
	Edit3,
	Bookmark,
	RefreshCw,
	CheckCircle,
	User,
	Shield,
	Key,
} from "lucide-react";

import ChatBox from "../components/ChatBox";

interface RoomInfo {
	roomId: string;
	roomName: string;
	description: string;
	isPrivate: boolean;
	players?: string[];
}

const client = new Client("ws://localhost:3000");

type JoinState =
	| "initial"
	| "name-input"
	| "joined"
	| "create-private"
	| "list-private";

function HomeScreen() {
	const [joinState, setJoinState] = useState<JoinState>("initial");
	const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
	const [username, setUsername] = useState<string>("");
	const [character, setCharacter] = useState<string>("adam");
	const [joinedPlayers, setJoinedPlayers] = useState<string[]>([]);
	const [error, setError] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);

	// Private room creation state
	const [roomName, setRoomName] = useState<string>("");
	const [roomDescription, setRoomDescription] = useState<string>("");
	const [roomPassword, setRoomPassword] = useState<string>("");

	// Private rooms list state
	const [privateRooms, setPrivateRooms] = useState<RoomInfo[]>([]);
	const [showJoinDialog, setShowJoinDialog] = useState(false);
	const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);
	const [showWhiteboard, setShowWhiteboard] = useState<boolean>(false);
	const [whiteboardInfo, setWhiteboardInfo] = useState<{
		whiteboardId: string;
		isPrivate: boolean;
		baseUrl: string;
	} | null>(null);

	// Client-side React component fix
	useEffect(() => {
		if (!currentRoom) return;

		console.log("Setting up room event listeners");

		// Handle player state changes
		currentRoom.state.players.onAdd((player: any) => {
			const playerNames = Array.from(
				currentRoom.state.players.values()
			).map((p: any) => p.name);
			setJoinedPlayers(playerNames);
		});

		currentRoom.state.players.onRemove((player: any) => {
			const playerNames = Array.from(
				currentRoom.state.players.values()
			).map((p: any) => p.name);
			setJoinedPlayers(playerNames);
		});

		// Handle room messages
		currentRoom.onMessage("update", (message) => {
			const playerNames = message.players.map((p: any) => p.name);
			setJoinedPlayers(playerNames);
		});

		currentRoom.onMessage("playerMoved", (message) => {
			console.log("Player moved:", message);
		});

		currentRoom.onMessage("roomInfo", (message) => {
			console.log("Room Info:", message);
		});

		currentRoom.onMessage("playerJoined", (message) => {
			console.log("Player joined:", message);
			setJoinedPlayers((prev) => [...prev, message.name]);
		});

		currentRoom.onMessage("playerLeft", (message) => {
			console.log("Player left:", message);
			setJoinedPlayers((prev) =>
				prev.filter((name) => name !== message.name)
			);
		});

		currentRoom.onMessage("chat", (message) => {
			console.log("Chat message received:", message);
		});

		currentRoom.onMessage("whiteboard-info", (message) => {
			console.log("Received whiteboard info:", message);
			setWhiteboardInfo(message);
		});

		// Request whiteboard info from the server
		currentRoom.send("whiteboard-access");

		return () => {
			console.log("Cleaning up room event listeners");
			currentRoom.removeAllListeners();
		};
	}, [currentRoom]);

	const goToHome = () => {
		if (currentRoom) {
			leaveRoom();
		}
		const videoElements = document.querySelectorAll("video");
		videoElements.forEach((video) => {
			video.srcObject = null;
			video.remove();
		});
		const joystick = document.querySelector("#external-joystick-container");
		if (joystick) {
			joystick.remove();
		}

		const divElements = document.querySelectorAll("div");
		divElements.forEach((div) => {
			if (
				div.classList.contains("video-container") ||
				div.classList.contains("view-toggle-container") ||
				div.classList.contains("video-name") // ✅ Remove video-name divs
			) {
				div.remove();
			}
		});

		const extraButtons = document.querySelectorAll(
			".video-control-btn, .audio-control-btn"
		);
		extraButtons.forEach((button) => button.remove());

		const videoStyles = document.getElementById("video-styles");
		if (videoStyles) {
			videoStyles.remove();
		}

		// Reset state
		setJoinState("initial");
		setUsername("");
		setCharacter("adam");
		setRoomName("");
		setRoomDescription("");
		setRoomPassword("");
		setError("");

		// ✅ Ensure loading is turned off
		setIsLoading(false);
	};

	const handleJoinPrivateRoom = (room: RoomInfo) => {
		setSelectedRoom(room);
		setShowJoinDialog(true);
	};

	const handleJoinPublicClick = () => {
		setJoinState("name-input");
	};

	const handleCreatePrivateRoomClick = () => {
		setJoinState("create-private");
	};

	const handleListPrivateRoomsClick = async () => {
		setIsLoading(true);
		try {
			const rooms = await fetch(
				"http://localhost:3000/privateRooms"
			).then((res) => res.json());

			// Ensure players property is populated
			const roomsWithPlayers = rooms.map((room: RoomInfo) => ({
				...room,
				players: room.players || [],
			}));

			setPrivateRooms(roomsWithPlayers);
			setJoinState("list-private");
		} catch (error) {
			setError("Failed to fetch private rooms");
		} finally {
			setIsLoading(false);
		}
	};

	const joinPublicRoom = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		if (!username.trim()) {
			setError("Please enter your name");
			setIsLoading(false);
			return;
		}

		try {
			const room = await client.joinOrCreate("game", {
				playerName: username.trim(),
				character,
				isPrivate: false,
			});

			setCurrentRoom(room);
			setJoinState("joined");
			setError("");
		} catch (error) {
			setError("Failed to join the room. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const createPrivateRoom = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		if (!username.trim()) {
			setError("Please enter your name");
			setIsLoading(false);
			return;
		}

		try {
			const room = await client.create("game", {
				roomName,
				roomDescription,
				roomPassword,
				playerName: username.trim(),
				isPrivate: true,
			});
			setCurrentRoom(room);
			setJoinState("joined");
			setError("");
		} catch (error) {
			setError("Failed to create private room. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const joinPrivateRoom = async (username: string, password: string) => {
		setIsLoading(true);
		try {
			if (!selectedRoom) {
				setError("No room selected.");
				setIsLoading(false);
				return;
			}
			const room = await client.joinById(selectedRoom.roomId, {
				playerName: username.trim(),
				roomPassword: password,
				isPrivate: true,
			});

			setUsername(username.trim());
			setCurrentRoom(room);
			setJoinState("joined");
			setShowJoinDialog(false);
			setError("");
		} catch (error) {
			setError("Failed to join private room. Check your credentials.");
		} finally {
			setIsLoading(false);
		}
	};

	const leaveRoom = async () => {
		if (currentRoom) {
			setIsLoading(true); // Show loading indicator
			try {
				// Notify the server and leave the room
				await currentRoom.leave();

				// Stop all media tracks (camera and microphone)
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: true,
				});
				mediaStream.getTracks().forEach((track) => track.stop());

				// Remove all video elements
				const videoElements = document.querySelectorAll("video");
				videoElements.forEach((video) => {
					video.srcObject = null;
					video.remove();
				});

				const containerId = `screen-share-container`;
				const container = document.getElementById(containerId);
				if (container) {
					container.remove();
				}

				// Remove video container and extra buttons
				const divElements = document.querySelectorAll("div");
				divElements.forEach((div) => {
					if (
						div.classList.contains("video-container") ||
						div.classList.contains("view-toggle-container") ||
						div.classList.contains("video-name")
					) {
						div.remove();
					}
				});

				const extraButtons = document.querySelectorAll(
					".video-control-btn, .audio-control-btn"
				);
				extraButtons.forEach((button) => button.remove());

				// Remove video styles
				const videoStyles = document.getElementById("video-styles");
				if (videoStyles) {
					videoStyles.remove();
				}

				// remove virtual joystick
				const joystick = document.querySelector(
					"#external-joystick-container"
				);
				if (joystick) {
					joystick.remove();
				}

				// Reset state
				setCurrentRoom(null);
				setJoinState("initial");
				setUsername("");
			} catch (error) {
				console.error("Error leaving room:", error);
			} finally {
				setIsLoading(false); // Hide loading indicator
			}
		}
	};

	const toggleWhiteboard = () => {
		setShowWhiteboard(!showWhiteboard);
	};

	const refreshPrivateRooms = () => {
		handleListPrivateRoomsClick();
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
			{/* Home button */}
			{/* Home button */}
			{joinState !== "initial" && joinState !== "joined" && (
				<div className="absolute top-4 left-4 z-10">
					<button
						onClick={goToHome}
						className="p-3 bg-white text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full shadow-md transition-all duration-200 flex items-center gap-2"
					>
						<Home className="w-5 h-5" />
						<span className="text-sm font-medium">Home</span>
					</button>
				</div>
			)}

			{/* Loading overlay */}
			{isLoading && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
						<RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
						<p className="text-lg font-medium">Loading...</p>
					</div>
				</div>
			)}

			<div className="container mx-auto px-5 py-12">
				{/* Initial landing page */}
				{joinState === "initial" && (
					<div className="max-w-3xl mx-auto text-center">
						<div className="mb-8 inline-block p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg transform transition-transform hover:scale-105">
							<Building2 className="w-16 h-16 text-white" />
						</div>
						<h1 className="text-5xl font-bold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700">
							Virtual Office Workspace
						</h1>
						<p className="text-xl text-gray-700 mb-10 max-w-2xl mx-auto">
							Connect with colleagues in our immersive virtual
							workspace. Collaborate, communicate, and create
							together in real-time.
						</p>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
							<button
								onClick={handleJoinPublicClick}
								className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 border-2 border-transparent hover:border-blue-400 group"
							>
								<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors duration-200">
									<Users className="w-8 h-8 text-blue-600" />
								</div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">
									Join Public Room
								</h3>
								<p className="text-gray-600 text-sm mb-4">
									Connect with others in a shared space
								</p>
								<div className="mt-auto">
									<ArrowRight className="w-6 h-6 text-blue-600" />
								</div>
							</button>

							<button
								onClick={handleCreatePrivateRoomClick}
								className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 border-2 border-transparent hover:border-green-400 group"
							>
								<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors duration-200">
									<Shield className="w-8 h-8 text-green-600" />
								</div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">
									Create Private Room
								</h3>
								<p className="text-gray-600 text-sm mb-4">
									Set up your own secured space
								</p>
								<div className="mt-auto">
									<PlusCircle className="w-6 h-6 text-green-600" />
								</div>
							</button>

							<button
								onClick={handleListPrivateRoomsClick}
								className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 border-2 border-transparent hover:border-purple-400 group"
							>
								<div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors duration-200">
									<Key className="w-8 h-8 text-purple-600" />
								</div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">
									Join Private Room
								</h3>
								<p className="text-gray-600 text-sm mb-4">
									Enter an existing private space
								</p>
								<div className="mt-auto">
									<Lock className="w-6 h-6 text-purple-600" />
								</div>
							</button>
						</div>
					</div>
				)}

				{/* Name input form */}
				{joinState === "name-input" && (
					<div className="max-w-md mx-auto bg-white rounded-xl shadow-xl p-8 border border-blue-100">
						<div className="text-center mb-6">
							<div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
								<User className="w-8 h-8 text-blue-600" />
							</div>
							<h2 className="text-2xl font-bold text-gray-900">
								Enter Your Name
							</h2>
							<p className="text-gray-600 mt-2">
								This will be your display name in the virtual
								space
							</p>
						</div>

						<form onSubmit={joinPublicRoom} className="space-y-6">
							<div>
								<label
									htmlFor="username"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Your Name
								</label>
								<input
									type="text"
									id="username"
									value={username}
									onChange={(e) => {
										setUsername(e.target.value);
										setError("");
									}}
									className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
										error
											? "border-red-500 bg-red-50"
											: "border-gray-300"
									}`}
									placeholder="Enter your name"
									required
								/>
								{error && (
									<p className="mt-2 text-sm text-red-600 flex items-center">
										<span className="inline-block mr-1">
											⚠️
										</span>{" "}
										{error}
									</p>
								)}
							</div>

							<div className="pt-4">
								<button
									type="submit"
									className="w-full px-6 py-3 text-lg font-medium text-white bg-gradient-to-r from-blue-500 to-blue-700 rounded-lg hover:from-blue-600 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
								>
									<CheckCircle className="w-5 h-5 mr-2" />
									Join Room
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Create private room form */}
				{joinState === "create-private" && (
					<div className="max-w-md mx-auto bg-white rounded-xl shadow-xl p-8 border border-green-100">
						<div className="text-center mb-6">
							<div className="inline-block p-3 bg-green-100 rounded-full mb-4">
								<Shield className="w-8 h-8 text-green-600" />
							</div>
							<h2 className="text-2xl font-bold text-gray-900">
								Create Private Room
							</h2>
							<p className="text-gray-600 mt-2">
								Set up your own secured workspace
							</p>
						</div>

						<form
							onSubmit={createPrivateRoom}
							className="space-y-4"
						>
							<div>
								<label
									htmlFor="createUsername"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Your Name
								</label>
								<input
									type="text"
									id="createUsername"
									value={username}
									onChange={(e) => {
										setUsername(e.target.value);
										setError("");
									}}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Enter your name"
									required
								/>
							</div>

							<div>
								<label
									htmlFor="roomName"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Room Name
								</label>
								<input
									type="text"
									id="roomName"
									value={roomName}
									onChange={(e) =>
										setRoomName(e.target.value)
									}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Enter room name"
									required
								/>
							</div>

							<div>
								<label
									htmlFor="roomDescription"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Room Description
								</label>
								<input
									type="text"
									id="roomDescription"
									value={roomDescription}
									onChange={(e) =>
										setRoomDescription(e.target.value)
									}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Optional room description"
								/>
							</div>

							<div>
								<label
									htmlFor="roomPassword"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Room Password
								</label>
								<input
									type="password"
									id="roomPassword"
									value={roomPassword}
									onChange={(e) =>
										setRoomPassword(e.target.value)
									}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
									placeholder="Enter room password"
									required
								/>
							</div>

							{error && (
								<p className="mt-2 text-sm text-red-600 flex items-center">
									<span className="inline-block mr-1">
										⚠️
									</span>{" "}
									{error}
								</p>
							)}

							<div className="pt-4">
								<button
									type="submit"
									className="w-full px-6 py-3 text-lg font-medium text-white bg-gradient-to-r from-green-500 to-green-700 rounded-lg hover:from-green-600 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
								>
									<PlusCircle className="w-5 h-5 mr-2" />
									Create Private Room
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Private rooms list */}
				{joinState === "list-private" && (
					<div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl p-8 border border-purple-100">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center">
								<div className="p-3 bg-purple-100 rounded-full mr-4">
									<Lock className="w-6 h-6 text-purple-600" />
								</div>
								<h2 className="text-2xl font-bold text-gray-900">
									Private Rooms
								</h2>
							</div>
							<button
								onClick={refreshPrivateRooms}
								className="p-2 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition-colors"
								title="Refresh Rooms List"
							>
								<RefreshCw className="w-5 h-5" />
							</button>
						</div>

						{privateRooms.length === 0 ? (
							<div className="text-center py-10">
								<Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-500 text-lg">
									No private rooms found
								</p>
								<p className="text-gray-400 mt-2">
									Create a new private room to get started
								</p>
								<button
									onClick={handleCreatePrivateRoomClick}
									className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center"
								>
									<PlusCircle className="w-5 h-5 mr-2" />
									Create Room
								</button>
							</div>
						) : (
							<div className="bg-purple-50 p-4 rounded-lg mb-6">
								<PrivateRoomsList
									rooms={privateRooms}
									onJoinRoom={(room: RoomInfo) =>
										handleJoinPrivateRoom(room)
									}
								/>
							</div>
						)}

						{showJoinDialog && selectedRoom && (
							<PrivateRoomDialog
								onJoin={joinPrivateRoom}
								onClose={() => setShowJoinDialog(false)}
								roomName={selectedRoom.roomName}
								description={selectedRoom.description}
							/>
						)}
					</div>
				)}

				{/* Joined room view */}
				{joinState === "joined" && (
					<div className="max-w-full mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-blue-100">
						<div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-4">
									<div className="p-3 bg-white bg-opacity-20 rounded-full">
										<Users className="w-6 h-6 text-white" />
									</div>
									<div>
										<h2 className="text-2xl font-bold">
											Virtual Office Room
										</h2>
										<p className="text-blue-100">
											Room ID: {currentRoom?.roomId}
										</p>
									</div>
								</div>
								<button
									onClick={leaveRoom}
									className="flex items-center px-4 py-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white rounded-lg transition-colors duration-200"
								>
									<LogOut className="w-5 h-5 mr-2" />
									Leave Room
								</button>
							</div>
						</div>

						<div className="p-6 bg-gray-50 border-b border-gray-200">
							<h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
								<Users className="w-5 h-5 mr-2 text-blue-600" />
								Participants ({joinedPlayers.length})
							</h3>
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
								{joinedPlayers.map((player, index) => (
									<div
										key={index}
										className="flex items-center space-x-2 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
									>
										<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
											<span className="text-white font-medium">
												{player.charAt(0).toUpperCase()}
											</span>
										</div>
										<span className="font-medium text-gray-800 truncate">
											{player}
										</span>
									</div>
								))}
							</div>
						</div>

						{/* Game component in full screen */}
						<div className="w-full">
							<Game
								roomId={currentRoom?.roomId}
								username={username}
								room={currentRoom ?? undefined}
								isPrivate={currentRoom?.state?.isPrivate}
							/>
						</div>

						{/* ChatBox below game */}
						<div className="border-t border-gray-200">
							<ChatBox room={currentRoom} username={username} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default HomeScreen;
