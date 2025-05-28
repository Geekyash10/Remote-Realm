import React, { useState, useEffect, useRef } from "react";
import { Room } from "colyseus.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
	PlusCircle,
	X,
	CheckCircle,
	Trash2,
	Clock,
	Search,
	Menu,
	AlertCircle,
} from "lucide-react";

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
	const [searchText, setSearchText] = useState("");
	const [filterBy, setFilterBy] = useState<"all" | "completed" | "active">(
		"all"
	);
	const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alphabetical">(
		"newest"
	);
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const taskInputRef = useRef<HTMLInputElement>(null);
	const dragRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [showEmptyState, setShowEmptyState] = useState(false);

	// Handle task updates and notifications
	useEffect(() => {
		if (!room) return;

		// Listen for task updates from the server
		room.onMessage("task-update", (updatedTasks: Task[]) => {
			setTasks(updatedTasks);
			setShowEmptyState(updatedTasks.length === 0);
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
			setShowEmptyState(tasks.length === 0);
		}
	}, [isVisible, tasks.length]);

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

	const formatDate = (timestamp: string) => {
		const date = new Date(timestamp);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return "Today";
		} else if (date.toDateString() === yesterday.toDateString()) {
			return "Yesterday";
		} else {
			return date.toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
			});
		}
	};

	// Filter and sort tasks
	const filteredAndSortedTasks = tasks
		.filter((task) => {
			// Apply search filter
			if (
				searchText &&
				!task.text.toLowerCase().includes(searchText.toLowerCase())
			) {
				return false;
			}

			// Apply completion filter
			if (filterBy === "completed" && !task.completed) return false;
			if (filterBy === "active" && task.completed) return false;

			return true;
		})
		.sort((a, b) => {
			// Apply sorting
			if (sortBy === "newest") {
				return (
					new Date(b.createdAt).getTime() -
					new Date(a.createdAt).getTime()
				);
			} else if (sortBy === "oldest") {
				return (
					new Date(a.createdAt).getTime() -
					new Date(b.createdAt).getTime()
				);
			} else if (sortBy === "alphabetical") {
				return a.text.localeCompare(b.text);
			}
			return 0;
		});

	// Group tasks by date
	const groupedTasks: { [key: string]: Task[] } = {};
	filteredAndSortedTasks.forEach((task) => {
		const dateKey = formatDate(task.createdAt);
		if (!groupedTasks[dateKey]) {
			groupedTasks[dateKey] = [];
		}
		groupedTasks[dateKey].push(task);
	});

	if (!isVisible) return null;

	return (
		<>
			<ToastContainer />
			<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
				<div
					ref={dragRef}
					className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden transition-transform duration-200"
					style={{
						transform: isDragging
							? `translate(${position.x}px, ${position.y}px)`
							: "none",
						transition: isDragging ? "none" : "transform 0.2s",
					}}
				>
					{/* Header */}
					<div
						className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex justify-between items-center cursor-move"
						onMouseDown={() => setIsDragging(true)}
					>
						<h2 className="text-xl font-semibold flex items-center">
							<CheckCircle className="w-5 h-5 mr-2" />
							Task Manager
						</h2>
						<div className="flex items-center space-x-2">
							<button
								onClick={() => setIsFilterOpen(!isFilterOpen)}
								className="hover:bg-white/20 p-1 rounded-full transition-colors"
							>
								<Menu className="w-5 h-5" />
							</button>
							<button
								onClick={onClose}
								className="hover:bg-white/20 p-1 rounded-full transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>

					{/* Filter dropdown */}
					{isFilterOpen && (
						<div className="p-3 bg-gray-50 border-b border-gray-200">
							<div className="flex flex-col space-y-3">
								<div>
									<label className="text-xs text-gray-500 font-medium mb-1 block">
										Filter by status
									</label>
									<div className="flex space-x-2">
										<button
											onClick={() => setFilterBy("all")}
											className={`px-3 py-1 text-xs rounded-full ${
												filterBy === "all"
													? "bg-indigo-100 text-indigo-700 font-medium"
													: "bg-gray-100 text-gray-700"
											}`}
										>
											All
										</button>
										<button
											onClick={() =>
												setFilterBy("active")
											}
											className={`px-3 py-1 text-xs rounded-full ${
												filterBy === "active"
													? "bg-blue-100 text-blue-700 font-medium"
													: "bg-gray-100 text-gray-700"
											}`}
										>
											Active
										</button>
										<button
											onClick={() =>
												setFilterBy("completed")
											}
											className={`px-3 py-1 text-xs rounded-full ${
												filterBy === "completed"
													? "bg-green-100 text-green-700 font-medium"
													: "bg-gray-100 text-gray-700"
											}`}
										>
											Completed
										</button>
									</div>
								</div>

								<div>
									<label className="text-xs text-gray-500 font-medium mb-1 block">
										Sort by
									</label>
									<div className="flex space-x-2">
										<button
											onClick={() => setSortBy("newest")}
											className={`px-3 py-1 text-xs rounded-full ${
												sortBy === "newest"
													? "bg-indigo-100 text-indigo-700 font-medium"
													: "bg-gray-100 text-gray-700"
											}`}
										>
											Newest
										</button>
										<button
											onClick={() => setSortBy("oldest")}
											className={`px-3 py-1 text-xs rounded-full ${
												sortBy === "oldest"
													? "bg-indigo-100 text-indigo-700 font-medium"
													: "bg-gray-100 text-gray-700"
											}`}
										>
											Oldest
										</button>
										<button
											onClick={() =>
												setSortBy("alphabetical")
											}
											className={`px-3 py-1 text-xs rounded-full ${
												sortBy === "alphabetical"
													? "bg-indigo-100 text-indigo-700 font-medium"
													: "bg-gray-100 text-gray-700"
											}`}
										>
											A-Z
										</button>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Search & Input Area */}
					<div className="p-4 border-b border-gray-200 bg-white/90">
						<div className="flex items-center p-2 bg-gray-100 rounded-lg mb-3">
							<Search className="w-4 h-4 text-gray-400 mr-2" />
							<input
								type="text"
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								placeholder="Search tasks..."
								className="bg-transparent border-none w-full focus:outline-none text-sm"
							/>
							{searchText && (
								<button
									onClick={() => setSearchText("")}
									className="text-gray-400 hover:text-gray-600"
								>
									<X className="w-4 h-4" />
								</button>
							)}
						</div>

						<div className="flex gap-2">
							<input
								ref={taskInputRef}
								type="text"
								value={newTaskText}
								onChange={(e) => setNewTaskText(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder="Add a new task..."
								className="flex-grow px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							/>
							<button
								onClick={handleAddTask}
								disabled={!newTaskText.trim()}
								className={`px-4 py-2 rounded-lg transition duration-200 flex items-center gap-1 shadow-md ${
									newTaskText.trim()
										? "bg-indigo-600 text-white hover:bg-indigo-700"
										: "bg-gray-200 text-gray-400 cursor-not-allowed"
								}`}
							>
								<PlusCircle className="w-4 h-4" />
								Add
							</button>
						</div>
					</div>

					{/* Task list */}
					<div className="max-h-96 overflow-y-auto py-2 px-4 bg-white/80">
						{showEmptyState ? (
							<div className="text-center py-10">
								<div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
									<CheckCircle className="w-8 h-8 text-gray-400" />
								</div>
								<p className="text-gray-500 mb-1">
									No tasks yet
								</p>
								<p className="text-gray-400 text-sm">
									Add your first task to get started
								</p>
							</div>
						) : filteredAndSortedTasks.length === 0 ? (
							<div className="text-center py-8">
								<div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
									<AlertCircle className="w-6 h-6 text-amber-500" />
								</div>
								<p className="text-gray-500 text-sm">
									No matching tasks found
								</p>
							</div>
						) : (
							Object.keys(groupedTasks).map((dateGroup) => (
								<div key={dateGroup} className="mb-4">
									<div className="flex items-center mb-2">
										<div className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
											{dateGroup}
										</div>
										<div className="ml-2 h-px bg-gray-200 flex-grow"></div>
									</div>

									<ul className="space-y-2">
										{groupedTasks[dateGroup].map((task) => (
											<li
												key={task.id}
												className={`p-3 rounded-xl transition-all duration-200 border ${
													task.completed
														? "bg-green-50 border-green-200"
														: "bg-white hover:border-indigo-300 border-gray-200"
												} hover:shadow-md`}
											>
												<div className="flex items-start gap-3">
													<button
														className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full cursor-pointer transition-all duration-150 ${
															task.completed
																? "bg-green-500 flex items-center justify-center"
																: "border-2 border-gray-300 hover:border-indigo-500"
														}`}
														onClick={() =>
															handleToggleComplete(
																task.id
															)
														}
														aria-label={
															task.completed
																? "Mark as incomplete"
																: "Mark as complete"
														}
													>
														{task.completed && (
															<CheckCircle className="w-4 h-4 text-white" />
														)}
													</button>

													<div className="flex-grow">
														<p
															className={`text-sm ${
																task.completed
																	? "line-through text-gray-400"
																	: "text-gray-800"
															}`}
														>
															{task.text}
														</p>
														<div className="flex items-center text-xs text-gray-500 mt-1">
															<span className="font-medium mr-2">
																{task.createdBy}
															</span>
															<Clock className="w-3 h-3 mr-1" />
															<span>
																{formatTime(
																	task.createdAt
																)}
															</span>
														</div>
													</div>

													<button
														onClick={() =>
															handleDeleteTask(
																task.id
															)
														}
														className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-red-50"
														aria-label="Delete task"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</div>
											</li>
										))}
									</ul>
								</div>
							))
						)}
					</div>

					{/* Footer */}
					<div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
						<div>
							{tasks.length} task{tasks.length !== 1 ? "s" : ""} •
							{tasks.filter((t) => t.completed).length} completed
						</div>
						<div className="flex items-center">
							<span className="text-indigo-500 font-medium mr-1">
								{username}
							</span>
							<span>• Virtual Office</span>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default TaskManager;
