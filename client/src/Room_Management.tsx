import { useState, useEffect } from "react";
import { Client, Room } from "colyseus.js";
import { Building2, Users, LogOut, UserPlus } from 'lucide-react';

interface PlayerType {
  name: string;
}
const client = new Client("ws://localhost:3000");

type JoinState = 'initial' | 'name-input' | 'joined';

const Room_Management = () => {
    const [joinState, setJoinState] = useState<JoinState>('initial');
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [username, setUsername] = useState<string>("");
    const [joinedPlayers, setJoinedPlayers] = useState<string[]>([]);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        if (currentRoom) {
            currentRoom.onStateChange((state) => {
                const playerNames = state.players.map((player: PlayerType) => player.name);
                setJoinedPlayers(playerNames);
            });
        }
    }, [currentRoom]);
    const handleJoinClick = () => {
        setJoinState('name-input');
      };
    
      const joinPublicRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!username.trim()) {
          setError("Please enter your name");
          return;
        }
    
        try {
          const room = await client.joinOrCreate("game", { playerName: username });
          setCurrentRoom(room);
          setJoinState('joined');
          setError("");
        } catch (error) {
          setError("Failed to join the room. Please try again.");
        }
      };
    
      const leaveRoom = async () => {
        if (currentRoom) {
          await currentRoom.leave();
          setCurrentRoom(null);
          setJoinState('initial');
          setUsername("");
        }
      };

};
return (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
    <div className="container mx-auto px-4 py-16">
      {joinState === 'initial' && (
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 inline-block p-4 bg-blue-100 rounded-full">
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Virtual Office Workspace
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Connect with colleagues in our virtual workspace. Join a public room to get started.
          </p>
          <button
            onClick={handleJoinClick}
            className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Users className="w-5 h-5 mr-2" />
            Join Public Room
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      )}

      {joinState === 'name-input' && (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Enter Your Name
          </h2>
          <form onSubmit={joinPublicRoom}>
            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your name"
                required
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Join Room
            </button>
          </form>
        </div>
      )}

      {joinState === 'joined' && (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Virtual Office Room
                </h2>
              </div>
              <button 
                onClick={leaveRoom}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Room
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Participants ({joinedPlayers.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {joinedPlayers.map((player, index) => (
                  <div 
                    key={index}
                    className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {player.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-700">{player}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);



    
export default Room_Management;