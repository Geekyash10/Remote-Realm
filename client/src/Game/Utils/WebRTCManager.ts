import Peer, { MediaConnection } from "peerjs";
import { VideoLayoutManager } from "./VideoLayoutManager";
import { ScreenShareManager } from "./ScreenShareManager";
import { UIHelpers } from "./UIHelpers";

export class WebRTCManager {
	private peer: Peer | null = null;
	private localStream: MediaStream | null = null;
	private connections: Record<string, MediaConnection> = {};
	private videoElements: Record<string, HTMLVideoElement> = {};
	private retryConnections: Record<string, number> = {};
	private videoEnabled: boolean = true;
	private audioEnabled: boolean = true;
	private room: any; // Reference to Colyseus room
	private videoLayoutManager: VideoLayoutManager;
	private screenShareManager: ScreenShareManager;

	constructor(
		private sessionId: string,
		private stunServers: RTCIceServer[] = [],
		room?: any
	) {
		if (room) {
			this.room = room;
		}
		this.videoLayoutManager = new VideoLayoutManager(this);
		this.screenShareManager = new ScreenShareManager(
			this,
			this.sessionId,
			this.room
		);
	}

	async initialize() {
		this.peer = new Peer(this.sessionId, {
			config: { iceServers: this.stunServers },
		});

		this.peer.on("open", (id) => {
			console.log("PeerJS connection established with ID:", id);
			this.screenShareManager.setupKeyboardShortcuts();
		});

		this.peer.on("error", (err) => {
			console.error("PeerJS error:", err);
		});

		this.peer.on("call", (call) => this.handleIncomingCall(call));

		// Set up room listener for media state changes if room is available
		this.setupRoomListeners();
	}

	setRoom(room: any) {
		this.room = room;
		this.screenShareManager.setRoom(room);
		this.setupRoomListeners();
	}

	private setupRoomListeners() {
		if (!this.room) return;

		// Listen for media state changes
		this.room.onMessage("media-state-change", (message: any) => {
			const { peerId, videoEnabled, audioEnabled } = message;
			this.handleRemoteMediaStateChange(
				peerId,
				videoEnabled,
				audioEnabled
			);
		});

		// Listen for removeVideo message to remove video element
		this.room.onMessage("removeVideo", (message: any) => {
			const { sessionId } = message;
			this.removeVideoElement(sessionId);
		});

		this.room.onMessage("playerJoined", (message: any) => {
			const { sessionId, name } = message;
			console.log(`Player joined: (${name})`);

			// Optional: update state with player name
			if (!this.room.state.players[sessionId]) {
				this.room.state.players[sessionId] = { name };
			}

			// Try initiating connection if already initialized
			this.initiatePeerConnection(sessionId);
		});
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
						UIHelpers.createVideoOffIndicator(peerId, videoWrapper);
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

	handleIncomingCall(call: MediaConnection) {
		if (!this.localStream) {
			console.warn("Cannot answer call: local stream not available");
			return;
		}
		const isScreenShare = call.metadata?.type === "screen";
		if (isScreenShare) {
			// Handle incoming screen share
			this.screenShareManager.handleIncomingScreenShareCall(call);
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

		const videoContainer = this.videoLayoutManager.getVideoContainer();
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

		// Get player name from room state if available
		let playerName = this.room?.state?.players?.[peerId]?.name || peerId;

		// Add player name to the video element
		const nameTag = UIHelpers.createNameTag(playerName);

		const controlsContainer = UIHelpers.createControlsContainer(
			peerId,
			this.videoEnabled,
			() => this.toggleVideo(stream, peerId),
			() => this.toggleAudio(stream, peerId)
		);

		videoWrapper.appendChild(videoElement);
		videoWrapper.appendChild(nameTag);
		videoWrapper.appendChild(controlsContainer);
		videoContainer.appendChild(videoWrapper);

		this.videoElements[peerId] = videoElement; // Store reference to the video element

		// Check if video is still enabled and adjust visibility accordingly
		if (!this.videoEnabled && isLocal) {
			this.toggleVideo(stream, peerId, false); // Keep video off if it was previously disabled
		}

		this.videoLayoutManager.updateVideoLayout();
	}

	toggleVideo(stream: MediaStream, peerId: string, sendUpdate = true) {
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
					UIHelpers.createVideoOffIndicator(peerId, wrapper);
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

	toggleAudio(stream: MediaStream, peerId: string, sendUpdate = true) {
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

		// Update the layout after removing a video element
		this.videoLayoutManager.updateVideoLayout();

		console.log(`Video element removed for peer ID: ${peerId}`);
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

		// Stop screen sharing if active
		this.screenShareManager.stopScreenShare();

		// Clean up video elements
		Object.keys(this.videoElements).forEach(
			this.removeVideoElement.bind(this)
		);
		this.videoElements = {};

		// Let VideoLayoutManager handle UI cleanup
		this.videoLayoutManager.cleanup();
	}

	// Accessor methods for other classes
	getPeer() {
		return this.peer;
	}

	getLocalStream() {
		return this.localStream;
	}

	getConnections() {
		return this.connections;
	}

	getVideoElements() {
		return this.videoElements;
	}

	getSessionId() {
		return this.sessionId;
	}

	getRoom() {
		return this.room;
	}
}
