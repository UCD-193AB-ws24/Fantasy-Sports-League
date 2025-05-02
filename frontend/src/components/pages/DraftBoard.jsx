// src/components/pages/DraftBoard.jsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import MenuBar from '../MenuBar';
import axios from 'axios';
import io from 'socket.io-client';
import './DraftBoard.css';


const DraftBoard = () => {
 const { leagueId } = useParams();
 const navigate = useNavigate();
 const { user } = useContext(AuthContext);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [league, setLeague] = useState(null);
 const [draftState, setDraftState] = useState({
   status: 'not_started', // not_started, in_progress, completed
   currentRound: 0,
   currentPick: 0,
   currentTeam: null,
   pickTimeRemaining: 0,
   draftOrder: [],
   picks: []
 });
 const [allPlayers, setAllPlayers] = useState([]);
 const [filteredPlayers, setFilteredPlayers] = useState([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedTeam, setSelectedTeam] = useState('');
 const [selectedPosition, setSelectedPosition] = useState('');
 const [currentUserTurn, setCurrentUserTurn] = useState(false);
 const [queue, setQueue] = useState([]);
 const [teamRosters, setTeamRosters] = useState({});
 const [highlightedPlayer, setHighlightedPlayer] = useState(null);
 const socketRef = useRef(null);
 const timerRef = useRef(null);


 // Connect to WebSocket
 useEffect(() => {
   // Connect to the socket
   socketRef.current = io('http://localhost:5002');


   socketRef.current.on('connect', () => {
     console.log('Connected to WebSocket');
     // Join the draft room for this league
     socketRef.current.emit('join-draft', { leagueId });
   });


   socketRef.current.on('draft-update', (draftData) => {
     console.log('Draft update:', draftData);
     setDraftState(draftData);

     // Check if it's the current user's turn
     if (user && draftData.currentTeam?.userId === user.id) {
       setCurrentUserTurn(true);
     } else {
       setCurrentUserTurn(false);
     }
   });


   socketRef.current.on('pick-made', (pickData) => {
     console.log('Pick made:', pickData);
     // Update the draft picks
     setDraftState(prev => ({
       ...prev,
       picks: [...prev.picks, pickData]
     }));
     
     // Remove player from queue if present
     setQueue(prev => prev.filter(player => player.id !== pickData.playerId));
   });


   socketRef.current.on('draft-started', () => {
     loadDraftData();
   });


   socketRef.current.on('draft-completed', () => {
    setDraftState(prev => ({ ...prev, status: 'completed' }));
    // Show completion message
    // alert("Draft completed! Redirecting to league page...");
    // Navigate after a brief delay
    // setTimeout(() => {
    //   navigate(`/leagues/${leagueId}`);
    // }, 3000);
  });
  


   return () => {
     socketRef.current.disconnect();
   };
 }, [leagueId, user]);


 // Load initial data
 useEffect(() => {
   loadDraftData();
 }, [leagueId]);


 // Update timer
 useEffect(() => {
   if (draftState.status === 'in_progress' && draftState.pickTimeRemaining > 0) {
     timerRef.current = setInterval(() => {
       setDraftState(prev => {
         const newTimeRemaining = Math.max(0, prev.pickTimeRemaining - 1);
         
         // If timer reaches 0, trigger a refresh
         if (newTimeRemaining === 0) {
           // Clear the interval
           clearInterval(timerRef.current);
           
           // Force a refresh of draft data
           loadDraftData();
         }
         
         return {
           ...prev,
           pickTimeRemaining: newTimeRemaining
         };
       });
     }, 1000);
   }

   return () => {
     if (timerRef.current) {
       clearInterval(timerRef.current);
     }
   };
 }, [draftState.status, draftState.pickTimeRemaining]);


 // Filter players based on search and filters
 useEffect(() => {
   let filtered = [...allPlayers];
  
   // Filter out already drafted players
   const draftedIds = draftState.picks.map(pick => pick.playerId);
   filtered = filtered.filter(player => !draftedIds.includes(player.id));
  
   // Apply search filter
   if (searchTerm) {
     const term = searchTerm.toLowerCase();
     filtered = filtered.filter(player =>
       player.name.toLowerCase().includes(term)
     );
   }
  
   // Apply team filter
   if (selectedTeam) {
     filtered = filtered.filter(player => player.team === selectedTeam);
   }
  
   // Apply position filter
   if (selectedPosition) {
     filtered = filtered.filter(player =>
       player.positions && player.positions.includes(selectedPosition)
     );
   }
  
   setFilteredPlayers(filtered);
 }, [allPlayers, searchTerm, selectedTeam, selectedPosition, draftState.picks]);

//  useEffect(() => {
//     // Redirect when draft is completed
//     if (draftState.status === 'completed') {
//       // Wait a few seconds to let the user see the completion message
//       const redirectTimer = setTimeout(() => {
//         navigate(`/leagues/${leagueId}`);
//       }, 3000);
      
//       return () => clearTimeout(redirectTimer);
//     }
//   }, [draftState.status, leagueId, navigate]);


 const loadDraftData = async () => {
   setLoading(true);
   try {
     // Fetch league data
     const leagueResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
       withCredentials: true
     });
     setLeague(leagueResponse.data);


     // Fetch draft state
     const draftResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}/draft`, {
       withCredentials: true
     });
     setDraftState(draftResponse.data);
    
     // Check if it's the current user's turn
     if (user && draftResponse.data.currentTeam?.userId === user.id) {
       setCurrentUserTurn(true);
     }


  // Improved player loading with error handling
  try {
    const playersResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}/players`, {
      withCredentials: true,
      params: {
        limit: 500, // Get all available players
        sortKey: 'rank',
        sortDirection: 'asc'
      }
    });
    
    console.log("Players fetched:", playersResponse.data.players?.length || 0);
    
    if (playersResponse.data.players && playersResponse.data.players.length > 0) {
      setAllPlayers(playersResponse.data.players);
      setFilteredPlayers(playersResponse.data.players);
    } else {
      console.error("No players returned from API");
      
      // Fallback to fetch players from a backup endpoint if main endpoint returns no data
      const backupResponse = await axios.get(`http://localhost:5001/api/players`, {
        withCredentials: true
      });
      
      if (backupResponse.data && backupResponse.data.length > 0) {
        setAllPlayers(backupResponse.data);
        setFilteredPlayers(backupResponse.data);
      }
    }
  } catch (playerError) {
    console.error("Error fetching players:", playerError);
  }


     // Fetch team rosters
     const teamsResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}/teams`, {
       withCredentials: true
     });
    
     // Format team rosters
     const rosters = {};
     teamsResponse.data.forEach(team => {
       rosters[team.userId] = {
         teamName: team.teamName || `Team ${team.name}`,
         userName: team.name,
         players: team.players || []
       };
     });
     setTeamRosters(rosters);
    
     setLoading(false);
   } catch (error) {
     console.error("Error loading draft data:", error);
     setError('Failed to load draft data');
     setLoading(false);
   }
 };

 const renderActionButtons = (player) => {
    return (
    <td>
        {currentUserTurn && (
        <button
            onClick={() => handleMakePick(player.id)}
            className="DB_action-button DB_draft-button"
            style={{
            padding: '8px 15px',
            backgroundColor: '#dc3545',
            color: 'white',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'block' // Force display
            }}
        >
            Draft Now
        </button>
        )}
        <button
        onClick={() => handleAddToQueue(player)}
        className="DB_action-button DB_queue-button"
        style={{
            marginTop: '5px',
            padding: '6px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: queue.some(p => p.id === player.id) ? 'none' : 'block'
        }}
        >
        +Queue
        </button>
    </td>
    );
}


 const handleMakePick = async (playerId) => {
   if (!currentUserTurn) return;
  
   try {
     await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/pick`, {
       playerId
     }, {
       withCredentials: true
     });
    
     // The WebSocket will handle updating the UI
   } catch (error) {
     console.error("Error making pick:", error);
     alert(error.response?.data?.error || 'Failed to make pick');
   }
 };


 const handleAddToQueue = (player) => {
   if (queue.find(p => p.id === player.id)) return;
   setQueue([...queue, player]);
 };


 const handleRemoveFromQueue = (playerId) => {
   setQueue(queue.filter(player => player.id !== playerId));
 };


 const handleMoveInQueue = (playerId, direction) => {
   const index = queue.findIndex(player => player.id === playerId);
   if (index === -1) return;
  
   const newQueue = [...queue];
   if (direction === 'up' && index > 0) {
     [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
   } else if (direction === 'down' && index < queue.length - 1) {
     [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
   }
  
   setQueue(newQueue);
 };


 const handleStartDraft = async () => {
   try {
     await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/start`, {}, {
       withCredentials: true
     });
    
     // The WebSocket will handle updating the UI
   } catch (error) {
     console.error("Error starting draft:", error);
     alert(error.response?.data?.error || 'Failed to start draft');
   }
 };


 const handleAutoPick = async () => {
   if (!currentUserTurn) return;
  
   try {
     await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/autopick`, {}, {
       withCredentials: true
     });
    
     // The WebSocket will handle updating the UI
   } catch (error) {
     console.error("Error making auto pick:", error);
     alert(error.response?.data?.error || 'Failed to make auto pick');
   }
 };


 // Format time remaining
 const formatTimeRemaining = (seconds) => {
   const mins = Math.floor(seconds / 60);
   const secs = seconds % 60;
   return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
 };


 // Find player by ID
 const getPlayerById = (playerId) => {
   return allPlayers.find(player => player.id === playerId);
 };


 // Get current pick number
 const getCurrentPickNumber = () => {
   if (!draftState.currentRound || !draftState.currentPick) return 1;
  
   const teamsCount = draftState.draftOrder.length;
   return ((draftState.currentRound - 1) * teamsCount) + draftState.currentPick;
 };


 // Get draft pick color class
 const getPickColorClass = (pick) => {
   if (!pick) return '';
  
   const positionColorMap = {
     'PG': 'DB_position-pg',
     'SG': 'DB_position-sg',
     'G': 'DB_position-g',
     'SF': 'DB_position-sf',
     'PF': 'DB_position-pf',
     'F': 'DB_position-f',
     'C': 'DB_position-c'
   };
  
   const player = getPlayerById(pick.playerId);
   if (player && player.positions && player.positions.length > 0) {
     return positionColorMap[player.positions[0]] || '';
   }
  
   return '';
 };


 if (loading) {
   return (
     <div>
       <MenuBar />
       <div className="DB_container">
         <h2>Loading draft board...</h2>
       </div>
     </div>
   );
 }


 if (error) {
   return (
     <div>
       <MenuBar />
       <div className="DB_container">
         <h2>Error: {error}</h2>
         <button onClick={() => navigate(`/leagues/${leagueId}`)} className="DB_button">Back to League</button>
       </div>
     </div>
   );
 }


 // Only show draft setup if draft hasn't started and user is commissioner
 if (draftState.status === 'not_started') {
   const isCommissioner = league && league.commissionerId === (user?.id.toString());
  
   return (
     <div>
       <MenuBar />
       <div className="DB_container DB_draft-not-started">
         <h1>Draft Not Started</h1>
         <p>The draft for {league.name} has not started yet.</p>
        
         {league.draftDate && (
           <div className="DB_draft-info">
             <h2>Scheduled Draft Time</h2>
             <p>{new Date(league.draftDate).toLocaleString()}</p>
           </div>
         )}
        
         {isCommissioner && (
           <div className="DB_commissioner-actions">
             <h2>Commissioner Actions</h2>
             <button
               onClick={() => navigate(`/leagues/${leagueId}/draft/setup`)}
               className="DB_button DB_edit-button"
             >
               Edit Draft Settings
             </button>
             <button
               onClick={handleStartDraft}
               className="DB_button DB_start-button"
             >
               Start Draft Now
             </button>
           </div>
         )}
        
         <button onClick={() => navigate(`/leagues/${leagueId}`)} className="DB_button">
           Back to League
         </button>
       </div>
     </div>
   );
 }


 // Render the draft board
 return (
    <div>
    <MenuBar />
    <div className="DB_draft-board">
      <div className="DB_header">
        <h1>{league.name} - Fantasy Draft</h1>
        
        {draftState.status === 'in_progress' && (
          <div className="DB_draft-status">
            <div className="DB_round-pick">
              Round {draftState.currentRound}, Pick {draftState.currentPick}
            </div>
            <div className="DB_current-team">
              {draftState.currentTeam?.teamName || 'Unknown Team'} is on the clock
            </div>
            <div className="DB_timer" style={{ color: 'red', fontWeight: 'bold' }}>
              {formatTimeRemaining(draftState.pickTimeRemaining)}
            </div>
          </div>
        )}
        
         {draftState.status === 'completed' && (
           <div className="DB_draft-status">
             <div className="DB_completed-message">Draft Completed</div>
             <button onClick={() => navigate(`/leagues/${leagueId}`)} className="DB_button">
               Back to League
             </button>
           </div>
         )}
       </div>
      
       <div className="DB_content">
        <div className="DB_left-panel">
          <div className="DB_filter-section">
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="DB_search-input"
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <div className="DB_filters" style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="DB_filter-select"
                style={{ flex: 1 }}
              >
                <option value="">All Teams</option>
                {/* NBA teams options */}
                <option value="Hawks">Atlanta Hawks</option>
                <option value="Celtics">Boston Celtics</option>
                <option value="Nets">Brooklyn Nets</option>
                <option value="Hornets">Charlotte Hornets</option>
                <option value="Bulls">Chicago Bulls</option>
                <option value="Cavaliers">Cleveland Cavaliers</option>
                <option value="Mavericks">Dallas Mavericks</option>
                <option value="Nuggets">Denver Nuggets</option>
                <option value="Pistons">Detroit Pistons</option>
                <option value="Warriors">Golden State Warriors</option>
                <option value="Rockets">Houston Rockets</option>
                <option value="Pacers">Indiana Pacers</option>
                <option value="Clippers">Los Angeles Clippers</option>
                <option value="Lakers">Los Angeles Lakers</option>
                <option value="Grizzlies">Memphis Grizzlies</option>
                <option value="Heat">Miami Heat</option>
                <option value="Bucks">Milwaukee Bucks</option>
                <option value="Timberwolves">Minnesota Timberwolves</option>
                <option value="Pelicans">New Orleans Pelicans</option>
                <option value="Knicks">New York Knicks</option>
                <option value="Thunder">Oklahoma City Thunder</option>
                <option value="Magic">Orlando Magic</option>
                <option value="76ers">Philadelphia 76ers</option>
                <option value="Suns">Phoenix Suns</option>
                <option value="Trail Blazers">Portland Trail Blazers</option>
                <option value="Kings">Sacramento Kings</option>
                <option value="Spurs">San Antonio Spurs</option>
                <option value="Raptors">Toronto Raptors</option>
                <option value="Jazz">Utah Jazz</option>
                <option value="Wizards">Washington Wizards</option>
              </select>
              <select
                value={selectedPosition}
                onChange={e => setSelectedPosition(e.target.value)}
                className="DB_filter-select"
                style={{ flex: 1 }}
              >
                <option value="">All Positions</option>
                <option value="PG">Point Guard</option>
                <option value="SG">Shooting Guard</option>
                <option value="SF">Small Forward</option>
                <option value="PF">Power Forward</option>
                <option value="C">Center</option>
              </select>
            </div>
          </div>
          
          <div className="DB_players-section" style={{ height: 'calc(100vh - 250px)', overflow: 'auto' }}>
            <table className="DB_players-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#36454F', color: 'white' }}>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Team</th>
                  <th>Avg</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map(player => (
                    <tr
                      key={player.id}
                      className={highlightedPlayer === player.id ? 'DB_highlighted-player' : ''}
                      onMouseEnter={() => setHighlightedPlayer(player.id)}
                      onMouseLeave={() => setHighlightedPlayer(null)}
                      style={{ background: highlightedPlayer === player.id ? '#e6f7ff' : 'white' }}
                    >
                      <td>{player.rank || '-'}</td>
                      <td>
                        <div className="DB_player-name" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                            alt={player.name}
                            style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                          />
                          {player.name}
                        </div>
                      </td>
                      <td>{player.positions ? player.positions.join(', ') : '-'}</td>
                      <td>{player.team || '-'}</td>
                      <td>{player.avgFanPts?.toFixed(1) || '-'}</td>
                      {renderActionButtons(player)}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      No players found. Try adjusting your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
         <div className="DB_right-panel">
           <div className="DB_queue-section">
             <h2>Your Queue</h2>
             {queue.length === 0 ? (
               <div className="DB_empty-queue">
                 <p>Your queue is empty. Add players to your queue to prepare for your pick.</p>
               </div>
             ) : (
               <div className="DB_queue-list">
                 {queue.map((player, index) => (
                   <div key={player.id} className="DB_queue-item">
                     <div className="DB_queue-rank">{index + 1}</div>
                     <div className="DB_queue-player">
                       <img
                         src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
                         onError={(e) => {
                           e.target.onerror = null;
                           e.target.src = '/headshots/default.jpg';
                         }}
                         alt={player.name}
                         className="DB_queue-player-image"
                       />
                       <div className="DB_queue-player-info">
                         <div className="DB_queue-player-name">{player.name}</div>
                         <div className="DB_queue-player-details">
                           {player.positions?.join(', ') || '-'} | {player.team || '-'}
                         </div>
                       </div>
                     </div>
                     <div className="DB_queue-actions">
                       <button
                         onClick={() => handleMoveInQueue(player.id, 'up')}
                         disabled={index === 0}
                         className="DB_queue-action-button"
                       >
                         ↑
                       </button>
                       <button
                         onClick={() => handleMoveInQueue(player.id, 'down')}
                         disabled={index === queue.length - 1}
                         className="DB_queue-action-button"
                       >
                         ↓
                       </button>
                       <button
                         onClick={() => handleRemoveFromQueue(player.id)}
                         className="DB_queue-action-button DB_remove-button"
                       >
                         ×
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
            
             {currentUserTurn && queue.length > 0 && (
               <button
                 onClick={() => handleMakePick(queue[0].id)}
                 className="DB_draft-queue-button"
               >
                 Draft {queue[0].name}
               </button>
             )}
            
             {currentUserTurn && (
               <button
                 onClick={handleAutoPick}
                 className="DB_auto-pick-button"
               >
                 Auto Pick
               </button>
             )}
           </div>
          
           <div className="DB_picks-section">
             <h2>Draft Picks</h2>
             <div className="DB_picks-list">
               {draftState.picks.map((pick, index) => {
                 const player = getPlayerById(pick.playerId);
                 const pickNumber = index + 1;
                 const roundNumber = Math.ceil(pickNumber / draftState.draftOrder.length);
                 const pickInRound = ((pickNumber - 1) % draftState.draftOrder.length) + 1;
                
                 return (
                   <div
                     key={index}
                     className={`DB_pick-item ${getPickColorClass(pick)}`}
                   >
                     <div className="DB_pick-number">
                       {roundNumber}.{pickInRound}
                     </div>
                     <div className="DB_pick-team">
                       {pick.teamName || 'Unknown Team'}
                     </div>
                     <div className="DB_pick-player">
                       {player ? (
                         <>
                           <img
                             src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
                             onError={(e) => {
                               e.target.onerror = null;
                               e.target.src = '/headshots/default.jpg';
                             }}
                             alt={player.name}
                             className="DB_pick-player-image"
                           />
                           <div className="DB_pick-player-info">
                             <div className="DB_pick-player-name">{player.name}</div>
                             <div className="DB_pick-player-details">
                               {player.positions?.join(', ') || '-'} | {player.team || '-'}
                             </div>
                           </div>
                         </>
                       ) : (
                         'Unknown Player'
                       )}
                     </div>
                   </div>
                 );
               })}
              
               {draftState.status === 'in_progress' && (
                 <div className="DB_current-pick">
                   <div className="DB_pick-number">
                     {draftState.currentRound}.{draftState.currentPick}
                   </div>
                   <div className="DB_pick-team">
                     {draftState.currentTeam?.teamName || 'Unknown Team'}
                   </div>
                   <div className="DB_pick-player DB_on-clock">
                     On the clock: {formatTimeRemaining(draftState.pickTimeRemaining)}
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       </div>
     </div>
   </div>
 );
};


export default DraftBoard;

