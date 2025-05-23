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

  // coerce to a number (parseFloat will give NaN if it can't parse)
  const liveNum = parseFloat(rawLive);

  // pick live if they're live *and* we got a valid number
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
      {/* only show the slot name when it's empty */}
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
  const [rosterData, setRosterData] = useState(null);
  const [message, setMessage] = useState("");
  
  const userId = user?.id;

  // Utility function to create a safe file name from player name
  const safeFileName = (name) => {
    return name.split(' ').join('_');
  };

  useEffect(() => {
    getLeagueId();
  }, []);
  
  useEffect(() => {
    if (leagueId && userId) {
      getLeagueRoster();
    }
  }, [leagueId, userId]);
  
  useEffect(() => {
    if (leagueRoster && leagueId) {
      loadRoster();
    }
  }, [leagueRoster, leagueId]);

  const getLeagueId = async () => {
    try {
      const leaguePlayersResponse = await axios.get(`http://localhost:5001/api/leagues/user`, {
        withCredentials: true
      });
      if (leaguePlayersResponse.data && leaguePlayersResponse.data.length > 0) {
        setLeagueId(leaguePlayersResponse.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching league ID:", error);
    }
  }

  const getLeagueRoster = async () => {
    try {
      if (!leagueId || !userId) return;
      
      console.log(`Fetching roster for user ${userId} in league ${leagueId}`);
      
      const leaguePlayersResponse = await axios.get(`http://localhost:5001/api/roster/${userId}/${leagueId}`, {
        withCredentials: true
      });
      
      console.log("League roster response:", leaguePlayersResponse.data);
      setLeagueRoster(leaguePlayersResponse.data);
    } catch (error) {
      console.error("Error fetching league roster:", error);
      // If error, try to create an empty roster structure
      setLeagueRoster({ players: [] });
    }
  };

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/roster/${user?.id}`, {
          withCredentials: true
        });
        setRosterData(response.data);
      } catch (err) {
        console.error("Error loading roster:", err);
      }
    };
  
    if (user?.id) fetchRoster();
  }, [user?.id]);

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
    // Remove player from team slots
    setTeamSlots(prevSlots => 
      prevSlots.map(slot => 
        slot.player && slot.player.id === playerId 
          ? { ...slot, player: null } 
          : slot
      )
    );
    
    // Remove player from bench
    setBench(prevBench => prevBench.filter(p => p.id !== playerId));
    
    // Trigger a reload of the roster data
    loadRoster();
  };


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
      // Make sure we have a leagueId before trying to load roster
      if (!leagueId) {
        console.log("No league ID available yet");
        setLoading(false);
        return;
      }
  
      // Use the league-specific roster endpoint
      const rosterData = leagueRoster;
      if (!rosterData || !rosterData.players) {
        console.log("No roster data available");
        setLoading(false);
        return;
      }

      // 2) build up a flat list of "assignments" with our allowedPositions, etc.
      const assignments = rosterData.players.map(rp => {
        const raw = rp.player;
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
          totStl   += g.st    ?? 0;
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
        };

        return { player, isBench, position };
      }));

      // Create position mappings for the optimal lineup
      const positionSlots = {
        PG: { slotId: 1, filled: false, player: null },
        SG: { slotId: 2, filled: false, player: null },
        G: { slotId: 3, filled: false, player: null },
        SF: { slotId: 4, filled: false, player: null },
        PF: { slotId: 5, filled: false, player: null },
        F: { slotId: 6, filled: false, player: null },
        "C-1": { slotId: 7, filled: false, player: null },
        "C-2": { slotId: 8, filled: false, player: null },
        "Util-1": { slotId: 9, filled: false, player: null },
        "Util-2": { slotId: 10, filled: false, player: null }
      };

      // Create a copy of enriched players to manipulate
      const players = [...enriched];
      
      // Sort players by average fantasy points (highest first)
      players.sort((a, b) => b.player.avgFanPts - a.player.avgFanPts);
      
      // Group players by primary position
      const positionGroups = {
        PG: players.filter(p => p.player.positions && p.player.positions.includes("PG")),
        SG: players.filter(p => p.player.positions && p.player.positions.includes("SG")),
        SF: players.filter(p => p.player.positions && p.player.positions.includes("SF")),
        PF: players.filter(p => p.player.positions && p.player.positions.includes("PF")),
        C: players.filter(p => p.player.positions && p.player.positions.includes("C")),
      };

      // Helper to check if a player has already been assigned
      const assignedPlayers = new Set();
      
      // Function to handle player assignment
      const assignPlayerToSlot = (player, positionKey) => {
        if (!player || assignedPlayers.has(player.player.id)) return false;
        
        positionSlots[positionKey].player = player.player;
        positionSlots[positionKey].filled = true;
        assignedPlayers.add(player.player.id);
        return true;
      };

      // Assign primary positions first (PG, SG, SF, PF, C)
      if (positionGroups.PG.length > 0) {
        assignPlayerToSlot(positionGroups.PG[0], "PG");
      }
      
      if (positionGroups.SG.length > 0) {
        // Find first player not already assigned
        const availableSG = positionGroups.SG.find(p => !assignedPlayers.has(p.player.id));
        if (availableSG) {
          assignPlayerToSlot(availableSG, "SG");
        }
      }
      
      if (positionGroups.SF.length > 0) {
        const availableSF = positionGroups.SF.find(p => !assignedPlayers.has(p.player.id));
        if (availableSF) {
          assignPlayerToSlot(availableSF, "SF");
        }
      }
      
      if (positionGroups.PF.length > 0) {
        const availablePF = positionGroups.PF.find(p => !assignedPlayers.has(p.player.id));
        if (availablePF) {
          assignPlayerToSlot(availablePF, "PF");
        }
      }
      
      if (positionGroups.C.length > 0) {
        const availableC1 = positionGroups.C.find(p => !assignedPlayers.has(p.player.id));
        if (availableC1) {
          assignPlayerToSlot(availableC1, "C-1");
          
          // Try to find a second center for C-2
          const availableC2 = positionGroups.C.find(p => !assignedPlayers.has(p.player.id));
          if (availableC2) {
            assignPlayerToSlot(availableC2, "C-2");
          }
        }
      }

      // Assign combo positions (G, F)
      // For G slot, look for best available PG or SG
      if (!positionSlots.G.filled) {
        const availableG = players.find(p => 
          !assignedPlayers.has(p.player.id) && 
          p.player.positions && 
          (p.player.positions.includes("PG") || p.player.positions.includes("SG"))
        );
        if (availableG) {
          assignPlayerToSlot(availableG, "G");
        }
      }
      
      // For F slot, look for best available SF or PF
      if (!positionSlots.F.filled) {
        const availableF = players.find(p => 
          !assignedPlayers.has(p.player.id) && 
          p.player.positions && 
          (p.player.positions.includes("SF") || p.player.positions.includes("PF"))
        );
        if (availableF) {
          assignPlayerToSlot(availableF, "F");
        }
      }

      // Assign utility positions with best remaining players
      if (!positionSlots["Util-1"].filled) {
        const availableUtil1 = players.find(p => !assignedPlayers.has(p.player.id));
        if (availableUtil1) {
          assignPlayerToSlot(availableUtil1, "Util-1");
        }
      }
      
      if (!positionSlots["Util-2"].filled) {
        const availableUtil2 = players.find(p => !assignedPlayers.has(p.player.id));
        if (availableUtil2) {
          assignPlayerToSlot(availableUtil2, "Util-2");
        }
      }

      // Create the final team slots
      const updatedSlots = initialTeamSlots.map(slot => {
        const posKey = Object.keys(positionSlots).find(key => positionSlots[key].slotId === slot.id);
        if (posKey && positionSlots[posKey].filled) {
          return {
            ...slot,
            player: positionSlots[posKey].player
          };
        }
        return { ...slot, player: null };
      });

      // Remaining players go to the bench
      const benchPlayers = players.filter(p => !assignedPlayers.has(p.player.id))
                                 .map(p => p.player);

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
      );  
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
              // Update the bench list when a player is dropped
              setBench(prevBench => prevBench.filter(p => p.id !== playerId));
              
              // Also check and update team slots if needed
              setTeamSlots(prevSlots => 
                prevSlots.map(slot => 
                  slot.player && slot.player.id === playerId 
                    ? { ...slot, player: null } 
                    : slot
                )
              );
              
              // Reload the roster data from the server
              loadRoster();
            }}
          />
        )}
      </div>
    </DndProvider>
  );
}

export default YourRoster;