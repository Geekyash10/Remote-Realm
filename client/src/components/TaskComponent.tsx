import React, { useState, useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PlusCircle, X, CheckCircle, Trash2, Calendar } from "lucide-react";

interface Task {
	id: string;
	text: string;
	completed: boolean;
	createdBy: string;
	createdAt: string;
}

interface TaskManagerProps {
	room?: Room;
	username: string;
	isVisible: boolean;
	onClose: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({
	room,
	username,
	isVisible,
	onClose,
}) => {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [newTaskText, setNewTaskText] = useState("");
	const taskInputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const dragRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState({ x: 0, y: 0 });

	// Handle task updates and notifications
	useEffect(() => {
		if (!room) return;

		// Listen for task updates from the server
		room.onMessage("task-update", (updatedTasks: Task[]) => {
			setTasks(updatedTasks);
		});

		// Listen for new task notifications
		room.onMessage(
			"task-notification",
			(data: { task: Task; action: string }) => {
				if (data.action === "add" && data.task.createdBy !== username) {
					toast.info(
						`${data.task.createdBy} added a new task: ${data.task.text}`,
						{
							position: "top-right",
							autoClose: 5000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
						}
					);
				} else if (
					data.action === "complete" &&
					data.task.createdBy !== username
				) {
					toast.success(
						`${data.task.text} was marked as complete by ${data.task.createdBy}`,
						{
							position: "top-right",
							autoClose: 5000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
						}
					);
				} else if (
					data.action === "delete" &&
					data.task.createdBy !== username
				) {
					toast.warn(
						`${data.task.createdBy} deleted task: ${data.task.text}`,
						{
							position: "top-right",
							autoClose: 5000,
							hideProgressBar: false,
							closeOnClick: true,
							pauseOnHover: true,
							draggable: true,
						}
					);
				}
			}
		);

		// Request current tasks when component mounts
		room.send("get-tasks");

		return () => {
			// Clean up event listeners
		};
	}, [room, username]);

	useEffect(() => {
		// Focus the input field when the task manager becomes visible
		if (isVisible && taskInputRef.current) {
			taskInputRef.current.focus();
		}
	}, [isVisible]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging && dragRef.current) {
				setPosition({
					x: e.clientX - dragRef.current.offsetWidth / 2,
					y: e.clientY - 20,
				});
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging]);

	const handleAddTask = () => {
		if (!newTaskText.trim() || !room) return;

		const newTask: Omit<Task, "id"> = {
			text: newTaskText.trim(),
			completed: false,
			createdBy: username,
			createdAt: new Date().toISOString(),
		};

		// Send task to server
		room.send("add-task", newTask);
		setNewTaskText("");
	};

	const handleToggleComplete = (taskId: string) => {
		if (!room) return;
		room.send("toggle-task", { taskId });
	};

	const handleDeleteTask = (taskId: string) => {
		if (!room) return;
		room.send("delete-task", { taskId });
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleAddTask();
		} else if (e.key === "Escape") {
			onClose();
		}
	};

	const formatTime = (timestamp: string) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (!isVisible) return null;

	return (
		<>
			<ToastContainer />
			<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
				<div
					ref={dragRef}
					className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
					style={{
						transform: isDragging
							? `translate(${position.x}px, ${position.y}px)`
							: "none",
						transition: isDragging ? "none" : "transform 0.2s",
					}}
				>
					{/* Header */}
					<div
						className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 flex justify-between items-center cursor-move"
						onMouseDown={() => setIsDragging(true)}
					>
						<h2 className="text-xl font-bold flex items-center">
							<CheckCircle className="w-5 h-5 mr-2" />
							Task Manager
						</h2>
						<button
							onClick={onClose}
							className="text-white hover:text-red-200 transition-colors duration-200"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Add task input */}
					<div className="p-4 border-b border-gray-200">
						<div className="flex gap-2">
							<input
								ref={taskInputRef}
								type="text"
								value={newTaskText}
								onChange={(e) => setNewTaskText(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Add a new task..."
								className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
							<button
								onClick={handleAddTask}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-1"
							>
								<PlusCircle className="w-4 h-4" />
								Add
							</button>
						</div>
					</div>

					{/* Task list */}
					<div className="max-h-96 overflow-y-auto p-4">
						{tasks.length === 0 ? (
							<div className="text-center py-8">
								<div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
									<CheckCircle className="w-8 h-8 text-gray-400" />
								</div>
								<p className="text-gray-500">
									No tasks yet. Add one to get started!
								</p>
							</div>
						) : (
							<ul className="space-y-3">
								{tasks.map((task) => (
									<li
										key={task.id}
										className={`p-3 rounded-lg transition-all duration-200 ${
											task.completed
												? "bg-green-50 border border-green-100"
												: "bg-white border border-gray-200 hover:border-blue-200 hover:shadow-sm"
										}`}
									>
										<div className="flex items-start gap-3">
											<div
												className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full cursor-pointer ${
													task.completed
														? "bg-green-500"
														: "border-2 border-gray-300 hover:border-blue-500"
												}`}
												onClick={() =>
													handleToggleComplete(
														task.id
													)
												}
											>
												{task.completed && (
													<CheckCircle className="w-5 h-5 text-white" />
												)}
											</div>

											<div className="flex-grow">
												<p
													className={`text-sm ${
														task.completed
															? "line-through text-gray-400"
															: "text-gray-700"
													}`}
												>
													{task.text}
												</p>
												<div className="flex items-center text-xs text-gray-500 mt-1">
													<span className="font-medium mr-2">
														{task.createdBy}
													</span>
													<Calendar className="w-3 h-3 mr-1" />
													<span>
														{formatTime(
															task.createdAt
														)}
													</span>
												</div>
											</div>

											<button
												onClick={() =>
													handleDeleteTask(task.id)
												}
												className="text-gray-400 hover:text-red-500 transition-colors duration-200"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

export default TaskManager;
