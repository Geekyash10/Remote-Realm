import Phaser from "phaser";
import { JoystickPlugin } from "../../components/JoystickPlugin";

declare global {
	namespace Phaser.GameObjects {
		interface GameObjectFactory {
			player(
				x: number,
				y: number,
				texture: string,
				frame?: string | number
			): Player;
		}
	}
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
	private lastDirection: string = "down";

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		texture: string,
		frame?: string | number
	) {
		super(scene, x, y, texture, frame);
		this.setDepth(y);
	}

	update(
		cursors: Phaser.Types.Input.Keyboard.CursorKeys,
		joystick?: JoystickPlugin
	) {
		const speed = 200;
		let vx = 0;
		let vy = 0;

		// Handle keyboard input
		if (cursors) {
			if (cursors.left?.isDown) {
				vx -= speed;
			}
			if (cursors.right?.isDown) {
				vx += speed;
			}
			if (cursors.up?.isDown) {
				vy -= speed;
			}
			if (cursors.down?.isDown) {
				vy += speed;
			}
		}

		// Handle joystick input (if available)
		if (joystick && joystick.active) {
			vx = joystick.direction.x * speed;
			vy = joystick.direction.y * speed;
		}

		// Determine last direction for animation
		if (Math.abs(vx) > Math.abs(vy)) {
			this.lastDirection = vx < 0 ? "left" : "right";
		} else if (Math.abs(vy) > 0) {
			this.lastDirection = vy < 0 ? "up" : "down";
		}

		// Apply movement
		this.setVelocity(vx, vy);
		if (this.body && (Math.abs(vx) > 0 || Math.abs(vy) > 0)) {
			this.body.velocity.setLength(speed);
		}

		// Update depth for proper layering
		this.setDepth(this.y);

		// Update animation
		if (vx !== 0 || vy !== 0) {
			this.play(`player_run_${this.lastDirection}`, true);
		} else {
			this.play(`player_idle_${this.lastDirection}`, true);
		}
	}
}

Phaser.GameObjects.GameObjectFactory.register(
	"player",
	function (
		this: Phaser.GameObjects.GameObjectFactory,
		x: number,
		y: number,
		texture: string,
		frame?: string | number
	) {
		const sprite = new Player(this.scene, x, y, texture, frame);
		this.displayList.add(sprite);
		this.updateList.add(sprite);
		this.scene.physics.world.enableBody(
			sprite,
			Phaser.Physics.Arcade.DYNAMIC_BODY
		);
		const bodyScale = [0.4, 0.2];
		if (sprite.body) {
			sprite.body.setSize(
				sprite.width * bodyScale[0],
				sprite.height * bodyScale[1]
			);
			sprite.body.setOffset(
				16 * (1 - bodyScale[0]),
				48 * (1 - bodyScale[1])
			);
		}
		return sprite;
	}
);
