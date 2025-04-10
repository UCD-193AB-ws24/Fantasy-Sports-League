// import React, { useState, useContext, useEffect } from "react";
// import { AuthContext } from "./AuthContext";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import MenuBar from "./components/MenuBar";
// import "./Profile.css";
// // import GameLogs from "./components/GameLogs";

// const ProfilePage = () => {
//     const navigate = useNavigate();
//     const { user, logout } = useContext(AuthContext);
//     const [name, setUsername] = useState("");
//     const [isEditing, setIsEditing] = useState(false);
//     const [message, setMessage] = useState("");
//     const [livePoints, setLivePoints] = useState({});
//     const [players, setPlayers] = useState([]);
//     const [playerNames, setPlayerNames] = useState([]);
//     const [playerTeams, setPlayerTeams] = useState([]);
//     // const [gameLogs, setGameLogs] = useState([]);
//     const [loading, setLoading] = useState(true);
  
//     // useEffect(() => {
//     //   const fetchGameLogs = async () => {
//     //     try {
//     //       const response = await axios.get(`http://localhost:5001/api/players/${playerId}/gamelogs`);
//     //       setGameLogs(response.data);
//     //       setLoading(false);
//     //     } catch (error) {
//     //       console.error("Error fetching game logs:", error);
//     //     }
//     //   };
  
//     //   if (players) {
//     //     fetchGameLogs();
//     //   }
//     // }, [players]);

//     const teamColors = {
//         "Lakers": "#FDB927",
//         "Warriors": "#FFC72C",
//         "Celtics": "#007A33",
//         "Heat": "#98002E",
//         "Nets": "#FFFFFF",
//         "Bulls": "#CE1141",
//         "Knicks": "#F58426",
//         "Spurs": "#C4CED4",
//         "Suns": "#1D1160",
//         "Mavericks": "#002B5E",
//         "Hawks":"#C8102E",
//         "Kings":"5A2D81",
//         // Add more teams here...
//         "Unknown": "#cccccc" // fallback color
//       };
      


//     const userId = user?.id;

//     useEffect(() => {
//         const fetchPlayerNames = async () => {
//           try {
//             const response = await axios.get(`http://localhost:5001/api/roster/${userId}/playerNames`, {
//               withCredentials: true
//             });
//             setPlayerNames(response.data.playerNames);
//           } catch (error) {
//             console.error("Error fetching player names:", error);
//           }
//         };
    
//         if (userId) {
//           fetchPlayerNames();
//         }
//       }, [userId]);

      
//     useEffect(() => {
//         const fetchPlayerTeams = async () => {
//           try {
//             const response = await axios.get(`http://localhost:5001/api/roster/${userId}/playerTeams`, {
//               withCredentials: true
//             });
//             setPlayerTeams(response.data.playerTeams);
//           } catch (error) {
//             console.error("Error fetching player names:", error);
//           }
//         };
    
//         if (userId) {
//           fetchPlayerTeams();
//         }
//       }, [userId]);

//       useEffect(() => {
//         const fetchLiveUpdates = async () => {
//           try {
//             const response = await axios.get(`http://localhost:5001/api/roster/${userId}/livePoints`, {
//               withCredentials: true
//             });
//             const updates = response.data.liveUpdates;
      
//             // Merge both name and team into the live update
//             const merged = updates.map((update) => {
//               const nameObj = playerNames.find((p) => p.id === update.playerId);
//               const teamObj = playerTeams.find((p) => p.id === update.playerId);
      
//               return {
//                 ...update,
//                 name: nameObj ? nameObj.name : "Unknown",
//                 team: teamObj ? teamObj.team : "Unknown"
//               };
//             });
      
//             setPlayers(merged); // players now includes name and team
      
//             const pointsMap = {};
//             updates.forEach(update => {
//               pointsMap[update.playerId] = {
//                 liveFanPts: update.liveFanPts,
//                 isLive: update.isLive
//               };
//             });
//             setLivePoints(pointsMap);
      
//           } catch (error) {
//             console.error("Error fetching live updates:", error);
//           }
//         };
      
//         fetchLiveUpdates();
//         const interval = setInterval(fetchLiveUpdates, 30000);
//         return () => clearInterval(interval);
//       }, [userId, playerNames, playerTeams]); // Make sure this runs after playerNames & teams are fetched
      

//     useEffect(() => {
//         // Fetch team name if user exists
//         if (user) {
//             const fetchUsername = async () => {
//                 try {
//                     const response = await axios.get(`http://localhost:5001/api/user/getUserName`, {
//                         withCredentials: true
//                     });
//                     setUsername(response.data.name || "");
//                 } catch (error) {
//                     console.error("Error fetching team name:", error);
//                 }
//             };
//             fetchUsername();
//         }
//     }, [user]);



//     const handleLogout = async () => {
//         await logout(); // Call logout from AuthContext
//         navigate("/"); // Redirect after logout
//     };

//     const handleUserNameChange = async (e) => {
//         e.preventDefault();
//         try {
//             await axios.post("http://localhost:5001/api/user/updateUserName", 
//                 { name }, 
//                 { withCredentials: true }
//             );
//             setMessage("Username updated successfully!");
//             setIsEditing(false);
//             setUser((prevUser) => ({ ...prevUser, name }));
//         } catch (error) {
//             console.error("Error updating Username:", error);
//             setMessage("Failed to update Username.");
//         }
//     };


//     // useEffect(() => {
//     //   const fetchLivePoints = async () => {
//     //     try {
//     //       const response = await axios.get(
//     //         `http://localhost:5001/api/roster/${userId}/livePoints`,
//     //         { withCredentials: true }
//     //       );
//     //       setPlayers(response.data.liveUpdates);
//     //     } catch (error) {
//     //       console.error("Error fetching live points:", error);
//     //     }
//     //   };
  
//     //   fetchLivePoints();
//     // }, [userId]);

    
//   const getFantasyPoints = (player) => {
//     if (!player) return "0.0";
    
//     // If we have live data for this player and they're in a live game, use that
//     if (livePoints[player.id]?.isLive) {
//       return livePoints[player.id].liveFanPts;
//     }
    
//     // Otherwise use the average from database
//     return player.avgFanPts ? player.avgFanPts.toFixed(1) : "0.0";
//   };

// // Utility function to create a safe file name from player name
// const safeFileName = (name) => {
//     return name.split(' ').join('_');
//     };

//     return (
//         <div className="profile-whole-wrapper">            
//           <MenuBar />
//           <button onClick={() => navigate('/DragTest')}>
//             To Test
//           </button>

//           <div className="test-wrapper">
//             <div className="profile-test-navbar">
//             <nav className="profile-namebar-navbar">
//                     <a href="#">Home</a>
//                     <a href="#">Friends</a>
//                     <a href="#">Edit Profile</a>
//                     <a href="#">View Achievements</a>
//                     <a href="#">Other Player Profile Options</a>
//                     <a href="#">Contact</a>
//                     <a href="#">Settings</a>

//                 </nav>
//             </div>
//             <div className="profile-avatar-name-container">
//               <img src="pic6.png" className="profile-namebar-profilepic"></img>
//               <div className="what-is-this">
//                 <h1>
                  
//                   {user ? (
//                   <div>             
//                           {isEditing ? (
//                               <form onSubmit={handleUserNameChange}>
//                                   <input 
//                                       type="text" 
//                                       value={name} 
//                                       onChange={(e) => setUsername(e.target.value)}
//                                       placeholder = {name}
//                                       className="profile-namebar-changename-bar"
//                                   />
//                                   <div>
//                                       <button type="submit" className="profile-namebar-save-button">Save</button>
//                                       <button 
//                                           type="button" 
//                                           className="profile-namebar-save-button"
//                                           onClick={() => setIsEditing(false)}
//                                           // style={{ marginLeft: "24%" }}
//                                       >
//                                           Cancel
//                                       </button>
//                                   </div>
//                               </form>
//                           ) : (
//                           <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//                               <p style={{ margin: 0 }}>{name}</p>
//                                   <button className="Btn" onClick={() => setIsEditing(true)}>
//                                       <svg className="svg" viewBox="0 0 512 512">
//                                       <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z">
//                                       </path>
//                                       </svg>
//                                   </button>
//                           </div>
//                           )}
//                   </div>
//               ) : (
//                   <p>You are not logged in.</p>
//               )}
//               </h1>
//               </div>
              
//               <p className="profile-joinedat-Date">Joined on: {user.createdAt.slice(0,10)}</p>

//             </div>


            
//             <div className="profile-roster-container">
//                 {players.length > 0 ? (
//                     players.map((player) => (
//                     <div
//                     key={player.playerId}
//                     className="profile-roster-item"
//                     style={{ backgroundColor: teamColors[player.team], color: "#000000" || teamColors["Unknown"] }}
//                     >
//                     <h3>{player.name}</h3>
//                     <p>{player.team}</p>
//                     <p>Live Fantasy Points: {player.liveFanPts}</p>
//                     <p>Status: {player.isLive ? "Live" : "Not Live"}</p>
//                     </div>
//                     ))
//                 ) : (
//                     <p>Loading...</p>
//                 )}
//             </div>

//             {/* <div className="profile-update-change-roster">
//               <a href="/PlayerList">View Player List</a>
//               <a href="/YourRoster">View Roster</a>
//             </div> */}

//           </div>



//             {/* <div className="profile-namebar">
//             <input className="profile-searchbar" type="text" placeholder="Search for Player"/>

//                     <img src="pic6.png" className="profile-namebar-profilepic"></img>
//                 <nav className="profile-namebar-navbar">
//                     <a href="#">Edit Profile</a>
//                     <a href="#">View Achievements</a>
//                     <a href="#">Other Player Profile Options</a>
//                 </nav>
//                 <h1>
                  
//                     {user ? (
//                     <div>             
//                             {isEditing ? (
//                                 <form onSubmit={handleUserNameChange}>
//                                     <input 
//                                         type="text" 
//                                         value={name} 
//                                         onChange={(e) => setUsername(e.target.value)}
//                                         placeholder = {name}
//                                         className="profile-namebar-changename-bar"
//                                     />
//                                     <div>
//                                         <button type="submit" className="profile-namebar-save-button">Save</button>
//                                         <button 
//                                             type="button" 
//                                             className="profile-namebar-cancel-button"
//                                             onClick={() => setIsEditing(false)}
//                                             style={{ marginLeft: "24%" }}
//                                         >
//                                             Cancel
//                                         </button>
//                                     </div>
//                                 </form>
//                             ) : (
//                             <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//                                 <p style={{ margin: 0 }}>{name}</p>
//                                     <button className="Btn" onClick={() => setIsEditing(true)}>
//                                         <svg className="svg" viewBox="0 0 512 512">
//                                         <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z">
//                                         </path>
//                                         </svg>
//                                     </button>
//                             </div>
//                             )}
//                     </div>
//                 ) : (
//                     <p>You are not logged in.</p>
//                 )}
//                 </h1>
                
//             </div>

//             <p className="profile-joinedat-Date">Joined on: {user.createdAt.slice(0,10)}</p>

//             <div className="profile-update-change-roster">
//               <a href="/PlayerList">View Player List</a>
//               <a href="/YourRoster">View Roster</a>
//             </div>
            
//             <div className="profile-roster-container">
//                 {players.length > 0 ? (
//                     players.map((player) => (
//                     <div
//                     key={player.playerId}
//                     className="profile-roster-item"
//                     style={{ backgroundColor: teamColors[player.team], color: "#000000" || teamColors["Unknown"] }}
//                     >
//                     <h3>{player.name}</h3>
//                     <p>{player.team}</p>
//                     <p>Live Fantasy Points: {player.liveFanPts}</p>
//                     <p>Status: {player.isLive ? "Live" : "Not Live"}</p>
//                     </div>
//                     ))
//                 ) : (
//                     <p>Loading...</p>
//                 )}
//             </div>
            
//             <div className="profile-sidebar">
//                 <h1>Recent Games</h1>
//                   {players.map((player) => (
//                       <div key={player.playerId} className="gamelog-player-card">
//                           <div className="gamelog-player-card-each">
//                               <p>{player.name}</p>

//                               <GameLogs playerId={player.playerId} />
//                           </div>
//                       </div>
//                   ))}
//             </div> */}
//         </div>
//     );
// };

// export default ProfilePage; 


import React from 'react'

function Profile() {
  return (
    <div>
      
    </div>
  )
}

export default Profile

