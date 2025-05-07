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

const TEAM_CONFIG = {
  Celtics:    { primary: "#007A33", secondary: "#BA9653", logo: "/NBA-TeamLogos/celtics.jpg" },
  Nets:       { primary: "#000000", secondary: "#FFFFFF", logo: "/NBA-TeamLogos/nets.jpg" },
  Knicks:     { primary: "#006BB6", secondary: "#F58426", logo: "/NBA-TeamLogos/knicks.jpg" },
  "76ers":    { primary: "#006BB6", secondary: "#ED174C", logo: "/NBA-TeamLogos/76ers.jpg" },
  Raptors:    { primary: "#CE1141", secondary: "#000000", logo: "/NBA-TeamLogos/raptors.jpg" },
  Bulls:      { primary: "#CE1141", secondary: "#000000", logo: "/NBA-TeamLogos/bulls.jpg" },
  Cavaliers:  { primary: "#6F263D", secondary: "#FFB81C", logo: "/NBA-TeamLogos/cavaliers.jpg" },
  Pistons:    { primary: "#C8102E", secondary: "#1D42BA", logo: "/NBA-TeamLogos/pistons.jpg" },
  Pacers:     { primary: "#002D62", secondary: "#FDBB30", logo: "/NBA-TeamLogos/pacers.jpg" },
  Bucks:      { primary: "#00471B", secondary: "#EEE1C6", logo: "/NBA-TeamLogos/bucks.jpg" },
  Hawks:      { primary: "#E03A3E", secondary: "#C1D32F", logo: "/NBA-TeamLogos/hawks.jpg" },
  Hornets:    { primary: "#00788C", secondary: "#1D1160", logo: "/NBA-TeamLogos/hornets.jpg" },
  Heat:       { primary: "#98002E", secondary: "#F9A01B", logo: "/NBA-TeamLogos/heat.jpg" },
  Magic:      { primary: "#0077C0", secondary: "#C4CED4", logo: "/NBA-TeamLogos/magic.jpg" },
  Wizards:    { primary: "#002B5C", secondary: "#E31837", logo: "/NBA-TeamLogos/wizards.jpg" },
  Nuggets:    { primary: "#0E2240", secondary: "#FEC524", logo: "/NBA-TeamLogos/nuggets.jpg" },
  Timberwolves:{ primary:"#0C2340", secondary:"#78BE20", logo:"/NBA-TeamLogos/timberwolves.jpg" },
  Thunder:    { primary: "#007AC1", secondary: "#EF3B24", logo: "/NBA-TeamLogos/thunder.jpg" },
  "Trail Blazers": { primary: "#E03A3E", secondary: "#000000", logo: "/NBA-TeamLogos/trail-blazers.jpg" },
  Jazz:       { primary: "#002B5C", secondary: "#F9A01B", logo: "/NBA-TeamLogos/jazz.jpg" },
  Warriors:   { primary: "#FFC72C", secondary: "#1D428A", logo: "/NBA-TeamLogos/warriors.jpg" },
  Clippers:   { primary: "#C8102E", secondary: "#1D428A", logo: "/NBA-TeamLogos/clippers.jpg" },
  Lakers:     { primary: "#552583", secondary: "#FDB927", logo: "/NBA-TeamLogos/lakers.jpg" },
  Suns:       { primary: "#1D1160", secondary: "#E56020", logo: "/NBA-TeamLogos/suns.jpg" },
  Kings:      { primary: "#5A2D81", secondary: "#63727A", logo: "/NBA-TeamLogos/kings.jpg" },
  Mavericks:  { primary: "#00538C", secondary: "#002B5E", logo: "/NBA-TeamLogos/mavericks.jpg" },
  Rockets:    { primary: "#000000", secondary: "#CE1141", logo: "/NBA-TeamLogos/rockets.jpg" },
  Grizzlies:  { primary: "#5D76A9", secondary: "#12173F", logo: "/NBA-TeamLogos/grizzlies.jpg" },
  Pelicans:   { primary: "#85714D", secondary: "#0C2340", logo: "/NBA-TeamLogos/pelicans.jpg" },
  Spurs:      { primary: "#000000", secondary: "#C4CED4", logo: "/NBA-TeamLogos/spurs.jpg" },
};

function getTeamImage(teamName) {
  const team = players.find(t => t.name === teamName);
  return team ? team.img : "alt.png"; // fallback image
}

const ItemTypes = {
  PLAYER: 'player'
};

function getStat(player, key, livePoints) {
  // 1) For fantasy points, prefer the livePoints map
  if (key === 'fanPts' && livePoints[player.id]?.liveFanPts != null) {
    return livePoints[player.id].liveFanPts.toFixed(1);
  }

  // 2) If a game is in progress, use the raw liveStats we attached
  if (player.liveStats?.[key] != null) {
    return player.liveStats[key].toFixed(1);
  }

  // 3) Fall back to season averages
  const avgMap = {
    pts:   'avgPts',
    reb:   'avgReb',
    ast:   'avgAst',
    stl:   'avgStl',
    blk:   'avgBlk',
    tos:   'avgTos',
  };
  const avgProp = avgMap[key];
  if (avgProp && player[avgProp] != null) {
    return player[avgProp].toFixed(1);
  }

  return '0.0';
}

function DraggableBenchPlayer({ player }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { player },
    collect: m => ({ isDragging: !!m.isDragging() })
  }), [player]);

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <img
        src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
        onError={e => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
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

// --- new FIFA-style court card, STILL named DraggablePlayer ---
function DraggablePlayer({player, slotLabel, onInfo, onReturn, livePoints }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { player },
    collect: m => ({ isDragging: !!m.isDragging() })
  }), [player]);

  // fantasy points: live or avg
  const rawLive = livePoints[player.id]?.liveFanPts;

  // coerce to a number (parseFloat will give NaN if it can’t parse)
  const liveNum = parseFloat(rawLive);

  // pick live if they’re live *and* we got a valid number
  let fp;
  if (livePoints[player.id]?.isLive && !isNaN(liveNum)) {
    fp = liveNum.toFixed(1);
  } else if (player.avgFanPts != null) {
    // avgFanPts should be numeric, but guard just in case
    fp = Number(player.avgFanPts).toFixed(1);
  } else {
    fp = "0.0";
  }
  const logo = TEAM_CONFIG[player.team]?.logo || getTeamImage(player.team);

  return (
    <div
      ref={drag}
      className="YR_fifa-card"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="YR_fifa-header">
      <div className="YR_fifa-fantasy">
      {fp}
      {livePoints[player.id]?.isLive && (
        <span className="YR_live-indicator"> LIVE</span>
      )}
    </div>
        <div className="YR_fifa-position">
          {slotLabel} | {player.position}
          </div>
        <img
        src={logo}
        alt={player.team}
        className="YR_fifa-team-logo"
      />
      </div>
      <div className="YR_fifa-body">
        <img
          src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
          onError={e => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
          alt={player.name}
          className="YR_fifa-portrait"
        />
      </div>
      <div className="YR_fifa-name">
        {player.name}
      </div>
      <div className="YR_fifa-stats">
  <div>
    <span>PTS</span>
    <span>{getStat(player, 'pts', livePoints)}</span>
  </div>
  <div>
    <span>REB</span>
    <span>{getStat(player, 'reb', livePoints)}</span>
  </div>
  <div>
    <span>AST</span>
    <span>{getStat(player, 'ast', livePoints)}</span>
  </div>
  <div>
    <span>STL</span>
    <span>{getStat(player, 'stl', livePoints)}</span>
  </div>
  <div>
    <span>BLK</span>
    <span>{getStat(player, 'blk', livePoints)}</span>
  </div>
  <div>
    <span>TOS</span>
    <span>{getStat(player, 'tos', livePoints)}</span>
  </div>
</div>
      <div className="YR_fifa-buttons">
        <button className="YR_info-btn" onClick={e=>{e.stopPropagation(); onInfo(player);}}>Info</button>
        <button className="YR_info-btn" onClick={e=>{e.stopPropagation(); onReturn(player);}}>Return</button>
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
      {/* only show the slot name when it’s empty */}
      {!children && (
        <div className="YR_slot-label">
          {slot.label}
        </div>
      )}
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
  const [reloadState, setReloadState] = useState(false);
  const [leagueId, setLeagueId] = useState(0);
  const [leagueRoster, setLeagueRoster] = useState([]);
  
  const userId = user?.id;

  // Utility function to create a safe file name from player name
  const safeFileName = (name) => {
    return name.split(' ').join('_');
  };

  useEffect(() => {
    getLeagueId();
    getLeagueRoster();
  }, [leagueId]);

  useEffect(() => {
    loadRoster();
  }, [reloadState, leagueRoster]);

const getLeagueId = async () => {
  const leaguePlayersResponse = await axios.get(`http://localhost:5001/api/leagues/user`, {
    withCredentials: true
  });
  setLeagueId(leaguePlayersResponse.data[0].id);
}

const getLeagueRoster = async () => {
  const leaguePlayersResponse = await axios.get(`http://localhost:5001/api/roster/${userId}/${leagueId}`, {
    withCredentials: true
  });
  setLeagueRoster(leaguePlayersResponse.data);
}

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


async function loadRoster() {
  setLoading(true);
  try {
    // 1) grab your roster (with the 10 most recent Stats entries)
    // const resp = await axios.get(
    //   `http://localhost:5001/api/roster/${userId}`,
    //   { withCredentials: true }
    // );
    // const rosterData = resp.data;
    // console.log("League Rosters [original: ", rosterData);

    // 1) [REVISED] Grabs League Drafted Roster 
    const rosterData = leagueRoster;

    // 2) build up a flat list of “assignments” with our allowedPositions, etc.
    const assignments = rosterData.players.map(rp => {
      const raw    = rp.player;
      const isBench = rp.isBench;
      const position = rp.position;

      return {
        raw,
        isBench,
        position,
        allowedPositions: determineAllowedPositions(raw.positions || [])
      };
    });

    // 3) for *each* rostered player, fetch their gamelogs and compute ALL averages
    const enriched = await Promise.all(assignments.map(async ({ raw, isBench, position, allowedPositions }) => {
      // fetch the same gamelog you use in Player_List.jsx
      const logsRes = await axios.get(
        `http://localhost:5001/api/players/${raw.id}/gamelogs`,
        { withCredentials: true }
      );
      const logs = logsRes.data;

      // compute totals exactly like Player_List.jsx does:
      let totPts = 0, totReb = 0, totAst = 0, totStl = 0, totBlk = 0, totFP = 0, totTos = 0;
      logs.forEach(g => {
        totPts   += g.pts   ?? 0;
        totReb   += g.reb   ?? 0;
        totAst   += g.ast   ?? 0;
        totStl   += g.st   ?? 0;
        totBlk   += g.blk   ?? 0;
        totTos   += g.to    ?? 0;
        totFP    += g.fanPts?? 0;
      });
      const gp = logs.length || 1;

      // attach all of those back onto the player object
      const player = {
        ...raw,
        position: raw.positions?.join(', ') || '',
        allowedPositions,
        avgPts:   totPts   / gp,
        avgReb:   totReb   / gp,
        avgAst:   totAst   / gp,
        avgStl:   totStl   / gp,
        avgBlk:   totBlk   / gp,
        avgTos:   totTos   / gp,
        avgFanPts:totFP    / gp,
        // untouched: raw.avgFanPts, raw.liveFanPts, raw.isLive,
        // and raw.liveStats if you still want to pull anything there
      };

      return { player, isBench, position };
    }));

    // 4) slot them into your court or bench
    const updatedSlots = initialTeamSlots.map(s => ({ ...s, player: null }));
    const benchPlayers = [];
    const placed = new Set();

    enriched.forEach(({ player, isBench, position }) => {
      if (isBench) {
        benchPlayers.push(player);
        return;
      }
      // try exact position match
      const exactIdx = updatedSlots.findIndex(s => s.label === position && !s.player);
      if (exactIdx >= 0) {
        updatedSlots[exactIdx].player = player;
        placed.add(player.id);
        return;
      }
      // otherwise first available in allowedPositions
      for (let lbl of player.allowedPositions) {
        const j = updatedSlots.findIndex(s => s.label === lbl && !s.player);
        if (j >= 0) {
          updatedSlots[j].player = player;
          placed.add(player.id);
          return;
        }
      }
      // fallback bench
      benchPlayers.push(player);
    });

    setTeamSlots(updatedSlots);
    setBench(benchPlayers);
  } catch (err) {
    console.error("Error loading roster:", err);
  } finally {
    setLoading(false);
  }
}
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
      `http://localhost:5001/api/roster/movePlayer/${leagueId}`,
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
    getLeagueRoster();
    setReloadState(prev => !prev);
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
    await axios.post(`http://localhost:5001/api/roster/moveToBench/${leagueId}`, {
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
    alert(
      "Error moving player to bench: " +
      (error.response?.data?.error || error.message)
    );  }
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
  // if (loading) {
  //   return <div>Loading roster...</div>;
  // }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ backgroundColor: '#ffffff' }}>
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
                  <DraggablePlayer
                    player={slot.player}
                    slotLabel={slot.label}
                    onInfo={openPlayerModal}
                    onReturn={() => handleReturnToBench(slot.id)}
                    livePoints={livePoints}
                  />
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
                  <DraggablePlayer
                    key={player.id}
                    player={player}
                    slotLabel="Bench"
                    onInfo={openPlayerModal}
                    onReturn={() => {}}
                    livePoints={livePoints}
                  />
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
