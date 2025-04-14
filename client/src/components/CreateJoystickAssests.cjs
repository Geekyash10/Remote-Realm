const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

// Create joystick base
function createJoystickBase() {
	const canvas = createCanvas(120, 120);
	const ctx = canvas.getContext("2d");

	// Transparent background
	ctx.clearRect(0, 0, 120, 120);

	// Draw outer circle (light blue outer glow)
	ctx.beginPath();
	ctx.arc(60, 60, 60, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(0, 122, 255, 0.3)";
	ctx.fill();

	// Draw inner circle (white ring)
	ctx.beginPath();
	ctx.arc(60, 60, 55, 0, Math.PI * 2);
	ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
	ctx.lineWidth = 2;
	ctx.stroke();

	// Save to file
	const buffer = canvas.toBuffer("image/png");
	fs.writeFileSync(
		path.join(__dirname, "assets/ui/joystick-base.png"),
		buffer
	);
	console.log("Created joystick-base.png");
}

// Create joystick thumb
function createJoystickThumb() {
	const canvas = createCanvas(60, 60);
	const ctx = canvas.getContext("2d");

	// Transparent background
	ctx.clearRect(0, 0, 60, 60);

	// Draw outer circle (blue base)
	ctx.beginPath();
	ctx.arc(30, 30, 30, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(0, 122, 255, 0.9)";
	ctx.fill();

	// Draw inner circle (white center)
	ctx.beginPath();
	ctx.arc(30, 30, 25, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
	ctx.fill();

	// Add highlight (light blue shine)
	ctx.beginPath();
	ctx.arc(24, 24, 10, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(173, 216, 230, 0.6)";
	ctx.fill();

	// Save to file
	const buffer = canvas.toBuffer("image/png");
	fs.writeFileSync(
		path.join(__dirname, "assets/ui/joystick-thumb.png"),
		buffer
	);
	console.log("Created joystick-thumb.png");
}

// Make sure the directory exists
const dir = path.join(__dirname, "assets/ui");
if (!fs.existsSync(dir)) {
	fs.mkdirSync(dir, { recursive: true });
}

// Create both assets
createJoystickBase();
createJoystickThumb();
