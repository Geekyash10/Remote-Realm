import { MediaConnection } from "peerjs";
import { UIHelpers } from "./UIHelpers";

export class ScreenShareManager {
	private screenStream: MediaStream | null = null;
	private isScreenSharing: boolean = false;
	private activeScreenSharePeerId: string | null = null;
	private webRTCManager: any;
	private sessionId: string;
	private room: any;

	constructor(webRTCManager: any, sessionId: string, room?: any) {
		this.webRTCManager = webRTCManager;
		this.sessionId = sessionId;
		this.room = room;
		console.log(
			`ScreenShareManager initialized for session ID: ${sessionId}`
		);
	}

	setRoom(room: any) {
		this.room = room;

		// Set up screen share related listeners
		this.room.onMessage("screen-share-started", (message: any) => {
			const { peerId } = message;
			console.log(`Received screen-share-started from ${peerId}`);
			this.handleScreenShareStarted(peerId);
		});

		this.room.onMessage("screen-share-stopped", (message: any) => {
			const { peerId } = message;
			console.log(`Received screen-share-stopped from ${peerId}`);
			this.handleScreenShareStopped(peerId);
		});

		// When joining, request current screen share status
		this.room.send("get-screen-share-status");

		// Handle current screen share status response
		this.room.onMessage("screen-share-status", (message: any) => {
			if (
				message.activePeerId &&
				message.activePeerId !== this.sessionId
			) {
				this.activeScreenSharePeerId = message.activePeerId;
				console.log(
					`Current active screen share: ${this.activeScreenSharePeerId}`
				);
			}
		});
	}

	setupKeyboardShortcuts() {
		document.addEventListener("keydown", (e) => {
			if (e.ctrlKey && e.key === "s") {
				e.preventDefault(); // Prevent browser save dialog
				console.log("Ctrl+S pressed");

				// Debug logs
				console.log("Is screen sharing:", this.isScreenSharing);
				console.log(
					"Active screen share peer ID:",
					this.activeScreenSharePeerId
				);
				console.log("Current session ID:", this.sessionId);

				// If already sharing screen, stop sharing
				if (this.isScreenSharing) {
					console.log("Stopping screen share...");
					this.stopScreenShare();
					return;
				}

				// If someone else is sharing, show the prompt with options
				if (
					this.activeScreenSharePeerId &&
					this.activeScreenSharePeerId !== this.sessionId
				) {
					const playerName =
						this.room?.state?.players?.[
							this.activeScreenSharePeerId
						]?.name || this.activeScreenSharePeerId;

					console.log(
						`Another user (${playerName}) is sharing. Showing options...`
					);
					this.showScreenShareOptions(playerName);
				} else {
					// No one is sharing, start sharing own screen
					console.log("Starting screen share...");
					this.startScreenShare();
				}
			}
		});
	}

	async startScreenShare() {
		if (this.isScreenSharing) {
			console.log("Already sharing screen");
			return;
		}

		try {
			this.screenStream = await navigator.mediaDevices.getDisplayMedia({
				video: true,
				audio: false,
			});

			this.isScreenSharing = true;
			this.activeScreenSharePeerId = this.sessionId;

			// Add a screen video element for local preview
			this.addScreenVideoElement(this.sessionId, this.screenStream, true);

			// Share screen with all existing connections
			Object.keys(this.webRTCManager.getConnections()).forEach(
				(peerId) => {
					this.shareScreenWithPeer(peerId);
				}
			);

			// Notify room that this user is sharing screen
			if (this.room) {
				console.log(
					`Broadcasting screen-share-started as ${this.sessionId}`
				);
				this.room.send("screen-share-started", {
					peerId: this.sessionId,
				});
			}

			// Handle when user stops sharing via browser controls
			this.screenStream.getVideoTracks()[0].onended = () => {
				this.stopScreenShare();
			};
		} catch (error) {
			console.error("Error starting screen share:", error);
		}
	}

	stopScreenShare() {
		if (!this.isScreenSharing || !this.screenStream) return;

		// Stop all screen share tracks
		this.screenStream.getTracks().forEach((track) => track.stop());

		// Remove screen video elements
		this.removeScreenVideoElement(this.sessionId);

		// Remove the screen share container div
		const containerId = `screen-share-container-${this.sessionId}`;
		const container = document.getElementById(containerId);
		if (container) {
			container.remove();
		}

		// Reset state
		this.screenStream = null;
		this.isScreenSharing = false;

		// Notify room that screen sharing stopped
		if (this.room) {
			console.log(
				`Broadcasting screen-share-stopped as ${this.sessionId}`
			);
			this.room.send("screen-share-stopped", {
				peerId: this.sessionId,
			});
		}

		if (this.activeScreenSharePeerId === this.sessionId) {
			this.activeScreenSharePeerId = null;
		}
	}

	shareScreenWithPeer(peerId: string) {
		if (!this.screenStream || !this.webRTCManager.getPeer()) return;

		try {
			// Use a different connection ID for screen sharing
			const call = this.webRTCManager
				.getPeer()
				.call(peerId, this.screenStream, {
					metadata: { type: "screen" },
				});

			// We don't need to track this connection as it's one-way
			call.on("error", (err: Error) => {
				console.error(`Screen sharing error with ${peerId}:`, err);
			});
		} catch (error) {
			console.error(`Error sharing screen with ${peerId}:`, error);
		}
	}

	handleIncomingScreenShareCall(call: MediaConnection) {
		call.answer(); // No need to send our stream back

		call.on("stream", (remoteStream) => {
			console.log(`Received screen share from peer: ${call.peer}`);
			this.activeScreenSharePeerId = call.peer;
			this.addScreenVideoElement(call.peer, remoteStream, false);
		});

		call.on("close", () => {
			console.log(`Screen share ended from peer: ${call.peer}`);
			this.removeScreenVideoElement(call.peer);
			if (this.activeScreenSharePeerId === call.peer) {
				this.activeScreenSharePeerId = null;
			}
		});

		call.on("error", (err: Error) => {
			console.error(`Screen share error with ${call.peer}:`, err);
		});
	}

	handleScreenShareStarted(peerId: string) {
		console.log(`Screen share started by ${peerId}`);
		this.activeScreenSharePeerId = peerId;

		// If we're already sharing, we should stop and let the other person share
		if (this.isScreenSharing && peerId !== this.sessionId) {
			console.log(
				"Someone else started sharing while we were sharing. Stopping our share."
			);
			this.stopScreenShare();
		}
	}

	handleScreenShareStopped(peerId: string) {
		console.log(`Screen share stopped by ${peerId}`);

		this.removeScreenVideoElement(peerId);

		const containerId = `screen-share-container-${peerId}`;
		const container = document.getElementById(containerId);
		if (container) {
			console.log("Manually removing lingering container");
			container.remove();
		}
		if (this.activeScreenSharePeerId === peerId) {
			this.activeScreenSharePeerId = null;
		}
	}

	private addScreenVideoElement(
		peerId: string,
		stream: MediaStream,
		isLocal: boolean
	) {
		// Create a unique ID for the screen share element
		const elementId = `screen-share-${peerId}`;

		// Check if element already exists
		if (document.getElementById(elementId)) {
			console.warn(`Screen share element for ${peerId} already exists`);
			return;
		}

		// Create main container for screen share
		const screenShareContainer = document.createElement("div");
		screenShareContainer.id = `screen-share-container-${peerId}`;
		screenShareContainer.style.position = "fixed";
		screenShareContainer.style.top = "0";
		screenShareContainer.style.left = "0";
		screenShareContainer.style.width = "100%";
		screenShareContainer.style.height = "100%";
		screenShareContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
		screenShareContainer.style.zIndex = "999";
		screenShareContainer.style.display = "flex";
		screenShareContainer.style.flexDirection = "column";
		screenShareContainer.style.justifyContent = "center";
		screenShareContainer.style.alignItems = "center";

		// Create video element
		const videoElement = document.createElement("video");
		videoElement.id = elementId;
		videoElement.srcObject = stream;
		videoElement.autoplay = true;
		videoElement.playsInline = true;
		videoElement.muted = isLocal; // Mute local screen share
		videoElement.style.maxWidth = "90%";
		videoElement.style.maxHeight = "90%";
		videoElement.style.boxShadow = "0 5px 15px rgba(0,0,0,0.5)";

		// Add user info
		const userInfo = document.createElement("div");
		const userName = this.room?.state?.players?.[peerId]?.name || peerId;
		userInfo.textContent = `${
			isLocal ? "You are" : userName + " is"
		} sharing screen`;
		userInfo.style.color = "white";
		userInfo.style.marginTop = "15px";
		userInfo.style.fontSize = "16px";
		userInfo.style.textAlign = "center";

		// Create controls
		const controlsContainer = document.createElement("div");
		controlsContainer.style.marginTop = "20px";
		controlsContainer.style.display = "flex";
		controlsContainer.style.gap = "10px";

		if (isLocal) {
			// Add stop sharing button for local screen share
			const stopButton = document.createElement("button");
			stopButton.textContent = "Stop Sharing";
			stopButton.style.backgroundColor = "#E53E3E";
			stopButton.style.color = "white";
			stopButton.style.border = "none";
			stopButton.style.borderRadius = "4px";
			stopButton.style.padding = "10px 20px";
			stopButton.style.cursor = "pointer";
			stopButton.onclick = () => this.stopScreenShare();

			controlsContainer.appendChild(stopButton);
		} else {
			// For remote screen share, maybe add a "View in smaller window" button
			const minimizeButton = document.createElement("button");
			minimizeButton.textContent = "Minimize";
			minimizeButton.style.backgroundColor = "#3182CE";
			minimizeButton.style.color = "white";
			minimizeButton.style.border = "none";
			minimizeButton.style.borderRadius = "4px";
			minimizeButton.style.padding = "10px 20px";
			minimizeButton.style.cursor = "pointer";

			// Toggle between fullscreen and minimized view
			let isMinimized = false;
			minimizeButton.onclick = () => {
				if (isMinimized) {
					// Go back to fullscreen
					screenShareContainer.style.top = "0";
					screenShareContainer.style.left = "0";
					screenShareContainer.style.width = "100%";
					screenShareContainer.style.height = "100%";
					videoElement.style.maxWidth = "90%";
					videoElement.style.maxHeight = "90%";
					minimizeButton.textContent = "Minimize";
				} else {
					// Minimize to corner
					screenShareContainer.style.top = "auto";
					screenShareContainer.style.bottom = "20px";
					screenShareContainer.style.left = "auto";
					screenShareContainer.style.right = "20px";
					screenShareContainer.style.width = "300px";
					screenShareContainer.style.height = "200px";
					videoElement.style.maxWidth = "100%";
					videoElement.style.maxHeight = "100%";
					minimizeButton.textContent = "Maximize";
				}
				isMinimized = !isMinimized;
			};

			controlsContainer.appendChild(minimizeButton);
		}

		screenShareContainer.appendChild(videoElement);
		screenShareContainer.appendChild(userInfo);
		screenShareContainer.appendChild(controlsContainer);
		document.body.appendChild(screenShareContainer);
	}

	private removeScreenVideoElement(peerId: string) {
		const containerId = `screen-share-container-${peerId}`;
		const container = document.getElementById(containerId);

		if (container) {
			container.remove();
		}

		const elementId = `screen-share-${peerId}`;
		const videoElement = document.getElementById(elementId);

		if (videoElement) {
			// Clean up stream if it exists
			const stream = (videoElement as HTMLVideoElement)
				.srcObject as MediaStream;
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
				(videoElement as HTMLVideoElement).srcObject = null;
			}
		}
	}

	showScreenShareOptions(currentSharer: string) {
		// Create modal to ask user what they want to do
		console.log(
			`Showing screen share options for sharer: ${currentSharer}`
		);

		const modal = document.createElement("div");
		modal.style.position = "fixed";
		modal.style.top = "0";
		modal.style.left = "0";
		modal.style.width = "100%";
		modal.style.height = "100%";
		modal.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
		modal.style.display = "flex";
		modal.style.justifyContent = "center";
		modal.style.alignItems = "center";
		modal.style.zIndex = "2000";

		const dialogBox = document.createElement("div");
		dialogBox.style.backgroundColor = "white";
		dialogBox.style.borderRadius = "8px";
		dialogBox.style.padding = "20px";
		dialogBox.style.width = "400px";
		dialogBox.style.maxWidth = "90%";
		dialogBox.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";

		const title = document.createElement("h3");
		title.textContent = "Screen Sharing";
		title.style.margin = "0 0 15px 0";
		title.style.color = "#2D3748";

		const message = document.createElement("p");
		message.textContent = `${currentSharer} is currently sharing their screen.`;
		message.style.marginBottom = "20px";

		const buttonContainer = document.createElement("div");
		buttonContainer.style.display = "flex";
		buttonContainer.style.flexDirection = "column";
		buttonContainer.style.gap = "10px";

		// View current share button
		const viewButton = document.createElement("button");
		viewButton.textContent = "View Shared Screen";
		viewButton.style.backgroundColor = "#3182CE";
		viewButton.style.color = "white";
		viewButton.style.border = "none";
		viewButton.style.borderRadius = "4px";
		viewButton.style.padding = "10px";
		viewButton.style.cursor = "pointer";
		viewButton.onclick = () => {
			document.body.removeChild(modal);
			// No action needed as they should already be viewing the screen
		};

		// Share your own screen button
		const shareButton = document.createElement("button");
		shareButton.textContent = "Share My Screen Instead";
		shareButton.style.backgroundColor = "#48BB78";
		shareButton.style.color = "white";
		shareButton.style.border = "none";
		shareButton.style.borderRadius = "4px";
		shareButton.style.padding = "10px";
		shareButton.style.cursor = "pointer";
		shareButton.onclick = () => {
			document.body.removeChild(modal);
			this.startScreenShare();
		};

		// Cancel button
		const cancelButton = document.createElement("button");
		cancelButton.textContent = "Cancel";
		cancelButton.style.backgroundColor = "#E2E8F0";
		cancelButton.style.color = "#4A5568";
		cancelButton.style.border = "none";
		cancelButton.style.borderRadius = "4px";
		cancelButton.style.padding = "10px";
		cancelButton.style.cursor = "pointer";
		cancelButton.onclick = () => {
			document.body.removeChild(modal);
		};

		buttonContainer.appendChild(viewButton);
		buttonContainer.appendChild(shareButton);
		buttonContainer.appendChild(cancelButton);

		dialogBox.appendChild(title);
		dialogBox.appendChild(message);
		dialogBox.appendChild(buttonContainer);
		modal.appendChild(dialogBox);
		document.body.appendChild(modal);
	}
}
