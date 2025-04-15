export class VideoLayoutManager {
	private isGridView = false;
	private webRTCManager: any;

	constructor(webRTCManager: any) {
		this.webRTCManager = webRTCManager;
	}

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

	updateVideoLayout() {
		const container = document.getElementById("video-container");
		if (!container) return;

		const participantCount = Object.keys(
			this.webRTCManager.getVideoElements()
		).length;

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
		const videoElements = Object.values(
			this.webRTCManager.getVideoElements()
		);
		videoElements.forEach((videoElement: any, index) => {
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

			this.addVideoStyles();
		}

		return container;
	}

	private addVideoStyles() {
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
                    bottom: 10px;
                    right: 40px;
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

	cleanup() {
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
