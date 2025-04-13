import Peer, { MediaConnection } from "peerjs";

export class WebRTCManager {
	private peer: Peer | null = null;
	private localStream: MediaStream | null = null;
	private connections: Record<string, MediaConnection> = {};
	private videoElements: Record<string, HTMLVideoElement> = {};
	private retryConnections: Record<string, number> = {};
	private videoEnabled: boolean = true;
	private audioEnabled: boolean = true;
	private room: any; // Reference to Colyseus room

	constructor(
		private sessionId: string,
		private stunServers: RTCIceServer[] = [],
		room?: any
	) {
		if (room) {
			this.room = room;
		}
	}

	async initialize() {
		this.peer = new Peer(this.sessionId, {
			config: { iceServers: this.stunServers },
		});

		this.peer.on("open", (id) => {
			console.log("PeerJS connection established with ID:", id);
		});

		this.peer.on("error", (err) => {
			console.error("PeerJS error:", err);
		});

		this.peer.on("call", (call) => this.handleIncomingCall(call));

		// Set up room listener for media state changes if room is available
		if (this.room) {
			this.room.onMessage("media-state-change", (message: any) => {
				const { peerId, videoEnabled, audioEnabled } = message;
				this.handleRemoteMediaStateChange(
					peerId,
					videoEnabled,
					audioEnabled
				);
			});
		}
	}

	setRoom(room: any) {
		this.room = room;
		// Set up room listener for media state changes
		room.onMessage("media-state-change", (message: any) => {
			const { peerId, videoEnabled, audioEnabled } = message;
			this.handleRemoteMediaStateChange(
				peerId,
				videoEnabled,
				audioEnabled
			);
		});

		// Listen for removeVideo message to remove video element
		room.onMessage("removeVideo", (message: any) => {
			const { sessionId } = message;
			this.removeVideoElement(sessionId);
		});

		room.onMessage("playerJoined", (message: any) => {
			const { sessionId, name } = message;
			console.log(`Player joined:  (${name})`);

			// Optional: update state with player name
			if (!this.room.state.players[sessionId]) {
				this.room.state.players[sessionId] = { name };
			}

			// Try initiating connection if already initialized
			this.initiatePeerConnection(sessionId);
		});

		//
	}

	private handleRemoteMediaStateChange(
		peerId: string,
		videoEnabled: boolean,
		audioEnabled: boolean
	) {
		const videoEl = this.videoElements[peerId];
		if (videoEl) {
			const videoWrapper = document.getElementById(
				`video-wrapper-${peerId}`
			);
			if (videoWrapper) {
				// Update video state visual indicator
				let videoOffIndicator = document.getElementById(
					`video-off-indicator-${peerId}`
				);
				if (!videoEnabled) {
					if (!videoOffIndicator) {
						this.createVideoOffIndicator(peerId, videoWrapper);
					} else {
						videoOffIndicator.style.display = "flex";
					}
				} else if (videoOffIndicator) {
					videoOffIndicator.style.display = "none";
				}

				// Update audio state visual indicator
				const audioOffIcon = document.getElementById(
					`audio-icon-${peerId}`
				);
				if (audioOffIcon) {
					audioOffIcon.style.display = audioEnabled
						? "none"
						: "block";
				}
			}
		}
	}

	private createVideoOffIndicator(peerId: string, wrapper: HTMLElement) {
		const videoOffIndicator = document.createElement("div");
		videoOffIndicator.id = `video-off-indicator-${peerId}`;
		videoOffIndicator.classList.add("video-off-indicator");
		videoOffIndicator.innerHTML =
			'<div class="avatar-placeholder">👤</div>';
		videoOffIndicator.style.position = "absolute";
		videoOffIndicator.style.top = "0";
		videoOffIndicator.style.left = "0";
		videoOffIndicator.style.width = "100%";
		videoOffIndicator.style.height = "100%";
		videoOffIndicator.style.backgroundColor = "#1f2937";
		videoOffIndicator.style.display = "flex";
		videoOffIndicator.style.alignItems = "center";
		videoOffIndicator.style.justifyContent = "center";
		videoOffIndicator.style.zIndex = "5"; // Lower z-index so controls can appear above it
		videoOffIndicator.style.borderRadius = "4px";
		wrapper.appendChild(videoOffIndicator);
	}

	async setupLocalStream() {
		try {
			this.localStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});
			this.addVideoElement(this.sessionId, this.localStream, true);
			console.log("Local video stream setup complete");
		} catch (error) {
			console.error("Error accessing media devices:", error);
		}
	}

	initiatePeerConnection(remotePeerId: string) {
		if (!this.localStream || !this.peer) {
			console.error(
				"Cannot initiate peer connection: no local stream or peer"
			);
			return;
		}

		if (this.connections[remotePeerId]) {
			console.warn(`Peer connection already exists for ${remotePeerId}`);
			return;
		}

		try {
			console.log(`Initiating connection to peer: ${remotePeerId}`);
			const call = this.peer.call(remotePeerId, this.localStream);
			this.connections[remotePeerId] = call;

			call.on("stream", (remoteStream) => {
				console.log(`Received stream from peer: ${remotePeerId}`);
				this.addVideoElement(remotePeerId, remoteStream, false);
			});

			call.on("close", () => {
				console.log(`Connection closed with peer: ${remotePeerId}`);
				this.removeVideoElement(remotePeerId);
				delete this.connections[remotePeerId];
			});

			call.on("error", (err) => {
				console.error(`WebRTC error with ${remotePeerId}:`, err);
				this.removeVideoElement(remotePeerId);
				delete this.connections[remotePeerId];

				// Add retry logic
				if (
					!this.retryConnections[remotePeerId] ||
					this.retryConnections[remotePeerId] < 3
				) {
					this.retryConnections[remotePeerId] =
						(this.retryConnections[remotePeerId] || 0) + 1;
					console.log(
						`Retrying connection to ${remotePeerId}, attempt ${this.retryConnections[remotePeerId]}`
					);
					setTimeout(() => {
						this.initiatePeerConnection(remotePeerId);
					}, 2000);
				}
			});
		} catch (error) {
			console.error(
				`Error creating peer connection to ${remotePeerId}:`,
				error
			);
		}
	}

	private handleIncomingCall(call: MediaConnection) {
		if (!this.localStream) {
			console.warn("Cannot answer call: local stream not available");
			return;
		}

		call.answer(this.localStream);
		this.connections[call.peer] = call;

		call.on("stream", (remoteStream) => {
			console.log(`Received stream from peer: ${call.peer}`);
			// Add the remote video element when the stream is received
			this.addVideoElement(call.peer, remoteStream, false);
		});

		call.on("close", () => {
			console.log(`Connection closed with peer: ${call.peer}`);
			this.removeVideoElement(call.peer);
			delete this.connections[call.peer];
		});

		call.on("error", (err) => {
			console.error(`WebRTC error with ${call.peer}:`, err);
			this.removeVideoElement(call.peer);
			delete this.connections[call.peer];
		});
	}

	addVideoElement(peerId: string, stream: MediaStream, isLocal: boolean) {
		// Check if video element for this peer already exists
		if (this.videoElements[peerId]) {
			console.warn(`Video element for peer ${peerId} already exists.`);
			return; // Avoid adding the element again
		}

		const videoContainer = this.getVideoContainer();
		const videoWrapper = document.createElement("div");
		videoWrapper.classList.add("video-wrapper");
		videoWrapper.id = `video-wrapper-${peerId}`;

		const videoElement = document.createElement("video");
		videoElement.id = `video-${peerId}`;
		videoElement.srcObject = stream;
		videoElement.autoplay = true;
		videoElement.playsInline = true;
		videoElement.classList.add(
			"video-element",
			isLocal ? "local-video" : "remote-video"
		);

		if (isLocal) {
			videoElement.muted = true;
		}

		console.log(peerId);

		// Get player name from room state if available
		let playerName = this.room?.state?.players?.[peerId]?.name || peerId;
		console.log(this.room?.state.players); // Fallback to peerId if name is not available

		// Add player name to the video element
		const nameTag = document.createElement("div");
		nameTag.classList.add("video-name");
		nameTag.textContent = playerName; // You can replace peerId with player name if available
		nameTag.style.position = "absolute";
		nameTag.style.top = "5px";
		nameTag.style.left = "5px";
		nameTag.style.color = "white";
		nameTag.style.fontWeight = "bold";
		nameTag.style.fontSize = "14px";

		const controlsContainer = document.createElement("div");
		controlsContainer.classList.add("controls-container");

		const videoOffButton = document.createElement("button");
		videoOffButton.textContent = this.videoEnabled
			? "Video Off"
			: "Video On";
		videoOffButton.classList.add("video-control-btn");
		videoOffButton.onclick = () => {
			this.toggleVideo(stream, peerId);
		};

		const audioOffButton = document.createElement("button");
		audioOffButton.textContent = "Audio Off";
		audioOffButton.classList.add("audio-control-btn");
		audioOffButton.onclick = () => {
			this.toggleAudio(stream, peerId);
		};

		controlsContainer.appendChild(videoOffButton);
		controlsContainer.appendChild(audioOffButton);

		videoWrapper.appendChild(videoElement);
		videoWrapper.appendChild(nameTag); // Add name tag
		videoWrapper.appendChild(controlsContainer);
		videoContainer.appendChild(videoWrapper);

		this.videoElements[peerId] = videoElement; // Store reference to the video element

		// Check if video is still enabled and adjust visibility accordingly
		if (!this.videoEnabled && isLocal) {
			this.toggleVideo(stream, peerId, false); // Keep video off if it was previously disabled
		}
	}

	private toggleVideo(
		stream: MediaStream,
		peerId: string,
		sendUpdate = true
	) {
		const videoTrack = stream.getVideoTracks()[0];
		if (!videoTrack) return;

		if (peerId === this.sessionId) {
			// Local user toggle
			this.videoEnabled = !this.videoEnabled;
			videoTrack.enabled = this.videoEnabled;

			// Show/hide video-off indicator for local view
			const wrapper = document.getElementById(`video-wrapper-${peerId}`);
			let indicator = document.getElementById(
				`video-off-indicator-${peerId}`
			);

			// Update the button text
			const videoOffButton = document.querySelector(
				`#video-wrapper-${peerId} .video-control-btn`
			);
			if (videoOffButton) {
				videoOffButton.textContent = this.videoEnabled
					? "Video Off"
					: "Video On";
			}

			// Make sure the controls container remains visible
			const controlsContainer = document.querySelector(
				`#video-wrapper-${peerId} .controls-container`
			);
			if (controlsContainer) {
				(controlsContainer as HTMLElement).style.zIndex = "20";
				(controlsContainer as HTMLElement).style.opacity = "1"; // Make it more visible when video is off
			}

			if (!this.videoEnabled) {
				if (!indicator && wrapper) {
					this.createVideoOffIndicator(peerId, wrapper);
				} else if (indicator) {
					indicator.style.display = "flex";
				}
			} else if (indicator) {
				indicator.style.display = "none";
			}

			// Broadcast media state change to all peers
			if (this.room && sendUpdate) {
				this.room.send("media-state-change", {
					videoEnabled: this.videoEnabled,
					audioEnabled: this.audioEnabled,
				});
			}
		} else if (stream) {
			// This is for toggling remote streams which shouldn't normally happen
			// but we'll keep it for flexibility
			videoTrack.enabled = !videoTrack.enabled;
		}
	}

	private toggleAudio(
		stream: MediaStream,
		peerId: string,
		sendUpdate = true
	) {
		const audioTrack = stream.getAudioTracks()[0];
		if (!audioTrack) return;

		if (peerId === this.sessionId) {
			// Local user toggle
			this.audioEnabled = !this.audioEnabled;
			audioTrack.enabled = this.audioEnabled;

			// Update audio icon for local view
			const audioIcon = document.getElementById(`audio-icon-${peerId}`);
			if (audioIcon) {
				audioIcon.style.display = this.audioEnabled ? "none" : "block";
			}

			// Broadcast media state change to all peers
			if (this.room && sendUpdate) {
				this.room.send("media-state-change", {
					videoEnabled: this.videoEnabled,
					audioEnabled: this.audioEnabled,
				});
			}
		} else if (stream) {
			// This is for toggling remote streams which shouldn't normally happen
			// but we'll keep it for flexibility
			audioTrack.enabled = !audioTrack.enabled;
			this.updateAudioIcon(peerId, stream);
		}
	}

	handleIncomingAudioStatus(peerId: string, isEnabled: boolean) {
		const audioIcon = document.getElementById(`audio-icon-${peerId}`);
		if (audioIcon) {
			audioIcon.style.display = isEnabled ? "none" : "block";
		}
	}

	private updateAudioIcon(peerId: string, stream: MediaStream) {
		const audioIcon = document.getElementById(`audio-icon-${peerId}`);
		const audioTrack = stream.getTracks().find((t) => t.kind === "audio");
		if (audioIcon && audioTrack) {
			audioIcon.style.display = audioTrack.enabled ? "none" : "block";
		}
	}

	removeVideoElement(peerId: string) {
		const videoElement = this.videoElements[peerId];
		if (videoElement) {
			// Properly clean up stream
			const stream = videoElement.srcObject as MediaStream;
			if (stream) {
				// Don't stop tracks if it's our local stream
				if (peerId !== this.sessionId) {
					stream.getTracks().forEach((track) => track.stop());
				}
				videoElement.srcObject = null;
			}

			delete this.videoElements[peerId];
		}

		const videoWrapper = document.getElementById(`video-wrapper-${peerId}`);
		if (videoWrapper) {
			videoWrapper.remove();
		}

		// If this was not the local user, update the layout
		if (peerId !== this.sessionId) {
			this.updateVideoLayout();
		}

		console.log(`Video element removed for peer ID: ${peerId}`);
	}

	private isGridView = false;

	toggleGridView() {
		this.isGridView = !this.isGridView;
		const container = document.getElementById("video-container");
		const toggleBtn = document.querySelector(".view-toggle-btn");

		if (container) {
			if (this.isGridView) {
				container.classList.remove("video-compact");
				container.classList.add("video-grid-expanded");
				if (toggleBtn) toggleBtn.textContent = "Compact View";
			} else {
				container.classList.remove("video-grid-expanded");
				container.classList.add("video-compact");
				if (toggleBtn) toggleBtn.textContent = "Grid View";
			}
		}

		this.updateVideoLayout();
	}

	private updateVideoLayout() {
		const container = document.getElementById("video-container");
		if (!container) return;

		const participantCount = Object.keys(this.videoElements).length;

		// Update class based on participant count
		container.classList.remove(
			"one-participant",
			"two-participants",
			"three-participants",
			"four-participants",
			"many-participants"
		);

		if (participantCount <= 1) {
			container.classList.add("one-participant");
		} else if (participantCount === 2) {
			container.classList.add("two-participants");
		} else if (participantCount === 3) {
			container.classList.add("three-participants");
		} else {
			container.classList.add("many-participants");
		}

		// Show only the first two video elements unless in grid view
		const videoElements = Object.values(this.videoElements);
		videoElements.forEach((videoElement, index) => {
			const wrapper = videoElement.parentElement;
			if (wrapper) {
				if (this.isGridView || index < 2) {
					wrapper.style.display = "block"; // Show video
				} else {
					wrapper.style.display = "none"; // Hide video
				}
			}
		});
	}

	getVideoContainer(): HTMLElement {
		let container = document.getElementById("video-container");
		if (!container) {
			container = document.createElement("div");
			container.id = "video-container";
			container.className = "video-compact one-participant";

			const gameContainer = document.getElementById("game-container");
			if (gameContainer) {
				gameContainer.appendChild(container);
			} else {
				console.warn(
					"Game container not found. Appending to body as fallback."
				);
				document.body.appendChild(container);
			}

			// Add visible placeholder until videos are added

			// Add grid view toggle button
			let toggleContainer = document.querySelector(
				".view-toggle-container"
			);
			if (!toggleContainer) {
				toggleContainer = document.createElement("div");
				toggleContainer.className = "view-toggle-container";
				const toggleBtn = document.createElement("button");
				toggleBtn.className = "view-toggle-btn";
				toggleBtn.textContent = "Grid View";
				toggleBtn.onclick = () => this.toggleGridView();
				toggleContainer.appendChild(toggleBtn);
				document.body.appendChild(toggleContainer);
			}

			if (!document.getElementById("video-styles")) {
				const style = document.createElement("style");
				style.id = "video-styles";
				style.textContent = `
					.video-compact {
						position: fixed;
						top: 164px;
						right: 10px;
						display: flex;
						flex-direction: column;
						gap: 10px;
						z-index: 1000;
						max-height: 80vh;
						overflow-y: auto;
						border-radius: 8px;
						min-width: 260px;
						min-height: 150px;
					
					}
	
					.video-grid-expanded {
						position: fixed;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background: rgba(0, 0, 0, 0.9);
						display: grid;
						padding: 20px;
						gap: 10px;
						z-index: 1000;
						overflow: auto;
					}
	
					.one-participant .video-wrapper { width: 240px; height: 180px; }
					.two-participants .video-wrapper { width: 220px; height: 165px; }
					.three-participants .video-wrapper,
					.four-participants .video-wrapper { width: 200px; height: 150px; }
					.many-participants .video-wrapper { width: 180px; height: 135px; }
	
					.video-grid-expanded.one-participant,
					.video-grid-expanded.two-participants {
						grid-template-columns: 1fr;
						place-items: center;
					}
	
					.video-grid-expanded.three-participants,
					.video-grid-expanded.four-participants {
						grid-template-columns: repeat(2, 1fr);
					}
	
					.video-grid-expanded.many-participants {
						grid-template-columns: repeat(3, 1fr);
					}
	
					.video-grid-expanded .video-wrapper {
						width: 100%;
						height: 100%;
						max-width: 640px;
						max-height: 480px;
					}
	
					.video-wrapper {
						position: relative;
						border-radius: 8px;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: flex-end;
						padding: 5px;
						background: #1a1a1a;
						box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
						overflow: hidden;
					}
	
					.video-element {
						width: 100%;
						height: 100%;
						object-fit: cover;
						border-radius: 4px;
						background-color: #2d3748;
					}
	
					.local-video {
						border: 2px solid #22c55e;
					}
	
					.remote-video {
						border: 2px solid #3b82f6;
					}
	
					.controls-container {
						position: absolute;
						bottom: 8px;
						display: flex;
						gap: 8px;
						background: rgba(0, 0, 0, 0.5);
						padding: 5px;
						border-radius: 20px;
						opacity: 0.7;
						transition: opacity 0.3s;
						z-index: 20;
					}
	
					.video-wrapper:hover .controls-container {
						opacity: 1;
					}
	
					.controls-container button {
						color: white;
						border: none;
						padding: 6px 10px;
						border-radius: 20px;
						cursor: pointer;
						font-size: 12px;
						display: flex;
						align-items: center;
						justify-content: center;
						background: #4b5563;
					}
	
					.video-control-btn {
						background: #7c3aed !important;
					}
	
					.audio-control-btn {
						background: #2563eb !important;
					}
	
					.controls-container button:hover {
						transform: scale(1.05);
					}
	
					.audio-off-icon {
						position: absolute;
						top: 8px;
						right: 8px;
						font-size: 16px;
						color: #ef4444;
						background: rgba(0, 0, 0, 0.5);
						border-radius: 50%;
						width: 24px;
						height: 24px;
						display: flex;
						align-items: center;
						justify-content: center;
					}
	
					.view-toggle-container {
						position: fixed;
						bottom: 20px;
						right: 30px;
						z-index: 1001;
					}
	
					.view-toggle-btn {
						background: #3b82f6;
						color: white;
						border: none;
						padding: 10px 16px;
						border-radius: 20px;
						cursor: pointer;
						font-weight: 500;
						display: flex;
						align-items: center;
						box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
					}
	
					.view-toggle-btn:hover {
						background: #2563eb;
					}
	
					.avatar-placeholder {
						font-size: 48px;
						color: #9ca3af;
					}
				`;
				document.head.appendChild(style);
			}
		}

		return container;
	}

	shutdown() {
		if (this.peer) {
			this.peer.destroy();
			this.peer = null;
		}

		Object.values(this.connections).forEach((conn) => {
			if (conn && typeof conn.close === "function") {
				conn.close();
			}
		});
		this.connections = {};

		// Stop all media tracks (camera and microphone)
		if (this.localStream) {
			this.localStream.getTracks().forEach((track) => track.stop());
			this.localStream = null;
		}

		// Clean up video elements
		Object.keys(this.videoElements).forEach(
			this.removeVideoElement.bind(this)
		);
		this.videoElements = {};

		// Remove the video container
		const videoContainer = document.getElementById("video-container");
		if (videoContainer) {
			videoContainer.remove();
		}

		// Remove the video styles
		const videoStyles = document.getElementById("video-styles");
		if (videoStyles) {
			videoStyles.remove();
		}

		// Remove the grid view toggle button
		const toggleContainer = document.querySelector(
			".view-toggle-container"
		);
		if (toggleContainer) {
			toggleContainer.remove();
		}

		// Remove any extra buttons or elements
		const extraButtons = document.querySelectorAll(
			".video-control-btn, .audio-control-btn"
		);
		extraButtons.forEach((button) => button.remove());
	}
}
