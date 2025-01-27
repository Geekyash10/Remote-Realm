import { useState, useEffect } from "react";
import { Client, Room } from "colyseus.js";
import { PrivateRoomDialog } from "./components/PrivateRoomDialog";
import { PrivateRoomsList } from "./components/PrivateRoomsList";
import {
	Building2,
	Users,
	LogOut,
	ArrowRight,
	Lock,
	PlusCircle,
} from "lucide-react";

import "./App.css";

interface PlayerType {
	name: string;
}

interface RoomInfo {
	roomId: string;
	roomName: string;
	description: string;
	isPrivate: boolean;
}

const client = new Client("ws://localhost:3000");

type JoinState =
	| "initial"
	| "name-input"
	| "joined"
	| "create-private"
	| "list-private";

function App() {
	const [joinState, setJoinState] = useState<JoinState>("initial");
	const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
	const [username, setUsername] = useState<string>("");
	const [joinedPlayers, setJoinedPlayers] = useState<string[]>([]);
	const [error, setError] = useState<string>("");

	// Private room creation state
	const [roomName, setRoomName] = useState<string>("");
	const [roomDescription, setRoomDescription] = useState<string>("");
	const [roomPassword, setRoomPassword] = useState<string>("");

	// Private rooms list state
	const [privateRooms, setPrivateRooms] = useState<RoomInfo[]>([]);

	const [showJoinDialog, setShowJoinDialog] = useState(false);
	const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);

	const handleJoinPrivateRoom = (room: RoomInfo) => {
		setSelectedRoom(room);
		setShowJoinDialog(true);
	};

	useEffect(() => {
		if (currentRoom) {
			currentRoom.onStateChange((state) => {
				const playerNames = state.players.map(
					(player: PlayerType) => player.name
				);
				setJoinedPlayers(playerNames);
			});
		}
	}, [currentRoom]);

	const handleJoinPublicClick = () => {
		setJoinState("name-input");
	};

	const handleCreatePrivateRoomClick = () => {
		setJoinState("create-private");
	};

	const handleListPrivateRoomsClick = async () => {
		try {
			// This is a placeholder. In a real app, you'd implement a method to list private rooms
			console.log("hello");
			const rooms = await fetch(
				"http://localhost:3000/privateRooms"
			).then((res) => res.json());
			console.log(rooms);
			setPrivateRooms(rooms);

			setJoinState("list-private");
		} catch (error) {
			setError("Failed to fetch private rooms");
		}
	};

	const joinPublicRoom = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!username.trim()) {
			setError("Please enter your name");
			return;
		}

		try {
			const room = await client.joinOrCreate("game", {
				playerName: username,
				isPrivate: false,
				roomId: "public",
			});
			setCurrentRoom(room);
			setJoinState("joined");
			setError("");
		} catch (error) {
			setError("Failed to join the room. Please try again.");
		}
	};

	const createPrivateRoom = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!username.trim()) {
			setError("Please enter your name");
			return;
		}

		try {
			const room = await client.create("game", {
				roomName,
				roomDescription,
				roomPassword,
				playerName: username,
				isPrivate: true,
			});
			setCurrentRoom(room);
			setJoinState("joined");
			setError("");
		} catch (error) {
			setError("Failed to create private room. Please try again.");
		}
	};

	const joinPrivateRoom = async (username: string, password: string) => {
		try {
			if (!selectedRoom) {
				setError("No room selected.");
				return;
			}
			const room = await client.joinById(selectedRoom.roomId, {
				playerName: username,
				roomId: selectedRoom.roomId,
				roomPassword: password,
			});

			setUsername(username);
			setCurrentRoom(room);
			setJoinState("joined");
			setShowJoinDialog(false);
			setError("");
		} catch (error) {
			setError("Failed to join private room. Check your credentials.");
		}
	};

	const leaveRoom = async () => {
		if (currentRoom) {
			await currentRoom.leave();
			setCurrentRoom(null);
			setJoinState("initial");
			setUsername("");
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
			<div className="container mx-auto px-4 py-16">
				{joinState === "initial" && (
					<div className="max-w-2xl mx-auto text-center">
						<div className="mb-8 inline-block p-4 bg-blue-100 rounded-full">
							<Building2 className="w-12 h-12 text-blue-600" />
						</div>
						<h1 className="text-4xl font-bold text-gray-900 mb-4">
							Virtual Office Workspace
						</h1>
						<p className="text-lg text-gray-600 mb-8">
							Connect with colleagues in our virtual workspace.
						</p>
						<div className="flex-col flex items-center  justify-center my-5 ">
							<button
								onClick={handleJoinPublicClick}
								className="inline-flex items-center my-2 px-10 py-4 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
							>
								<Users className="w-5 h-5 mr-2" />
								Join Public Room
								<ArrowRight className="w-5 h-5 ml-2" />
							</button>
							<button
								onClick={handleCreatePrivateRoomClick}
								className="inline-flex items-center px-7 py-4 my-2 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200"
							>
								<PlusCircle className="w-5 h-5 mr-2" />
								Create Private Room
								<Lock className="w-5 h-5 ml-2" />
							</button>
							<button
								onClick={handleListPrivateRoomsClick}
								className="inline-flex items-center my-2 px-10 py-4 text-lg font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors duration-200"
							>
								<Lock className="w-5 h-5 mr-2" />
								Join Private Room
								<ArrowRight className="w-5 h-5 ml-2" />
							</button>
						</div>
					</div>
				)}

				{joinState === "name-input" && (
					<div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
						<h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
							Enter Your Name
						</h2>
						<form onSubmit={joinPublicRoom}>
							<div className="mb-6">
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
									className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
										error
											? "border-red-500"
											: "border-gray-300"
									}`}
									placeholder="Enter your name"
									required
								/>
								{error && (
									<p className="mt-2 text-sm text-red-600">
										{error}
									</p>
								)}
							</div>
							<button
								type="submit"
								className="w-full px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
							>
								Join Room
							</button>
						</form>
					</div>
				)}

				{joinState === "create-private" && (
					<div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
						<h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
							Create Private Room
						</h2>
						<form onSubmit={createPrivateRoom}>
							<div className="mb-4">
								<label
									htmlFor="username"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Your Name
								</label>
								<input
									type="text"
									value={username}
									onChange={(e) => {
										setUsername(e.target.value);
										setError("");
									}}
									className="w-full px-4 py-2 border rounded-lg"
									placeholder="Enter your name"
									required
								/>
							</div>
							<div className="mb-4">
								<label
									htmlFor="roomName"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Room Name
								</label>
								<input
									type="text"
									value={roomName}
									onChange={(e) =>
										setRoomName(e.target.value)
									}
									className="w-full px-4 py-2 border rounded-lg"
									placeholder="Enter room name"
									required
								/>
							</div>
							<div className="mb-4">
								<label
									htmlFor="roomDescription"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Room Description
								</label>
								<input
									type="text"
									value={roomDescription}
									onChange={(e) =>
										setRoomDescription(e.target.value)
									}
									className="w-full px-4 py-2 border rounded-lg"
									placeholder="Optional room description"
								/>
							</div>
							<div className="mb-6">
								<label
									htmlFor="roomPassword"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Room Password
								</label>
								<input
									type="password"
									value={roomPassword}
									onChange={(e) =>
										setRoomPassword(e.target.value)
									}
									className="w-full px-4 py-2 border rounded-lg"
									placeholder="Enter room password"
									required
								/>
							</div>
							{error && (
								<p className="mt-2 text-sm text-red-600 mb-4">
									{error}
								</p>
							)}
							<button
								type="submit"
								className="w-full px-6 py-3 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors duration-200"
							>
								Create Private Room
							</button>
						</form>
					</div>
				)}

				{joinState === "list-private" && (
					<div className="max-w-full mx-auto bg-white rounded-xl shadow-lg p-8">
						<h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
							Private Rooms
						</h2>
						{joinState === "list-private" && (
							<>
								<PrivateRoomsList
									rooms={privateRooms}
									onJoinRoom={(room) =>
										handleJoinPrivateRoom(room)
									}
								/>
								{showJoinDialog && selectedRoom && (
									<PrivateRoomDialog
										onJoin={joinPrivateRoom}
										onClose={() => setShowJoinDialog(false)}
										roomName={selectedRoom.roomName}
										description={selectedRoom.description}
									/>
								)}
							</>
						)}
					</div>
				)}

				{joinState === "joined" && (
					<div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg">
						<div className="p-6 border-b border-gray-200">
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-3">
									<Users className="w-6 h-6 text-blue-600" />
									<div>
										<h2 className="text-xl font-semibold text-gray-900">
											Virtual Office Room
										</h2>
										<p className="text-sm text-gray-600">
											Room ID: {currentRoom?.roomId}
										</p>
									</div>
								</div>
								<button
									onClick={leaveRoom}
									className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
								>
									<LogOut className="w-4 h-4 mr-2" />
									Leave Room
								</button>
							</div>
						</div>

						<div className="p-6">
							<div className="mb-4">
								<h3 className="text-lg font-medium text-gray-900 mb-3">
									Participants ({joinedPlayers.length})
								</h3>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
									{joinedPlayers.map((player, index) => (
										<div
											key={index}
											className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg"
										>
											<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
												<span className="text-blue-600 font-medium">
													{player
														.charAt(0)
														.toUpperCase()}
												</span>
											</div>
											<span className="font-medium text-gray-700">
												{player}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default App;
