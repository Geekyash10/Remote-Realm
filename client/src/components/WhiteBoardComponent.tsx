import React, { useState, useEffect } from "react";

interface WhiteboardProps {
	roomId: string | undefined;
	isPrivate: boolean | undefined;
}

const WhiteboardComponent: React.FC<WhiteboardProps> = ({
	roomId,
	isPrivate,
}) => {
	const [isVisible, setIsVisible] = useState(false);

	const whiteboardId = roomId
		? `virtual-office-${roomId}`
		: "public-whiteboard";

	const wboBaseUrl = "https://remote-realm.onrender.com/boards/";
	const wboUrl = `${wboBaseUrl}${whiteboardId}?${
		isPrivate ? "readonly=false" : ""
	}`;

	const toggleVisibility = () => {
		setIsVisible((prev) => !prev);
	};

	// Handle keypress
	// Handle keypress
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.shiftKey && (event.key === "w" || event.key === "W")) {
				event.preventDefault(); // Prevent the browser's save dialog
				toggleVisibility();
			}
		};
		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, []);

	// Apply blur to ONLY the app wrapper
	useEffect(() => {
		const appWrapper = document.querySelector("#app-wrapper"); // Make sure you wrap your app with this ID
		if (isVisible) {
			if (appWrapper) appWrapper.classList.add("blur-background");
		} else {
			if (appWrapper) appWrapper.classList.remove("blur-background");
		}
	}, [isVisible]);

	return (
		<>
			{isVisible && (
				<div
					className="fixed inset-0 flex items-center justify-center z-50 transition-all duration-300"
					style={{
						backgroundColor: "rgba(0, 0, 0, 0.5)",
					}}
				>
					<div
						className="relative bg-white rounded-lg shadow-lg overflow-hidden"
						style={{
							width: "80%",
							height: "80%",
							animation: "fadeIn 0.3s ease-in-out",
						}}
					>
						<iframe
							src={wboUrl}
							className="w-full h-full border-0"
							title="Collaborative Whiteboard"
							allow="camera; microphone"
						/>
						<button
							onClick={toggleVisibility}
							className="absolute top-2 right-4 bg-red-600 text-white rounded-lg p-2  hover:bg-red-700 transition-colors"
						>
							Close
						</button>
					</div>
				</div>
			)}
			<style>
				{`
					.blur-background {
						filter: blur(5px);
						transition: filter 0.3s ease-in-out;
					}

					@keyframes fadeIn {
						from {
							opacity: 0;
							transform: scale(0.9);
						}
						to {
							opacity: 1;
							transform: scale(1);
						}
					}
				`}
			</style>
		</>
	);
};

export default WhiteboardComponent;
