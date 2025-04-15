export class UIHelpers {
	/**
	 * Creates a name tag element to display over video elements
	 */
	static createNameTag(name: string): HTMLDivElement {
		const nameTag = document.createElement("div");
		nameTag.classList.add("name-tag");
		nameTag.textContent = name;
		nameTag.style.position = "absolute";
		nameTag.style.top = "5px";
		nameTag.style.left = "5px";
		nameTag.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
		nameTag.style.color = "white";
		nameTag.style.padding = "5px 10px";
		nameTag.style.borderRadius = "4px";
		nameTag.style.fontSize = "14px";
		nameTag.style.zIndex = "10";
		return nameTag;
	}

	/**
	 * Creates a controls container with video and audio toggle buttons
	 */
	static createControlsContainer(
		peerId: string,
		videoEnabled: boolean,
		onVideoToggle: () => void,
		onAudioToggle: () => void
	): HTMLDivElement {
		const controlsContainer = document.createElement("div");
		controlsContainer.classList.add("controls-container");
		controlsContainer.style.position = "absolute";
		controlsContainer.style.bottom = "10px";
		controlsContainer.style.right = "40px";
		controlsContainer.style.display = "flex";
		controlsContainer.style.gap = "10px";
		controlsContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
		controlsContainer.style.padding = "5px";
		controlsContainer.style.borderRadius = "4px";
		controlsContainer.style.zIndex = "10";

		// Video toggle button
		const videoToggleBtn = document.createElement("button");
		videoToggleBtn.classList.add("video-control-btn");
		videoToggleBtn.textContent = videoEnabled ? "Video Off" : "Video On";
		videoToggleBtn.style.backgroundColor = "#2D3748";
		videoToggleBtn.style.color = "white";
		videoToggleBtn.style.border = "none";
		videoToggleBtn.style.borderRadius = "4px";
		videoToggleBtn.style.padding = "5px 10px";
		videoToggleBtn.style.cursor = "pointer";
		videoToggleBtn.addEventListener("click", onVideoToggle);

		// Audio toggle button
		const audioToggleBtn = document.createElement("button");
		audioToggleBtn.classList.add("audio-control-btn");
		audioToggleBtn.textContent = "Mute";
		audioToggleBtn.style.backgroundColor = "#2D3748";
		audioToggleBtn.style.color = "white";
		audioToggleBtn.style.border = "none";
		audioToggleBtn.style.borderRadius = "4px";
		audioToggleBtn.style.padding = "5px 10px";
		audioToggleBtn.style.cursor = "pointer";
		audioToggleBtn.addEventListener("click", onAudioToggle);

		// Audio muted icon (hidden by default)
		const audioIcon = document.createElement("div");
		audioIcon.id = `audio-icon-${peerId}`;
		audioIcon.textContent = "🔇"; // Muted icon
		audioIcon.style.position = "absolute";
		audioIcon.style.top = "-105px";
		audioIcon.style.right = "-23px";
		audioIcon.style.backgroundColor = "rgba(255, 0, 0, 0.7)";
		audioIcon.style.color = "white";
		audioIcon.style.padding = "5px";
		audioIcon.style.borderRadius = "50%";
		audioIcon.style.display = "none"; // Hidden by default
		audioIcon.style.zIndex = "15";

		controlsContainer.appendChild(videoToggleBtn);
		controlsContainer.appendChild(audioToggleBtn);
		controlsContainer.appendChild(audioIcon);

		return controlsContainer;
	}

	/**
	 * Creates a video-off indicator for when video is disabled
	 */
	static createVideoOffIndicator(
		peerId: string,
		parentElement: HTMLElement
	): HTMLDivElement {
		const videoOffIndicator = document.createElement("div");
		videoOffIndicator.id = `video-off-indicator-${peerId}`;
		videoOffIndicator.classList.add("video-off-indicator");
		videoOffIndicator.style.position = "absolute";
		videoOffIndicator.style.top = "0";
		videoOffIndicator.style.left = "0";
		videoOffIndicator.style.width = "100%";
		videoOffIndicator.style.height = "100%";
		videoOffIndicator.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
		videoOffIndicator.style.color = "white";
		videoOffIndicator.style.display = "flex";
		videoOffIndicator.style.justifyContent = "center";
		videoOffIndicator.style.alignItems = "center";
		videoOffIndicator.style.zIndex = "5";

		// Add a camera off icon
		const cameraIcon = document.createElement("div");
		cameraIcon.textContent = "📵"; // No camera icon
		cameraIcon.style.fontSize = "3rem";

		videoOffIndicator.appendChild(cameraIcon);
		parentElement.appendChild(videoOffIndicator);

		return videoOffIndicator;
	}

	/**
	 * Creates a loading indicator
	 */
	static createLoadingIndicator(
		message: string = "Connecting..."
	): HTMLDivElement {
		const loadingIndicator = document.createElement("div");
		loadingIndicator.classList.add("loading-indicator");
		loadingIndicator.style.position = "fixed";
		loadingIndicator.style.top = "50%";
		loadingIndicator.style.left = "50%";
		loadingIndicator.style.transform = "translate(-50%, -50%)";
		loadingIndicator.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
		loadingIndicator.style.color = "white";
		loadingIndicator.style.padding = "20px";
		loadingIndicator.style.borderRadius = "10px";
		loadingIndicator.style.display = "flex";
		loadingIndicator.style.flexDirection = "column";
		loadingIndicator.style.alignItems = "center";
		loadingIndicator.style.zIndex = "1000";

		const spinnerDiv = document.createElement("div");
		spinnerDiv.classList.add("spinner");
		spinnerDiv.style.border = "5px solid rgba(255, 255, 255, 0.3)";
		spinnerDiv.style.borderTop = "5px solid white";
		spinnerDiv.style.borderRadius = "50%";
		spinnerDiv.style.width = "40px";
		spinnerDiv.style.height = "40px";
		spinnerDiv.style.animation = "spin 1s linear infinite";

		// Add keyframes for spinner animation
		const style = document.createElement("style");
		style.innerHTML = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
		document.head.appendChild(style);

		const messageDiv = document.createElement("div");
		messageDiv.textContent = message;
		messageDiv.style.marginTop = "10px";

		loadingIndicator.appendChild(spinnerDiv);
		loadingIndicator.appendChild(messageDiv);

		return loadingIndicator;
	}

	/**
	 * Creates an error message dialog
	 */
	static createErrorDialog(
		message: string,
		onClose?: () => void
	): HTMLDivElement {
		const overlay = document.createElement("div");
		overlay.style.position = "fixed";
		overlay.style.top = "0";
		overlay.style.left = "0";
		overlay.style.width = "100%";
		overlay.style.height = "100%";
		overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
		overlay.style.display = "flex";
		overlay.style.justifyContent = "center";
		overlay.style.alignItems = "center";
		overlay.style.zIndex = "2000";

		const dialog = document.createElement("div");
		dialog.style.backgroundColor = "white";
		dialog.style.padding = "20px";
		dialog.style.borderRadius = "5px";
		dialog.style.maxWidth = "400px";
		dialog.style.width = "80%";
		dialog.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";

		const title = document.createElement("h3");
		title.textContent = "Error";
		title.style.margin = "0 0 15px 0";
		title.style.color = "#E53E3E";

		const messageEl = document.createElement("p");
		messageEl.textContent = message;
		messageEl.style.margin = "0 0 20px 0";

		const closeButton = document.createElement("button");
		closeButton.textContent = "Close";
		closeButton.style.backgroundColor = "#2D3748";
		closeButton.style.color = "white";
		closeButton.style.border = "none";
		closeButton.style.borderRadius = "4px";
		closeButton.style.padding = "8px 16px";
		closeButton.style.cursor = "pointer";
		closeButton.style.float = "right";
		closeButton.onclick = () => {
			document.body.removeChild(overlay);
			if (onClose) onClose();
		};

		dialog.appendChild(title);
		dialog.appendChild(messageEl);
		dialog.appendChild(closeButton);
		overlay.appendChild(dialog);

		return overlay;
	}

	/**
	 * Creates a notification that appears temporarily
	 */
	static showNotification(message: string, duration: number = 3000): void {
		const notification = document.createElement("div");
		notification.textContent = message;
		notification.style.position = "fixed";
		notification.style.top = "20px";
		notification.style.right = "20px";
		notification.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
		notification.style.color = "white";
		notification.style.padding = "10px 20px";
		notification.style.borderRadius = "5px";
		notification.style.zIndex = "1500";
		notification.style.transition = "opacity 0.5s ease-in-out";

		document.body.appendChild(notification);

		// Fade out and remove
		setTimeout(() => {
			notification.style.opacity = "0";
			setTimeout(() => {
				if (notification.parentNode) {
					document.body.removeChild(notification);
				}
			}, 500);
		}, duration);
	}

	/**
	 * Handles adding CSS styles to the document
	 */
	static addGlobalStyles(): void {
		const style = document.createElement("style");
		style.textContent = `
            .video-wrapper {
                position: relative;
                overflow: hidden;
                border-radius: 8px;
                background-color: #1A202C;
            }
            
            .video-element {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .local-video {
                transform: scaleX(-1); /* Mirror local video */
            }
            
            .controls-container {
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .video-wrapper:hover .controls-container {
                opacity: 1;
            }
            
            .video-control-btn:hover, .audio-control-btn:hover {
                background-color: #4A5568 !important;
            }
            
            @media (max-width: 768px) {
                .controls-container {
                    opacity: 1; /* Always show controls on mobile */
                }
            }
        `;
		document.head.appendChild(style);
	}
}
