import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomeScreen from "./Layouts/HomeScreen";
import Room from "./Layouts/Room";

import "./App.css";

function App() {
	return (
		<BrowserRouter>
			<Routes>
				{/* Redirect root to home */}

				{/* Main routes */}
				<Route path="/home" element={<HomeScreen />} />
				<Route path="/room" element={<Room />} />

				{/* 404 - Catch any unmatched routes */}
				<Route path="*" element={<Navigate to="/home" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
export default App;