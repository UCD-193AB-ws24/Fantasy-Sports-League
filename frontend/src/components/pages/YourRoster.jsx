import React, { useState, useEffect} from 'react';
import MenuBar from '../MenuBar';
import { motion } from 'framer-motion';
import PlayerStatsModal from './PlayerStats';
import './YourRoster.css';
import { useContext } from 'react';
import { AuthContext } from "../../AuthContext";
import axios from 'axios';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Define roster position slots (unchanged)
const initialTeamSlots = [
  { id: 1,  label: "PG",     player: null },
  { id: 2,  label: "SG",     player: null },
  { id: 3,  label: "G",      player: null },
  { id: 4,  label: "SF",     player: null },
  { id: 5,  label: "PF",     player: null },
  { id: 6,  label: "F",      player: null },
  { id: 7,  label: "C-1",    player: null },
  { id: 8,  label: "C-2",    player: null },
  { id: 9,  label: "Util-1", player: null },
  { id: 10, label: "Util-2", player: null },
  { id: 11, label: "IL-1",   player: null },
  { id: 12, label: "IL-2",   player: null },
  { id: 13, label: "IL-3",   player: null },
];
const players = [
  { name: "Hawks", img:"hawks-logo.jpg", palette1:'#C8102E', palette2: '#FDB927'},
  { name: "Celtics", img: "alt.png", palette1:'#007A33', palette2: '#BA9653'},
  { name: "Nets", img: "alt.png", palette1:'#000000', palette2: '#FFFFFF'},
  { name: "Hornets", img: "alt.png", palette1:'#1d1160', palette2: '#00788C'},
  { name: "Bulls", img: "alt.png", palette1:'#CE1141', palette2: '#000000'},
  { name: "Cavaliers", img: "alt.png", palette1:'#860038', palette2: '#FDBB30'},
  { name: "Mavericks", img: "alt.png", palette1:'#002B5e', palette2: '#00538C'},
  { name: "Nuggets", img: "alt.png", palette1: '#0E2240', palette2: '#FEC524'},
  { name: "Pistons", img: "alt.png", palette1: '#C8102E', palette2: '#1d42ba'},
  { name: "Warriors", img: "alt.png", palette1:'#1D428A', palette2: '#ffc72c'},
  { name: "Rockets", img: "alt.png", palette1:'#000000', palette2: '#CE1141'},
  { name: "Pacers", img: "alt.png", palette1:'#002D62', palette2: '#FDBB30'},
  { name: "Clippers", img: "alt.png", palette1:'#c8102E', palette2: '#1d428a'},
  { name: "Lakers", img: "lakers-logo.png", palette1:'#552583', palette2: '#FDB927'},
  { name: "Grizzlies", img: "Memphis-Grizzlies-Emblem.png", palette2:'#12173F', palette1: '#5D76A9'},
  { name: "Heat", img: "alt.png", palette2:'#98002E', palette1: '#F9A01B'},
  { name: "Bucks", img: "alt.png", palette2:'#00471B', palette1: '#EEE1C6'},
  { name: "Timberwolves", img: "alt.png", palette1:'#0C2340', palette2: '#236192'},
  { name: "Pelicans", img: "alt.png", palette1:'#C8102E', palette2: '#0C2340'},
  { name: "Knicks", img: "alt.png", palette1:'#006BB6', palette2: '#F58426'},
  { name: "Thunder", img: "alt.png", palette1:'#007ac1', palette2: '#ef3b24'},
  { name: "Magic", img: "alt.png", palette1:'#0077c0', palette2: '#C4ced4'},
  { name: "76ers", img: "alt.png", palette1:'#ed174c', palette2: '#006bb6'},
  { name: "Suns", img: "alt.png", palette1:'#1d1160', palette2: '#e56020'},
  { name: "Blazers", img: "alt.png", palette1:'#000000', palette2: '#E03A3E'},
  { name: "Kings", img: "alt.png", palette1:'#5a2d81', palette2: '#63727A'},
  { name: "Spurs", img: "alt.png", palette1:'#000000', palette2: '#c4ced4'},
  { name: "Raptors", img: "alt.png", palette1:'#000000', palette2: '#ce1141'},
  { name: "Jazz", img: "alt.png", palette1:'#00471B', palette2: '#002B5C'},
  { name: "Wizards", img: "alt.png", palette1:'#e31837', palette2: '#002B5C'}
];

function extractPalette1(teamName){
  console.log(teamName);
  const team = players.find(t => t.name == teamName);
  // console.log(team.palette1);
  return team ? team.palette1 : '000000';
}

function extractPalette2(teamName){
  console.log(teamName);
  const team = players.find(t => t.name == teamName);
  return team ? team.palette2 : '000000';
}

function getTeamImage(teamName) {
  const team = players.find(t => t.name === teamName);
  return team ? team.img : "alt.png"; // fallback image
}

const ItemTypes = {
  PLAYER: 'player'
};

// Allows for players to be draggable
function DraggablePlayer({ player }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { player },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [player]);

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <img
        src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
        onError={(e) => {
          e.target.onerror = null; 
          e.target.src = '/headshots/default.jpg';
        }}
        alt={player.name}
        className="YR_player-portrait"
      />
      <div className="YR_player-card-content">
        <div className="YR_player-name">{player.name}</div>
        <div className="YR_player-positions">{player.position}</div>
      </div>
    </div>
  );
}


// Second functionality of drag feature, allows players to be droppable into
function DroppableSlot({ slot, onDropPlayer, children }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.PLAYER,
    drop: (item) => onDropPlayer(item.player, slot),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [slot, onDropPlayer]);

  return (
    <div
      ref={drop}
      className={`YR_team-slot slot-${slot.label.toLowerCase()}`}
      style={{ backgroundColor: isOver ? '#e0f7fa' : undefined }}
    >
      <div className="YR_slot-label">{slot.label}</div>
      <div className="YR_slot-player">
        {children || "Empty"}
      </div>
    </div>
  );
}

function YourRoster() {
  const [bench, setBench] = useState([]);
  const [teamSlots, setTeamSlots] = useState(initialTeamSlots);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [modalPlayer, setModalPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [livePoints, setLivePoints] = useState({});
  const { user } = useContext(AuthContext);
  const [teamName, setTeamName] = useState("Your Roster");
  const [isEditing, setIsEditing] = useState(false);
  

  const userId = user?.id;

  // Utility function to create a safe file name from player name
  const safeFileName = (name) => {
    return name.split(' ').join('_');
  };

  useEffect(() => {
    loadRoster();
  }, []);

  useEffect(() => {
    // Fetch team name if user exists
    if (user) {
      const fetchTeamName = async () => {
        try {
          const response = await axios.get(`http://localhost:5001/api/user/teamName`, {
            withCredentials: true
          });
          if (response.data.teamName) {
            setTeamName(response.data.teamName);
          }
        } catch (error) {
          console.error("Error fetching team name:", error);
        }
      };
      fetchTeamName();
    }
  }, [user]);

  // Add this new useEffect for polling:
  useEffect(() => {
    // Function to fetch live updates
    const fetchLiveUpdates = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/roster/${userId}/livePoints`, {
          withCredentials: true
        });
        const updates = response.data.liveUpdates;
        
        // Convert to a map for easy lookup
        const pointsMap = {};
        updates.forEach(update => {
          pointsMap[update.playerId] = {
            liveFanPts: update.liveFanPts,
            isLive: update.isLive
          };
        });
        
        setLivePoints(pointsMap);
      } catch (error) {
        console.error("Error fetching live updates:", error);
      }
    };
    
    // Initial fetch
    fetchLiveUpdates();
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchLiveUpdates, 30000);
    
    // Cleanup function
    return () => clearInterval(interval);
  }, [userId]);
  
  const handlePlayerDropped = (playerId) => {
    const updatedTeamSlots = teamSlots.map(slot => {
      if (slot.player && slot.player.id === playerId) {
        return { ...slot, player: null };
      }
      return slot;
    }
  )}


  // Helper to determine allowed positions based on player's positions
const determineAllowedPositions = (positions) => {
  const allowedPositions = new Set();
  
  const positionMap = {
    "PG": ["PG", "G"],
    "SG": ["SG", "G"],
    "SF": ["SF", "F"],
    "PF": ["PF", "F"],
    "C": ["C-1", "C-2"],
    "Guard": ["PG", "SG", "G"],
    "Forward": ["SF", "PF", "F"],
    "Center": ["C-1", "C-2"]
  };

  // Process each position, including handling hyphenated positions
  positions.forEach(pos => {
    // Check if this is a combined position (contains a hyphen)
    if (pos.includes('-')) {
      // Split the combined position
      const combinedPositions = pos.split('-');
      
      // Add allowed positions for each part
      combinedPositions.forEach(subPos => {
        if (positionMap[subPos]) {
          positionMap[subPos].forEach(p => allowedPositions.add(p));
        }
      });
    } 
    // Handle regular positions
    else if (positionMap[pos]) {
      positionMap[pos].forEach(p => allowedPositions.add(p));
    }
  });

  // Always add utility positions
  allowedPositions.add("Util-1");
  allowedPositions.add("Util-2");
  
  return Array.from(allowedPositions);
};


  const loadRoster = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/roster/${userId}`, { withCredentials: true });
      const rosterData = response.data;
      
      // Reset all slots
      const updatedSlots = initialTeamSlots.map(slot => ({ ...slot, player: null }));
      const benchPlayers = [];
      
      // Create a map to store players with their best position
      // This ensures each player only appears once
      const playerMap = new Map();
      
      // Process data: gather all assignments for each player
      rosterData.players.forEach(rosterPlayer => {
        const playerId = rosterPlayer.player.id;
        
        // Process player data
        const processedPlayer = {
          ...rosterPlayer.player,
          position: rosterPlayer.player.positions?.join(", ") || "",
          allowedPositions: determineAllowedPositions(rosterPlayer.player.positions || [])
        };
        
        // Determine the priority of this assignment
        // Higher number = higher priority
        let priority = 0;
        if (!rosterPlayer.isBench && rosterPlayer.position) priority = 2; // Specific position
        else if (!rosterPlayer.isBench) priority = 1; // Not bench but no specific position
        // Bench stays priority 0
        
        // Only update if this is a better assignment or we haven't seen this player yet
        if (!playerMap.has(playerId) || priority > playerMap.get(playerId).priority) {
          playerMap.set(playerId, {
            player: processedPlayer,
            position: rosterPlayer.position,
            isBench: rosterPlayer.isBench,
            priority
          });
        }
      });
      
      // Now place each player exactly once, based on their highest priority assignment
      for (const [_, assignment] of playerMap) {
        const { player, position, isBench } = assignment;
        
        // If explicitly on bench, add to bench
        if (isBench) {
          benchPlayers.push(player);
          continue;
        }
        
        // Try to place in specific position first
        if (position) {
          const slotIndex = updatedSlots.findIndex(slot => 
            slot.label === position && slot.player === null
          );
          
          if (slotIndex !== -1) {
            updatedSlots[slotIndex].player = player;
            continue; // Player successfully placed
          }
        }
        
        // Try to find any valid position
        let placed = false;
        for (const allowedPos of player.allowedPositions) {
          const slotIndex = updatedSlots.findIndex(slot => 
            slot.label === allowedPos && slot.player === null
          );
          
          if (slotIndex !== -1) {
            updatedSlots[slotIndex].player = player;
            placed = true;
            break; // Place in first available position
          }
        }
        
        // If we couldn't place them anywhere, add to bench
        if (!placed) {
          benchPlayers.push(player);
        }
      }
      
      setTeamSlots(updatedSlots);
      setBench(benchPlayers);
    } catch (error) {
      console.error("Error loading roster:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchLiveUpdates = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/roster/${userId}/livePoints`, { withCredentials: true });
        const updates = response.data.liveUpdates;
        const pointsMap = {};
        updates.forEach(update => {
          pointsMap[update.playerId] = { liveFanPts: update.liveFanPts, isLive: update.isLive };
        });
        setLivePoints(pointsMap);
      } catch (error) {
        console.error("Error fetching live updates:", error);
      }
    };
    fetchLiveUpdates();
    const interval = setInterval(fetchLiveUpdates, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (user) {
      const fetchTeamName = async () => {
        try {
          const response = await axios.get(`http://localhost:5001/api/user/teamName`, { withCredentials: true });
          if (response.data.teamName) {
            setTeamName(response.data.teamName);
          }
        } catch (error) {
          console.error("Error fetching team name:", error);
        }
      };
      fetchTeamName();
    }
  }, [user]);

  const handleDropPlayer = async (draggedPlayer, targetSlot) => {
    if (!draggedPlayer.allowedPositions.includes(targetSlot.label)) {
      alert(`${draggedPlayer.name} cannot play in the ${targetSlot.label} position.`);
      return;
    }
  
    try {
      const isFromBench = bench.some((p) => p.id === draggedPlayer.id);
      const targetSlotHasPlayer = !!targetSlot.player;
  
      // Use the movePlayer endpoint for moving players already on the roster
      await axios.post(
        'http://localhost:5001/api/roster/movePlayer',
        {
          userId,
          playerId: draggedPlayer.id,
          newPosition: targetSlot.label,
        },
        { withCredentials: true }
      );
  
      // Update UI
      if (isFromBench) {
        setBench((prev) => prev.filter((p) => p.id !== draggedPlayer.id));
      }
  
      setTeamSlots((prevSlots) =>
        prevSlots.map((s) =>
          s.id === targetSlot.id
            ? { ...s, player: draggedPlayer }
            : s.player?.id === draggedPlayer.id
            ? { ...s, player: null }
            : s
        )
      );
    } catch (error) {
      console.error('Error updating player positions:', error);
      alert(error.response?.data?.error || 'Error updating roster');
    }
  };
  
// Update the handleReturnToBench function to work properly with the moveToBench API
const handleReturnToBench = async (slotId) => {
  const slot = teamSlots.find(s => s.id === slotId);
  if (!slot || !slot.player) return;

  try {
    // Use the moveToBench API endpoint
    await axios.post('http://localhost:5001/api/roster/moveToBench', {
      userId,
      playerId: slot.player.id,
    }, {
      withCredentials: true,
    });

    // Update UI
    const updatedTeamSlots = teamSlots.map(s =>
      s.id === slotId ? { ...s, player: null } : s
    );

    setTeamSlots(updatedTeamSlots);
    setBench(prev => [...prev, slot.player]);

    if (selectedPlayer && selectedPlayer.id === slot.player.id) {
      setSelectedPlayer(null);
    }
  } catch (error) {
    console.error("Error returning player to bench:", error);
    loadRoster(); // Reload roster on error
    alert("Error moving player to bench: " + (error.response?.data?.error || error.message));
  }
};

const handleTeamNameSubmit = async (e) => {
  e.preventDefault();
  try {
      await axios.post("http://localhost:5001/api/user/updateTeamName", 
          { teamName }, 
          { withCredentials: true }
      );
      setMessage("Team name updated successfully!");
      setIsEditing(false);
  } catch (error) {
      console.error("Error updating team name:", error);
      setMessage("Failed to update team name.");
  }
};

 const openPlayerModal = (player) => {
    setModalPlayer(player);
  };

  const getFantasyPoints = (player) => {
    if (!player) return "0.0";
    
    // If we have live data for this player and they're in a live game, use that
    if (livePoints[player.id]?.isLive) {
      return livePoints[player.id].liveFanPts;
    }
    
    // Otherwise use the average from database
    return player.avgFanPts ? player.avgFanPts.toFixed(1) : "0.0";
  };
  
  useEffect(() => { loadRoster(); }, []);
  if (loading) {
    return <div>Loading roster...</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ backgroundImage: 'url("/locker-room-background.jpg")', backgroundSize: 'cover' }}>
        <MenuBar />  

        <h1 className="YR_title">{teamName}</h1>
        {/* Court Layout */}
        <div className="YR_court-wrapper">
          <div className="YR_court-container">
            <img src="/BasketballCourt.png" alt="Basketball Court" className="YR_court-image" />
            {teamSlots.map(slot => (
              <motion.div key={slot.id}>
                <DroppableSlot slot={slot} onDropPlayer={handleDropPlayer}>
                  {slot.player && (
                    <>
                  <div className="YR_player-card-hover">
                    <DraggablePlayer player={slot.player}></DraggablePlayer>

                    <div className="YR_player-expanded-card" style={{ backgroundImage: `radial-gradient(circle at center center, ${extractPalette2(slot.player.team)}, ${extractPalette1(slot.player.team)}), repeating-radial-gradient(circle at center center, ${extractPalette2(slot.player.team)}, ${extractPalette2(slot.player.team)}, 10px, transparent 20px, transparent 10px)`,
backgroundBlendMode: `multiply;`, color:"white"}}>
                      <div className="YR_player-expanded-upper">
                      <img
                        src={getTeamImage(slot.player.team)}
                        alt={`Load`}
                        className="w-8 h-8 inline-block mr-2"
                        style={{position:"absolute",width:"20%", height:"15%", left:"75%"}}
                      />
                        <div className='YR_player-expanded-ranking' style={{color:"white"}}>
                          Rank
                          <p >{slot.player.rank}</p>
                        </div>
                        <div className='YR_player-expanded-picture'>

                        <img
                          src={`/headshots/${slot.player.name.split(' ').join('_')}_headshot.jpg`}
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = '/headshots/default.jpg';
                          }}
                          alt={slot.player.name}
                          className="YR_player-portrait">
                          </img>
                        </div>
                      </div>
                      <div className='YR_player-expanded-lower'>
                        <p style={{fontSize:"15px", marginBottom:"0"}}>{slot.player.name}</p>
                        <hr style={{margin:"0"}}></hr>
                        <p>{slot.player.team}</p>
                        <p>Total Fan Points: {slot.player.totalFanPts}</p>
                        <p>Current Fantasy Points: {getFantasyPoints(slot.player)}</p>
                        <p>{livePoints[slot.player?.id]?.isLive && <span className="YR_live-indicator"> LIVE</span>}</p>
                      </div>

                    </div>
                  </div>                   
                      
                      <button
                        className="YR_info-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPlayerModal(slot.player);
                        }}
                      >
                        Info
                      </button>
                      <button
                        className="YR_info-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReturnToBench(slot.id);
                        }}
                      >
                        Return
                      </button>
                    </>
                  )}
                </DroppableSlot>
              </motion.div>
            ))}
          </div>
        </div>

        
        {/* Bench Layout */}
        <div className="YR_roster-page">
          <div className="YR_roster-builder">
            <div className="YR_bench">              
              <h2 className='YR_bench-titlecard'>Bench ({bench.length} Players)</h2>
              <div className="YR_bench-list">
                {bench.map(player => (
                  <div key={player.id} className="YR_bench-item" style={{ backgroundImage: `radial-gradient(circle at center center, ${extractPalette2(player.team)}, ${extractPalette1(player.team)}), repeating-radial-gradient(circle at center center, ${extractPalette2(player.team)}, ${extractPalette2(player.team)}, 10px, transparent 20px, transparent 10px)`,
backgroundBlendMode: `multiply;`,color:"white"}}>
                    <DraggablePlayer player={player} />
                    <p>{player.team}</p>
                    <p>Total Fan Points: {player.totalFanPts}</p>
                    <p>Current Fantasy Points: {getFantasyPoints(player)}</p>
                    <p>{livePoints[player?.id]?.isLive && <span className="YR_live-indicator"> LIVE</span>}</p>                  
                     <button
                      className="YR_info-btn"
                      style={{marginTop:"-10%"}}
                      onClick={() => openPlayerModal(player)}
                    >
                      Info
                    </button>
                    
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {modalPlayer && (
          <PlayerStatsModal
            player={modalPlayer}
            onClose={() => setModalPlayer(null)}
            isRoster={true}
            onPlayerDropped={(playerId) => {
            }}
          />
        )}
      </div>
    </DndProvider>
  );
}

export default YourRoster;
