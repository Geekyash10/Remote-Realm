import React from "react";
import { Lock, Users, Clock, Building2 } from "lucide-react";

interface Room {
	roomId: string;
	roomName: string;
	description: string;
	isPrivate: boolean;
	players?: Array<any>;
}

interface PrivateRoomsListProps {
	rooms: Room[];
	onJoinRoom: (room: Room) => void;
}

export const PrivateRoomsList: React.FC<PrivateRoomsListProps> = ({
	rooms,
	onJoinRoom,
}) => {
	return (
		<div className="max-w-6xl mx-auto">
			<div className="bg-white rounded-xl shadow-lg overflow-hidden">
				<div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
					<div className="flex items-center space-x-3">
						<div className="bg-white/20 p-2 rounded-lg">
							<Building2 className="w-6 h-6 text-white" />
						</div>
						<div>
							<h2 className="text-2xl font-bold text-white">
								Private Rooms
							</h2>
							<p className="text-purple-100">
								Join secure collaboration spaces
							</p>
						</div>
					</div>
				</div>

				<div className="p-6">
					{rooms.length === 0 ? (
						<div className="text-center py-12">
							<Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
							<p className="text-gray-500 text-lg">
								No private rooms available
							</p>
							<p className="text-gray-400 text-sm mt-2">
								Create a new room to get started
							</p>
						</div>
					) : (
						<div className="grid gap-4">
							{rooms.map((room) => (
								<div
									key={room.roomId}
									onClick={() => onJoinRoom(room)}
									className="group border border-gray-200 rounded-xl p-5 hover:border-purple-400 hover:shadow-md transition-all duration-200 cursor-pointer bg-white"
								>
									<div className="flex items-start justify-between">
										<div className="space-y-2">
											<div className="flex items-center space-x-2">
												<h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
													{room.roomName}
												</h3>
												<Lock className="w-4 h-4 text-purple-500" />
											</div>
											<p className="text-gray-600 text-sm">
												{room.description}
											</p>

											<div className="flex items-center space-x-4 pt-2">
												<div className="flex items-center text-sm text-gray-500">
													<Users className="w-4 h-4 mr-1" />
													<span>
														{room.players?.length ||
															0}{" "}
														participants
													</span>
												</div>
												<div className="flex items-center text-sm text-gray-500">
													<Clock className="w-4 h-4 mr-1" />
													<span>Active</span>
												</div>
											</div>
										</div>

										<div className="bg-purple-50 p-2 rounded-lg group-hover:bg-purple-100 transition-colors">
											<Lock className="w-5 h-5 text-purple-600" />
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
