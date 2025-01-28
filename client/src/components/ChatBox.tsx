import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";

interface Message {
	text: string;
	sender?: string;
	timestamp?: string;
	type?: "system" | "chat";
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
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

			return () => {
				room.removeAllListeners();
			};
		}
	}, [room]);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

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

	return (
		<div className="fixed bottom-4 right-4 z-50">
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
