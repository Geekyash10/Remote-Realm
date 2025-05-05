import express from "express";
import { createServer } from "http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Server } from "colyseus";
import { MyRoom } from "./rooms/room";
import mongoose from "mongoose";
import { RoomModel } from "./models/roomModel";
import cors from "cors";
import dotenv from "dotenv";
import { monitor } from "@colyseus/monitor";

dotenv.config();

const database: string | undefined = process.env.DATABASE_URL;
if (!database) {
	throw new Error("DATABASE_URL is not defined in the environment variables");
}
mongoose
	.connect(database, {})
	.then(() => console.log("Connected to MongoDB!"))
	.catch((err) => console.error("MongoDB Connection Error:", err));
const app = express();
app.use(
	cors({
		origin: "*", // no wildcard!
		credentials: true,
	})
);
const server = createServer(app);
// create colyseus game server
const gameServer = new Server({
	transport: new WebSocketTransport({
		server,
		// Removed invalid 'cors' property
	}),
});

// Define the game room
gameServer.define("game", MyRoom);

app.use("/colyseus", monitor());

app.get("/", (req, res) => {
	res.send("Colyseus Server Running!");
});

// for requesting the private rooms
app.get("/privateRooms", async (req, res) => {
	console.log("HIT");
	const rooms = await RoomModel.find({ isPrivate: true });
	console.log(rooms);
	res.send(rooms);
});

const PORT = 3000;
server.listen(PORT, "0.0.0.0", () => {
	console.log(`Server is running on ws://localhost:${PORT}`);
	console.log(
		`Colyseus Monitor is running on http://localhost:${PORT}/colyseus`
	);
});
