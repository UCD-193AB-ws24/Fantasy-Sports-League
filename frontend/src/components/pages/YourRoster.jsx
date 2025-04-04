import React, { useState, useEffect } from 'react';
import MenuBar from '../MenuBar';
import { motion } from 'framer-motion';
import PlayerStatsModal from './PlayerStats';
import './YourRoster.css';
import { useContext } from 'react';
import { AuthContext } from "../../AuthContext";
import axios from 'axios';

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

function YourRoster() {
  const [bench, setBench] = useState([]);
  const [teamSlots, setTeamSlots] = useState(initialTeamSlots);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [modalPlayer, setModalPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [livePoints, setLivePoints] = useState({});
  const { user } = useContext(AuthContext);
  const [teamName, setTeamName] = useState("Your Roster");
  const [selectedSlot, setSelectedSlot] = useState(null);

  
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
    });
    
    setTeamSlots(updatedTeamSlots);
    
    // Filter out the dropped player from bench
    const updatedBench = bench.filter(player => player.id !== playerId);
    setBench(updatedBench);
    
    if (selectedPlayer && selectedPlayer.id === playerId) {
      setSelectedPlayer(null);
    }
    
    loadRoster();
  };

  const loadRoster = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5001/api/roster/${userId}`, {
        withCredentials: true
      });
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

  // Helper to determine allowed positions based on player's positions (unchanged)
  const determineAllowedPositions = (positions) => {
    const allowedPositions = [];
    
    const positionMap = {
      "PG": ["PG", "G"],
      "SG": ["SG", "G"],
      "SF": ["SF", "F"],
      "PF": ["PF", "F"],
      "C": ["C-1", "C-2"],
      "Guard": ["PG", "SG", "G"],
      "Forward": ["SF", "PF", "F"],
      "Center": ["C-1", "C-2"],
      "Forward-Guard": ["SF", "PF", "F", "PG", "SG", "G"]
    };

    positions.forEach(pos => {
      const allowed = positionMap[pos] || [];
      allowedPositions.push(...allowed);
    });

    allowedPositions.push("Util-1", "Util-2");
    
    return allowedPositions;
  };

  
  // Select/deselect a bench player
  const handlePlayerClick = (player) => {
    if (selectedPlayer && selectedPlayer.id === player.id) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer(player);
    }
  };


  // Style highlight if this is the selected player
  const getGradientBorderStyle = (player) => {
    const isSelected = selectedPlayer && player && selectedPlayer.id === player.id;
    
    if (!isSelected) {
      return {};
    }
    
    const [color1, color2] = player.teamColors || ["#add8e6", "#87ceeb"];
    return {
      border: "3px solid #0077ff",
      boxShadow: "0 0 10px rgba(0, 119, 255, 0.5)"
    };
  };

  const handleSlotClick = async (slotId) => {
    const slot = teamSlots.find((s) => s.id === slotId);
    
    // If no player is selected and we clicked an empty slot, do nothing
    if (!selectedPlayer && !slot.player) return;
    
    // If no player is selected but we clicked on a filled slot, select that player
    if (!selectedPlayer && slot.player) {
      setSelectedPlayer(slot.player);
      return;
    }
    
    // If a player is selected and we clicked on the same player, deselect it
    if (selectedPlayer && slot.player && selectedPlayer.id === slot.player.id) {
      setSelectedPlayer(null);
      return;
    }
    
    // Validate position compatibility
    if (!selectedPlayer.allowedPositions.includes(slot.label)) {
      alert(`${selectedPlayer.name} cannot play in the ${slot.label} position.`);
      return;
    }
    
    try {
      // Check if selected player is from bench
      const isSelectedFromBench = !teamSlots.some(s => s.player && s.player.id === selectedPlayer.id);
      
      // Case 1: Bench player to empty slot
      if (isSelectedFromBench && !slot.player) {
        await axios.post('http://localhost:5001/api/roster/add', {
          userId,
          playerId: selectedPlayer.id,
          position: slot.label,
          isBench: false
        }, {
          withCredentials: true
        });
        
        // Remove from bench in UI
        setBench(prevBench => prevBench.filter(p => p.id !== selectedPlayer.id));
        
        // Add to court in UI
        setTeamSlots(prevSlots => prevSlots.map(s => 
          s.id === slotId ? { ...s, player: selectedPlayer } : s
        ));
      }
      
      // Case 2: Bench player to filled slot (swap)
      else if (isSelectedFromBench && slot.player) {
        // First move the court player to bench
        await axios.delete('http://localhost:5001/api/roster/removePlayer', {
          data: { 
            userId, 
            playerId: slot.player.id 
          },
          withCredentials: true
        });
        
        // Then add the bench player to court
        await axios.post('http://localhost:5001/api/roster/add', {
          userId,
          playerId: selectedPlayer.id,
          position: slot.label,
          isBench: false
        }, {
          withCredentials: true
        });
        
        // Update UI
        setBench(prevBench => [
          ...prevBench.filter(p => p.id !== selectedPlayer.id),
          slot.player
        ]);
        
        setTeamSlots(prevSlots => prevSlots.map(s => 
          s.id === slotId ? { ...s, player: selectedPlayer } : s
        ));
      }
      
      // Case 3: Court player to empty slot
      else if (!isSelectedFromBench && !slot.player) {
        const currentSlot = teamSlots.find(s => s.player && s.player.id === selectedPlayer.id);
        
        // Remove from current position first
        await axios.delete('http://localhost:5001/api/roster/removePlayer', {
          data: { 
            userId, 
            playerId: selectedPlayer.id 
          },
          withCredentials: true
        });
        
        // Then add to new position
        await axios.post('http://localhost:5001/api/roster/add', {
          userId,
          playerId: selectedPlayer.id,
          position: slot.label,
          isBench: false
        }, {
          withCredentials: true
        });
        
        // Update UI
        setTeamSlots(prevSlots => prevSlots.map(s => {
          if (s.id === slotId) return { ...s, player: selectedPlayer };
          if (s.id === currentSlot.id) return { ...s, player: null };
          return s;
        }));
      }
      
      // Case 4: Court player to filled slot (swap)
      else if (!isSelectedFromBench && slot.player) {
        const currentSlot = teamSlots.find(s => s.player && s.player.id === selectedPlayer.id);
        
        // Validate position compatibility for second player
        if (!slot.player.allowedPositions.includes(currentSlot.label)) {
          alert(`${slot.player.name} cannot play in the ${currentSlot.label} position.`);
          return;
        }
        
        // Remove both players
        await axios.delete('http://localhost:5001/api/roster/removePlayer', {
          data: { 
            userId, 
            playerId: selectedPlayer.id 
          },
          withCredentials: true
        });
        
        await axios.delete('http://localhost:5001/api/roster/removePlayer', {
          data: { 
            userId, 
            playerId: slot.player.id 
          },
          withCredentials: true
        });
        
        // Add both players to new positions
        await axios.post('http://localhost:5001/api/roster/add', {
          userId,
          playerId: selectedPlayer.id,
          position: slot.label,
          isBench: false
        }, {
          withCredentials: true
        });
        
        await axios.post('http://localhost:5001/api/roster/add', {
          userId,
          playerId: slot.player.id,
          position: currentSlot.label,
          isBench: false
        }, {
          withCredentials: true
        });
        
        // Update UI
        setTeamSlots(prevSlots => prevSlots.map(s => {
          if (s.id === slotId) return { ...s, player: selectedPlayer };
          if (s.id === currentSlot.id) return { ...s, player: slot.player };
          return s;
        }));
      }
      
      // Reset selection
      setSelectedPlayer(null);
      
    } catch (error) {
      console.error("Error updating player positions:", error);
      loadRoster(); // Reload roster on error
      alert("Error updating roster: " + (error.response?.data?.error || error.message));
    }
  };
  
// Update the handleReturnToBench function to work properly with the API
const handleReturnToBench = async (slotId) => {
  const slot = teamSlots.find(s => s.id === slotId);
  if (!slot || !slot.player) return;
  
  try {
    // Update player to bench status
    await axios.post('http://localhost:5001/api/roster/add', {
      userId,
      playerId: slot.player.id,
      isBench: true
    }, {
      withCredentials: true
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

  if (loading) {
    return <div>Loading roster...</div>;
  }

  return (
    <div>
      <MenuBar />
      <h1 className="YR_title">{teamName}</h1>

      {/* Court Layout */}
      <div className="YR_court-wrapper">
        <div className="YR_court-container">
          <img
            src="/BasketballCourt.png"
            alt="Basketball Court"
            className="YR_court-image"
          />
          {teamSlots.map((slot) => {
            const slotStyle = getGradientBorderStyle(slot.player);
            return (
              <motion.div
                key={slot.id}
                className={`YR_team-slot slot-${slot.label.toLowerCase()}`}
                style={slotStyle}
                onClick={() => handleSlotClick(slot.id)}
                whileHover={{ scale: 1.02 }}
              >
                <div className="YR_slot-label">{slot.label}</div>
                <div className="YR_slot-player">
                  {slot.player ? (
                    <div className="YR_slot-content">
                      <img
                        src={`/headshots/${safeFileName(slot.player.name)}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={slot.player.name}
                        className="YR_court-slot-portrait"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="YR_slot-player-name">{slot.player.name}</div>
                      <div className="YR_fantasy-points">
                        <strong>Fantasy Points:</strong>{" "}
                        {getFantasyPoints(slot.player)}
                        {livePoints[slot.player?.id]?.isLive && <span className="YR_live-indicator"> LIVE</span>}
                      </div>
                      <button
                        className="YR_return-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReturnToBench(slot.id);
                        }}
                      >
                        Return
                      </button>
                      <button
                        className="YR_info-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPlayerModal(slot.player);
                        }}
                      >
                        Info
                      </button>
                    </div>
                  ) : (
                    "Empty"
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bench Layout */}
      <div className="YR_roster-page">
        <div className="YR_roster-builder">
          <div className="YR_bench">
            <h2>Bench ({bench.length} Players)</h2>
            <div className="YR_bench-list">
              {bench.map((player) => (
                <div
                  key={player.id}
                  className="YR_bench-item"
                  style={getGradientBorderStyle(player)}
                  onClick={() => handlePlayerClick(player)}
                >
                  <div className="YR_player-card">
                    <img
                      src={`/headshots/${safeFileName(player.name)}_headshot.jpg`}
                      onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                      alt={player.name}
                      className="YR_player-portrait"
                    />
                    <div className="YR_player-card-content">
                      <div className="YR_player-name">{player.name}</div>
                      <div className="YR_player-positions">{player.position}</div>
                      <div className="YR_player-fantasy-points">
                        Fantasy Points:{" "}
                        {getFantasyPoints(player)}
                        {livePoints[player?.id]?.isLive && <span className="YR_live-indicator"> LIVE</span>}
                      </div>
                    </div>
                    <button
                      className="YR_info-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPlayerModal(player);
                      }}
                    >
                      Info
                    </button>
                  </div>
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
          onPlayerDropped={handlePlayerDropped}
        />
      )}
    </div>
  );
}

export default YourRoster;