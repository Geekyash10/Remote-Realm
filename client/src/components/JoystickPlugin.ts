import Phaser from "phaser";

export class JoystickPlugin extends Phaser.Plugins.ScenePlugin {
	private joystick: Phaser.GameObjects.Image | null = null;
	private joystickBase: Phaser.GameObjects.Image | null = null;
	private joystickRadius: number = 60;
	private dragStart: Phaser.Math.Vector2 | null = null;
	private dragVector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
	private isActive: boolean = false;
	private externalContainer: HTMLElement | null = null;
	private externalJoystick: HTMLElement | null = null;
	private externalBase: HTMLElement | null = null;
	private useExternal: boolean = false;

	constructor(
		scene: Phaser.Scene,
		pluginManager: Phaser.Plugins.PluginManager
	) {
		super(scene, pluginManager, "JoystickPlugin");
	}

	boot() {
		this.scene?.load.once("complete", this.createJoystick, this);
	}

	createJoystick() {
		// Check if already initialized
		if (this.joystick || this.externalJoystick) return;

		// Create joystick base
		this.joystickBase = this.scene!.add.image(
			100,
			this.scene!.cameras.main.height - 100,
			"joystick-base"
		)
			.setAlpha(0.5)
			.setDepth(1000)
			.setScrollFactor(0)
			.setInteractive();

		// Create joystick thumb
		if (this.scene) {
			this.joystick = this.scene.add
				.image(
					100,
					this.scene.cameras.main.height - 100,
					"joystick-thumb"
				)
				.setDepth(1001)
				.setScrollFactor(0);
		}

		// Setup touch events
		if (this.scene && this.scene.input) {
			this.scene.input.on("pointerdown", this.onPointerDown, this);
			this.scene.input.on("pointermove", this.onPointerMove, this);
			this.scene.input.on("pointerup", this.onPointerUp, this);
		}
	}

	createExternalJoystick() {
		// Create container div for the joystick
		const container = document.createElement("div");
		container.id = "external-joystick-container";
		container.style.position = "fixed";
		container.style.bottom = "100px";
		container.style.right = "5px";
		container.style.width = "100px";
		container.style.height = "100px";
		container.style.zIndex = "1000";
		container.style.pointerEvents = "auto";
		document.body.appendChild(container);

		// Create base image
		const base = document.createElement("div");
		base.style.position = "absolute";
		base.style.width = "100%";
		base.style.height = "100%";
		base.style.borderRadius = "50%";
		base.style.backgroundColor = "rgba(50, 50, 50, 0.5)";
		base.style.border = "2px solid rgba(100, 100, 100, 0.7)";
		container.appendChild(base);

		// Create thumb image
		const thumb = document.createElement("div");
		thumb.style.position = "absolute";
		thumb.style.width = "50%";
		thumb.style.height = "50%";
		thumb.style.left = "25%";
		thumb.style.top = "25%";
		thumb.style.borderRadius = "50%";
		thumb.style.backgroundColor = "rgba(100, 100, 100, 0.8)";
		thumb.style.border = "2px solid rgba(150, 150, 150, 0.9)";
		container.appendChild(thumb);

		// Store references
		this.externalContainer = container;
		this.externalBase = base;
		this.externalJoystick = thumb;
		this.useExternal = true;

		// Add event listeners
		container.addEventListener(
			"touchstart",
			this.onExternalTouchStart.bind(this)
		);
		container.addEventListener(
			"mousedown",
			this.onExternalTouchStart.bind(this)
		);
		document.addEventListener(
			"touchmove",
			this.onExternalTouchMove.bind(this),
			{ passive: false }
		);
		document.addEventListener(
			"mousemove",
			this.onExternalTouchMove.bind(this)
		);
		document.addEventListener(
			"touchend",
			this.onExternalTouchEnd.bind(this)
		);
		document.addEventListener(
			"mouseup",
			this.onExternalTouchEnd.bind(this)
		);

		// Hide the in-game joystick if exists
		if (this.joystick && this.joystickBase) {
			this.joystick.setVisible(false);
			this.joystickBase.setVisible(false);
		}
	}

	private onExternalTouchStart(event: TouchEvent | MouseEvent) {
		event.preventDefault();
		if (!this.externalContainer || !this.externalJoystick) return;

		this.isActive = true;
		this.onExternalTouchMove(event);
	}

	private onExternalTouchMove(event: TouchEvent | MouseEvent) {
		event.preventDefault();
		if (!this.isActive || !this.externalContainer || !this.externalJoystick)
			return;

		// Get touch/mouse position
		let clientX: number, clientY: number;

		if ("touches" in event && event.touches.length > 0) {
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		} else if ("clientX" in event) {
			clientX = event.clientX;
			clientY = event.clientY;
		} else {
			return;
		}

		// Get container position and dimensions
		const rect = this.externalContainer.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const maxRadius = rect.width / 2;

		// Calculate distance from center
		let dx = clientX - centerX;
		let dy = clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		// Limit to container radius
		if (distance > maxRadius) {
			dx = (dx / distance) * maxRadius;
			dy = (dy / distance) * maxRadius;
		}

		// Update thumb position
		if (this.externalJoystick) {
			const thumbHalfSize =
				parseInt(this.externalJoystick.style.width) / 2;
			this.externalJoystick.style.left = `${
				rect.width / 2 + dx - thumbHalfSize
			}px`;
			this.externalJoystick.style.top = `${
				rect.height / 2 + dy - thumbHalfSize
			}px`;
		}

		// Update direction vector (normalized)
		this.dragVector.x = dx / maxRadius;
		this.dragVector.y = dy / maxRadius;
	}

	private onExternalTouchEnd(event: TouchEvent | MouseEvent) {
		if (!this.externalJoystick) return;

		// Reset joystick position
		this.isActive = false;
		this.externalJoystick.style.left = "25%";
		this.externalJoystick.style.top = "25%";
		this.dragVector.x = 0;
		this.dragVector.y = 0;
	}

	private onPointerDown(pointer: Phaser.Input.Pointer) {
		if (this.useExternal || !this.joystickBase || !this.joystick) return;

		// Only activate joystick if we click on the base or near it
		const distance = Phaser.Math.Distance.Between(
			pointer.x,
			pointer.y,
			this.joystickBase.x,
			this.joystickBase.y
		);

		if (distance <= this.joystickRadius * 1.5) {
			this.isActive = true;
			this.dragStart = new Phaser.Math.Vector2(pointer.x, pointer.y);
			this.onPointerMove(pointer);
		}
	}

	private onPointerMove(pointer: Phaser.Input.Pointer) {
		if (
			this.useExternal ||
			!this.isActive ||
			!this.joystick ||
			!this.joystickBase ||
			!this.dragStart
		)
			return;

		// Calculate joystick position
		let dx = pointer.x - this.joystickBase.x;
		let dy = pointer.y - this.joystickBase.y;

		// Normalize and limit distance
		const length = Math.sqrt(dx * dx + dy * dy);
		if (length > this.joystickRadius) {
			dx = (dx * this.joystickRadius) / length;
			dy = (dy * this.joystickRadius) / length;
		}

		// Update joystick position
		this.joystick.x = this.joystickBase.x + dx;
		this.joystick.y = this.joystickBase.y + dy;

		// Calculate direction vector (normalized)
		if (length > 0) {
			this.dragVector.x = dx / this.joystickRadius;
			this.dragVector.y = dy / this.joystickRadius;
		} else {
			this.dragVector.x = 0;
			this.dragVector.y = 0;
		}
	}

	private onPointerUp() {
		if (this.useExternal || !this.joystick || !this.joystickBase) return;

		// Reset joystick position
		this.isActive = false;
		this.joystick.x = this.joystickBase.x;
		this.joystick.y = this.joystickBase.y;
		this.dragVector.x = 0;
		this.dragVector.y = 0;
	}

	get direction(): Phaser.Math.Vector2 {
		return this.dragVector;
	}

	get active(): boolean {
		return this.isActive;
	}

	get angle(): number {
		return Math.atan2(this.dragVector.y, this.dragVector.x);
	}

	get force(): number {
		return this.dragVector.length();
	}

	setPosition(x: number, y: number): this {
		if (this.useExternal && this.externalContainer) {
			this.externalContainer.style.left = `${x - 60}px`;
			this.externalContainer.style.bottom = `${y}px`;
		} else if (this.joystick && this.joystickBase) {
			this.joystickBase.x = x;
			this.joystickBase.y = y;

			// Only update joystick position if not active
			if (!this.isActive) {
				this.joystick.x = x;
				this.joystick.y = y;
			}
		}
		return this;
	}

	setVisible(visible: boolean): this {
		if (this.useExternal && this.externalContainer) {
			this.externalContainer.style.display = visible ? "block" : "none";
		} else if (this.joystick && this.joystickBase) {
			this.joystick.setVisible(visible);
			this.joystickBase.setVisible(visible);
		}
		return this;
	}

	setAlpha(alpha: number): this {
		if (this.useExternal && this.externalContainer) {
			this.externalContainer.style.opacity = alpha.toString();
		} else if (this.joystick && this.joystickBase) {
			this.joystick.setAlpha(alpha);
			this.joystickBase.setAlpha(alpha * 0.7);
		}
		return this;
	}

	shutdown() {
		// Remove external joystick if exists
		if (
			this.externalContainer &&
			document.body.contains(this.externalContainer)
		) {
			document.body.removeChild(this.externalContainer);

			// Remove event listeners
			document.removeEventListener(
				"touchmove",
				this.onExternalTouchMove.bind(this)
			);
			document.removeEventListener(
				"mousemove",
				this.onExternalTouchMove.bind(this)
			);
			document.removeEventListener(
				"touchend",
				this.onExternalTouchEnd.bind(this)
			);
			document.removeEventListener(
				"mouseup",
				this.onExternalTouchEnd.bind(this)
			);
		}

		// Clean up in-game joystick
		if (this.scene) {
			this.scene.input.off("pointerdown", this.onPointerDown, this);
			this.scene.input.off("pointermove", this.onPointerMove, this);
			this.scene.input.off("pointerup", this.onPointerUp, this);
		}

		this.joystick = null;
		this.joystickBase = null;
		this.externalContainer = null;
		this.externalJoystick = null;
		this.externalBase = null;
	}
}
