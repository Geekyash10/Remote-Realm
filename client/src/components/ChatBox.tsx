import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

interface Message {
	text: string;
	sender?: string;
	timestamp?: string;
	type?: "system" | "chat";
	name?: string;
}

interface ChatBoxProps {
	room: {
		onMessage: (type: string, callback: (message: Message) => void) => void;
		send: (type: string, message: Message) => void;
		removeAllListeners: () => void;
	} | null;
	username: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ room, username }) => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [message, setMessage] = useState<string>("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const emojiPickerRef = useRef<HTMLDivElement | null>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		if (room) {
			const handleMessage = (
				type: "system" | "chat",
				message: Message
			) => {
				setMessages((prev) => [...prev, { ...message, type }]);
			};

			room.onMessage("chat", (message) => handleMessage("chat", message));
			room.onMessage("system", (message) =>
				handleMessage("system", message)
			);

			room.onMessage("playerJoined", (message) =>
				handleMessage("system", {
					text: `${message.name} joined the room`,
				})
			);
			room.onMessage("playerLeft", (message) =>
				handleMessage("system", {
					text: `${message.name} left the room`,
				})
			);

			return () => {
				room.removeAllListeners();
			};
		}
	}, [room]);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// Close emoji picker when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				emojiPickerRef.current &&
				!emojiPickerRef.current.contains(event.target as Node)
			) {
				setShowEmojiPicker(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (message.trim() && room) {
			room.send("chat", {
				text: message,
				sender: username,
				timestamp: new Date().toISOString(),
				type: "chat",
			});
			setMessage("");
		}
	};

	const onEmojiClick = (emojiObject: any) => {
		setMessage((prev) => prev + emojiObject.emoji);
		setShowEmojiPicker(false);
	};

	const toggleEmojiPicker = () => {
		setShowEmojiPicker((prev) => !prev);
	};

	return (
		<div className="fixed bottom-4 left-8 z-50">
			{!isOpen && (
				<button
					onClick={() => setIsOpen(true)}
					className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg"
				>
					<MessageCircle className="w-6 h-6" />
				</button>
			)}

			{isOpen && (
				<div className="bg-white rounded-lg shadow-xl w-80 h-96 flex flex-col">
					<div className="p-4 bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
						<h3 className="font-medium">Chat Room</h3>
						<button
							onClick={() => setIsOpen(false)}
							className="text-white hover:text-gray-200"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						{messages.map((msg, index) => (
							<div
								key={index}
								className={`flex items-center space-x-2 w-full ${
									msg.sender === username ? "justify-end" : ""
								}`}
							>
								{msg.type !== "system" && (
									<div
										className={`w-8 h-8 flex items-center justify-center rounded-full text-white font-bold ${
											msg.sender === username
												? "bg-blue-600"
												: "bg-gray-400"
										}`}
									>
										{msg.sender?.charAt(0).toUpperCase() ||
											"?"}
									</div>
								)}

								<div
									className={`max-w-[100%] p-3 px-10 rounded-lg shadow-md ${
										msg.type === "system"
											? "text-center text-gray-500 text-sm"
											: msg.sender === username
											? "bg-blue-600 text-white"
											: "bg-gray-100 text-gray-900"
									}`}
								>
									{msg.type !== "system" && (
										<p className="text-xs font-medium mb-1">
											{msg.sender}
										</p>
									)}
									<span className="text-sm">{msg.text}</span>
								</div>
							</div>
						))}
						<div ref={messagesEndRef} />
					</div>

					<form onSubmit={sendMessage} className="p-4 border-t">
						<div className="flex space-x-2">
							<div className="relative">
								<button
									type="button"
									onClick={toggleEmojiPicker}
									className="p-2 text-gray-500 hover:text-blue-600 focus:outline-none"
								>
									<Smile className="w-5 h-5" />
								</button>

								{showEmojiPicker && (
									<div
										ref={emojiPickerRef}
										className="absolute bottom-12 left-0 z-10"
									>
										<EmojiPicker
											onEmojiClick={onEmojiClick}
										/>
									</div>
								)}
							</div>
							<input
								type="text"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Type a message..."
								className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<button
								type="submit"
								className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
							>
								<Send className="w-5 h-5" />
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
};

export default ChatBox;
