import { Info } from "lucide-react";
import { useState } from "react";

// Modal component for displaying features info
const FeaturesModal = ({
	isOpen,
	onClose,
}: {
	isOpen: boolean;
	onClose: () => void;
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 flex items-center justify-center z-50">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black bg-opacity-50"
				onClick={onClose}
			></div>

			{/* Modal Content */}
			<div className="bg-white rounded-lg shadow-lg w-80 p-6 z-10 relative">
				<button
					onClick={onClose}
					className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
				>
					✕
				</button>

				<h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
					<Info className="w-5 h-5 mr-2 text-blue-600" />
					Keyboard Shortcuts
				</h3>

				<div className="space-y-3">
					<div className="flex items-center p-2 bg-gray-50 rounded-md">
						<div className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-sm">
							Shift + T
						</div>
						<span className="ml-3 text-gray-700">Task Manager</span>
					</div>

					<div className="flex items-center p-2 bg-gray-50 rounded-md">
						<div className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-sm">
							Shift + W
						</div>
						<span className="ml-3 text-gray-700">Whiteboard</span>
					</div>

					<div className="flex items-center p-2 bg-gray-50 rounded-md">
						<div className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-sm">
							Shift + S
						</div>
						<span className="ml-3 text-gray-700">Screen Share</span>
					</div>
				</div>

				<button
					onClick={onClose}
					className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
				>
					Got it
				</button>
			</div>
		</div>
	);
};

// Component that replaces your original code
const InfoButton = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<div className="border-t border-gray-200 relative">
			{/* Information Icon */}
			<div className="absolute top-[-585px] left-4">
				<button
					onClick={() => setIsModalOpen(true)}
					className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
					title="Keyboard Shortcuts"
				>
					<Info className="w-6 h-6" />
				</button>
			</div>

			{/* Modal */}
			<FeaturesModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
			/>
		</div>
	);
};

export default InfoButton;
