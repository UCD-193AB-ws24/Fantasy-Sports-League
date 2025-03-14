import React, { useState, useEffect } from 'react';
import MenuBar from '../MenuBar';
import { motion } from 'framer-motion';
import PlayerStatsModal from './PlayerStats';
import './YourRoster.css';
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
  
  const userId = 1; 

  useEffect(() => {
    loadRoster();
  }, []);

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
      const response = await axios.get(`http://localhost:5001/api/roster/${userId}`);
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
      if (error.response && error.response.status === 404) {
        // console.error("Roster not found:", error);
        console.error("user:", userId);
        // alert("Roster not found. Please check if the user ID is correct.");
      } else {
        console.error("Error loading roster:", error, userId);
      }
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
    if (!player || !selectedPlayer || player.id !== selectedPlayer.id) {
      return {};
    }
    const [color1, color2] = player.teamColors || ["#add8e6", "#87ceeb"];
    return {
      border: "4px solid transparent",
      borderImage: `linear-gradient(45deg, ${color1}, ${color2}) 1`,
      borderImageSlice: 1,
    };
  };

const handleSlotClick = async (slotId) => {
  const slot = teamSlots.find((s) => s.id === slotId);
  
  // If clicked on a slot that has the currently selected player, remove them
  if (slot.player && selectedPlayer && slot.player.id === selectedPlayer.id) {
    try {
      await axios.delete('http://localhost:5001/api/roster/remove', {
        data: { userId, playerId: slot.player.id }
      });
      
      const updatedTeamSlots = teamSlots.map((s) =>
        s.id === slotId ? { ...s, player: null } : s
      );
      setTeamSlots(updatedTeamSlots);
      setBench([...bench, selectedPlayer]);
      setSelectedPlayer(null);
    } catch (error) {
      console.error("Error removing player from slot:", error);
    }
    return;
  }
  
  if (!selectedPlayer) return;
  
  // Validate the position
  if (!selectedPlayer.allowedPositions.includes(slot.label)) {
    alert(`${selectedPlayer.name} cannot be placed in the ${slot.label} slot. Allowed positions: ${selectedPlayer.allowedPositions.join(", ")}`);
    return;
  }
  
  try {
    // First, check if the player is already in another position
    const existingSlot = teamSlots.find(s => 
      s.player && s.player.id === selectedPlayer.id
    );
    
    if (existingSlot) {
      // Remove player from current position before adding to new one
      await axios.delete('http://localhost:5001/api/roster/remove', {
        data: { userId, playerId: selectedPlayer.id }
      });
    }
    
    // Handle the player currently in the target slot
    if (slot.player) {
      await axios.delete('http://localhost:5001/api/roster/remove', {
        data: { userId, playerId: slot.player.id }
      });
    }
    
    // Add player to the new position
    // await axios.post('http://localhost:5001/api/roster/add', {
    //   userId,
    //   playerId: selectedPlayer.id,
    //   position: slot.label,
    //   isBench: false
    // });
    await axios.post('http://localhost:5001/api/roster/movePlayer', {
      userId,
      playerId: selectedPlayer.id,
      newPosition: slot.label,
      isBench: false
    });
    
    // Update UI without reloading entire roster
    let updatedBench = bench.filter((p) => p.id !== selectedPlayer.id);
    if (slot.player) {
      updatedBench.push(slot.player);
    }
    
    const updatedTeamSlots = teamSlots.map((s) => {
      // Remove player from any existing slot
      if (s.player && s.player.id === selectedPlayer.id) {
        return { ...s, player: null };
      }
      // Add to target slot
      if (s.id === slotId) {
        return { ...s, player: selectedPlayer };
      }
      return s;
    });
    
    setTeamSlots(updatedTeamSlots);
    setBench(updatedBench);
    setSelectedPlayer(null);
  } catch (error) {
    console.error("Error adding player to slot:", slot.label, error.response?.data);
    alert(error.response?.data?.error || "Error updating roster");
  }
};


  // Return player from slot to bench
  // const handleReturnToBench = async (slotId) => {
  //   const slot = teamSlots.find((s) => s.id === slotId);
  //   if (slot && slot.player) {
  //     try {
  //       // Remove from roster
  //       await axios.delete('http://localhost:5001/api/roster/remove', {
  //         data: { userId, playerId: slot.player.id }
  //       });
        
  //       // Add to bench
  //       const updatedTeamSlots = teamSlots.map((s) =>
  //         s.id === slotId ? { ...s, player: null } : s
  //       );
  //       setTeamSlots(updatedTeamSlots);
  //       setBench([...bench, slot.player]);
        
  //       if (selectedPlayer && selectedPlayer.id === slot.player.id) {
  //         setSelectedPlayer(null);
  //       }
  //     } catch (error) {
  //       console.error("Error returning player to bench:", error);
  //     }
  //   }
  // };

  const handleReturnToBench = async (slotId) => {
    const slot = teamSlots.find((s) => s.id === slotId);
    if (slot && slot.player) {
      try {
        // Move player to bench
        await axios.post('http://localhost:5001/api/roster/moveToBench', {
          userId,
          playerId: slot.player.id
        });

        // Add to bench
        const updatedTeamSlots = teamSlots.map((s) =>
          s.id === slotId ? { ...s, player: null } : s
        );
        setTeamSlots(updatedTeamSlots);
        setBench([...bench, slot.player]);

        if (selectedPlayer && selectedPlayer.id === slot.player.id) {
          setSelectedPlayer(null);
        }
      } catch (error) {
        console.error("Error moving player to bench:", error);
      }
    }
  };

  const openPlayerModal = (player) => {
    setModalPlayer(player);
  };

  if (loading) {
    return <div>Loading roster...</div>;
  }

  return (
    <div>
      <MenuBar />
      <h1 className="YR_title">Your Roster</h1>

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
                        src={slot.player.portrait || "https://via.placeholder.com/150"}
                        alt={slot.player.name}
                        className="YR_court-slot-portrait"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="YR_slot-player-name">{slot.player.name}</div>
                      <div className="YR_fantasy-points">
                        <strong>Fantasy Points:</strong>{" "}
                        {slot.player.avgFanPts ? slot.player.avgFanPts.toFixed(1) : "0.0"}
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
                      src={player.portrait || "https://via.placeholder.com/150"}
                      alt={player.name}
                      className="YR_player-portrait"
                    />
                    <div className="YR_player-card-content">
                      <div className="YR_player-name">{player.name}</div>
                      <div className="YR_player-positions">{player.position}</div>
                      <div className="YR_player-fantasy-points">
                        Fantasy Points:{" "}
                        {player.avgFanPts ? player.avgFanPts.toFixed(1) : "0.0"}
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
