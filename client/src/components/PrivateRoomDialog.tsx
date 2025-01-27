import React, { useState } from "react";
import { Lock, User, KeyRound, ArrowRight } from "lucide-react";

interface PrivateRoomDialogProps {
	onJoin: (username: string, password: string) => void;
	onClose: () => void;
	roomName: string;
	description: string;
}

export const PrivateRoomDialog: React.FC<PrivateRoomDialogProps> = ({
	onJoin,
	onClose,
	roomName,
	description,
}) => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!username.trim() || !password.trim()) {
			setError("Please fill in all fields");
			return;
		}
		onJoin(username, password);
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
				{/* Header */}
				<div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
					<div className="flex items-center space-x-3">
						<div className="bg-white/20 p-2 rounded-lg">
							<Lock className="w-6 h-6 text-white" />
						</div>
						<div>
							<h2 className="text-xl font-semibold text-white">
								{roomName}
							</h2>
							<p className="text-blue-100 text-sm">
								{description}
							</p>
						</div>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					<div className="space-y-4">
						<div>
							<label className="flex items-center text-sm font-medium text-gray-700 mb-2">
								<User className="w-4 h-4 mr-2" />
								Your Name
							</label>
							<input
								type="text"
								value={username}
								onChange={(e) => {
									setUsername(e.target.value);
									setError("");
								}}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
								placeholder="Enter your name"
							/>
						</div>

						<div>
							<label className="flex items-center text-sm font-medium text-gray-700 mb-2">
								<KeyRound className="w-4 h-4 mr-2" />
								Room Password
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									setError("");
								}}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
								placeholder="Enter room password"
							/>
						</div>
					</div>

					{error && (
						<div className="text-red-500 text-sm flex items-center">
							<span className="mr-2">●</span>
							{error}
						</div>
					)}

					<div className="flex space-x-3">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
						>
							<span>Join Room</span>
							<ArrowRight className="w-4 h-4" />
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
