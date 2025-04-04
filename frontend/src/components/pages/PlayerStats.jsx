import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PlayerStats.css';
import { useContext } from 'react';
import { AuthContext } from "../../AuthContext";

function PlayerStatsModal({ player, onClose, isRoster = false, onPlayerDropped = () => {} }) {
  const [gameLog, setGameLog] = useState([]);
  const { user } = useContext(AuthContext);
  const userId = user?.id;

  // Fetch the gamelogs for the selected player.
  useEffect(() => {
    axios.get(`http://localhost:5001/api/players/${player.id}/gamelogs`, {
      withCredentials: true
    })
      .then(response => setGameLog(response.data))
      .catch(err => console.error(err));
  }, [player.id]);
  
// Updated handleDropPlayer function for PlayerStats.jsx
const handleDropPlayer = async () => {
  if (!confirm(`Are you sure you want to drop ${player.name} from your roster?`)) {
    return;
  }
  try {
    const response = await axios.delete('http://localhost:5001/api/roster/removePlayer', {
      data: { userId, playerId: player.id },
      withCredentials: true
    });
    
    alert(response.data.message);
    onClose(); // Close the modal first
    
    // Use a short timeout to ensure the modal is closed before parent component updates
    setTimeout(() => {
      onPlayerDropped(player.id); // Then notify parent component to update
    }, 100);
  } catch (error) {
    console.error("Error dropping player:", error);
    alert(error.response?.data?.error || "Error dropping player");
  }
};
useEffect(() => {
  fetch('/profile_photo/imageConfig.json')
    .then(res => res.json())
    .then(config => {
      console.log("Loaded imageConfig:", config);
      setImageConfig(config);
    })
    .catch(err => console.error("Error loading image config:", err));
}, []);
  const normalizeString = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  // Utility function to create a safe file name from player name
  const safeFileName = (name) => {
    return name.split(' ').join('_');
  };
  const [imageConfig, setImageConfig] = useState({});
  const configKey = `${safeFileName(player.name)}_profile`;
  console.log(`Config key for player "${player.name}":`, configKey);
  const config = imageConfig[configKey] || {};
  const objectPosition = config.objectPosition;
  const imageZoom = config.imageZoom;

  // Fallback styling and team logo based on team.
  let primaryColor = (player.teamColors && player.teamColors[0]) || "#007bff";
  let secondaryColor = (player.teamColors && player.teamColors[1]) || "#0056b3";
  let teamLogo = player.teamLogo || "default-team-logo.png";
  let positionsText = (player.positions && player.positions.length > 0) ? player.positions.join(', ') : '-';
  if (player.team == "Celtics") {
    primaryColor = "#007A33";
    secondaryColor = "#BA9653";
    teamLogo = "public/NBA-TeamLogos/celtics.jpg";
  } else if (player.team == "Nets") {
    primaryColor = "#000000";
    secondaryColor = "#FFFFFF";
    teamLogo = "public/NBA-TeamLogos/nets.jpg";
  } else if (player.team == "Knicks") {
    primaryColor = "#006BB6";
    secondaryColor = "#F58426";
    teamLogo = "public/NBA-TeamLogos/knicks.jpg";
  } else if (player.team == "76ers") {
    primaryColor = "#006BB6";
    secondaryColor = "#ED174C";
    teamLogo = "public/NBA-TeamLogos/76ers.jpg";
  } else if (player.team == "Raptors") {
    primaryColor = "#CE1141";
    secondaryColor = "#000000";
    teamLogo = "public/NBA-TeamLogos/raptors.jpg";
  } else if (player.team == "Bulls") {
    primaryColor = "#CE1141";
    secondaryColor = "#000000";
    teamLogo = "public/NBA-TeamLogos/bulls.jpg";
  } else if (player.team == "Cavaliers") {
    primaryColor = "#6F263D";
    secondaryColor = "#FFB81C";
    teamLogo = "public/NBA-TeamLogos/cavaliers.jpg";
  } else if (player.team == "Pistons") {
    primaryColor = "#C8102E";
    secondaryColor = "#1D42BA";
    teamLogo = "public/NBA-TeamLogos/pistons.jpg";
  } else if (player.team == "Pacers") {
    primaryColor = "#002D62";
    secondaryColor = "#FDBB30";
    teamLogo = "public/NBA-TeamLogos/pacers.jpg";
  } else if (player.team == "Bucks") {
    primaryColor = "#00471B";
    secondaryColor = "#EEE1C6";
    teamLogo = "public/NBA-TeamLogos/bucks.jpg";
  } else if (player.team == "Hawks") {
    primaryColor = "#E03A3E";
    secondaryColor = "#C1D32F";
    teamLogo = "public/NBA-TeamLogos/hawks.jpg";
  } else if (player.team == "Hornets") {
    primaryColor = "#00788C";
    secondaryColor = "#1D1160";
    teamLogo = "public/NBA-TeamLogos/hornets.jpg";
  } else if (player.team == "Heat") {
    primaryColor = "#98002E";
    secondaryColor = "#F9A01B";
    teamLogo = "public/NBA-TeamLogos/heat.jpg";
  } else if (player.team == "Magic") {
    primaryColor = "#0077C0";
    secondaryColor = "#C4CED4";
    teamLogo = "public/NBA-TeamLogos/magic.jpg";
  } else if (player.team == "Wizards") {
    primaryColor = "#002B5C";
    secondaryColor = "#E31837";
    teamLogo = "public/NBA-TeamLogos/wizards.jpg";
  } else if (player.team == "Nuggets") {
    primaryColor = "#0E2240";
    secondaryColor = "#FEC524";
    teamLogo = "public/NBA-TeamLogos/nuggets.jpg";
  } else if (player.team == "Timberwolves") {
    primaryColor = "#0C2340";
    secondaryColor = "#78BE20";
    teamLogo = "public/NBA-TeamLogos/timberwolves.jpg";
  } else if (player.team == "Thunder") {
    primaryColor = "#007AC1";
    secondaryColor = "#EF3B24";
    teamLogo = "public/NBA-TeamLogos/thunder.jpg";
  } else if (player.team == "Trail Blazers") {
    primaryColor = "#E03A3E";
    secondaryColor = "#000000";
    teamLogo = "public/NBA-TeamLogos/trail-blazers.jpg";
  } else if (player.team == "Jazz") {
    primaryColor = "#002B5C";
    secondaryColor = "#F9A01B";
    teamLogo = "public/NBA-TeamLogos/jazz.jpg";
  } else if (player.team == "Warriors") {
    primaryColor = "#FFC72C";
    secondaryColor = "#1D428A";
    teamLogo = "public/NBA-TeamLogos/warriors.jpg";
  } else if (player.team == "Clippers") {
    primaryColor = "#C8102E";
    secondaryColor = "#1D428A";
    teamLogo = "public/NBA-TeamLogos/clippers.jpg";
  } else if (player.team == "Lakers") {
    primaryColor = "#552583";
    secondaryColor = "#FDB927";
    teamLogo = "public/NBA-TeamLogos/lakers.jpg";
  } else if (player.team == "Suns") {
    primaryColor = "#1D1160";
    secondaryColor = "#E56020";
    teamLogo = "public/NBA-TeamLogos/suns.jpg";
  } else if (player.team == "Kings") {
    primaryColor = "#5A2D81";
    secondaryColor = "#63727A";
    teamLogo = "public/NBA-TeamLogos/kings.jpg";
  } else if (player.team == "Mavericks") {
    primaryColor = "#00538C";
    secondaryColor = "#002B5E";
    teamLogo = "public/NBA-TeamLogos/mavericks.jpg";
  } else if (player.team == "Rockets") {
    primaryColor = "#000000";
    secondaryColor = "#CE1141";
    teamLogo = "public/NBA-TeamLogos/rockets.jpg";
  } else if (player.team == "Grizzlies") {
    primaryColor = "#5D76A9";
    secondaryColor = "#12173F";
    teamLogo = "public/NBA-TeamLogos/grizzlies.jpg";
  } else if (player.team == "Pelicans") {
    primaryColor = "#85714D";
    secondaryColor = "#0C2340";
    teamLogo = "public/NBA-TeamLogos/pelicans.jpg";
  } else if (player.team == "Spurs") {
    primaryColor = "#000000";
    secondaryColor = "#C4CED4";
    teamLogo = "public/NBA-TeamLogos/spurs.jpg";
  }

  return (
    <div className="PS_modal-overlay" onClick={onClose}>
      <div className="PS_modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="PS_close-button" onClick={onClose}>×</button>
        <div className="PS_container">
          <div className="PS_content-wrapper">
            <div 
              className="PS_player-image-container"
              style={{ borderImage: `linear-gradient(to bottom, ${primaryColor}, ${secondaryColor}) 1` }}
            >
              <img
                src={`/profile_photo/${safeFileName(player.name)}_profile.jpg`}
                onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                className="PS_player-image"
                style={{
                  objectFit: 'cover',            // Crop to fill container
                  objectPosition: objectPosition,  // Use custom object position from config
                  transform: `scale(${imageZoom})` // Apply custom zoom from config
                }}
              />
            </div>
            <div className="PS_right-content">
              <div className="PS_player-info-banner">
                <div
                  className="PS_player-banner"
                  style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
                >
                  <img src={teamLogo} alt="Team Logo" className="PS_team-logo" />
                  <div className="PS_player-info">
                    <h1>{player.name} | #{player.jersey || "?"}</h1>
                    <p>{positionsText} | {player.team || "Team Name"}</p>
                    <div className="PS_stats">
                      <span>Rank: <strong>{player.rank ?? "?"}</strong></span>
                      <span>GP: <strong>{player.gamesPlayed ?? "?"}</strong></span>
                      <span>Avg Fan Pts: <strong>{player.avgFanPts ? player.avgFanPts.toFixed(1) : "?"}</strong></span>
                      <span>PTS: <strong>{player.avgPts ? player.avgPts.toFixed(1) : "?"}</strong></span>
                      <span>REB: <strong>{player.avgReb ? player.avgReb.toFixed(1) : "?"}</strong></span>
                      <span>AST: <strong>{player.avgAst ? player.avgAst.toFixed(1) : "?"}</strong></span>
                      <span>STL: <strong>{player.avgStl ? player.avgStl.toFixed(1) : "?"}</strong></span>
                      <span>BLK: <strong>{player.avgBlk ? player.avgBlk.toFixed(1) : "?"}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="PS_bottom-content">
                <div className="PS_main-content">
                  <div className="PS_tabs">
                    <span className="PS_active-tab">Game Log</span>
                    <span>Season Stats</span>
                    <span>Fantasy Guide</span>
                    <span>Player History</span>
                  </div>
                  <div
                    className="PS_upcoming-game"
                    style={{
                      background: player.upcomingGame?.opponentColors
                        ? `linear-gradient(to left, ${player.upcomingGame.opponentColors[0]}, ${player.upcomingGame.opponentColors[1]})`
                        : undefined,
                    }}
                  >
                    <img
                      src={player.upcomingGame?.opponentLogo || "default-opponent-logo.png"}
                      alt="Opponent Logo"
                      className="PS_opponent-logo"
                    />
                    <div className="PS_game-info">
                      <p><strong>Upcoming Game:</strong> {player.upcomingGame?.gameDate || "?"}</p>
                      <p><strong>Opponent:</strong> {player.upcomingGame?.opponent || "?"}</p>
                      <p><strong>Team Record:</strong> {player.upcomingGame?.teamRecord || "?"}</p>
                    </div>
                  </div>
                  <div className="PS_game-log">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Opp</th>
                          <th>Status</th>
                          <th>Fan Pts</th>
                          <th>MIN</th>
                          <th>PTS</th>
                          <th>REB</th>
                          <th>AST</th>
                          <th>ST</th>
                          <th>BLK</th>
                          <th>TO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameLog.length > 0 ? (
                          gameLog.map((game, index) => (
                            <tr key={index}>
                              <td>{game.date}</td>
                              <td>{game.opp}</td>
                              <td>{game.finalScore || "Final"}</td>
                              <td>{game.fanPts}</td>
                              <td>{game.min}</td>
                              <td>{game.pts}</td>
                              <td>{game.reb}</td>
                              <td>{game.ast}</td>
                              <td>{game.st}</td>
                              <td>{game.blk}</td>
                              <td>{game.to}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="11">No game log available.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="PS_advanced-stats">
                  <h2>Advanced Stats / Other Features</h2>
                  <p><strong>PER:</strong> {player.advancedStats?.per || "?"}</p>
                  <p><strong>Usage Rate:</strong> {player.advancedStats?.usageRate || "?"}</p>
                  <p><strong>True Shooting %:</strong> {player.advancedStats?.trueShooting || "?"}</p>
                  <p><strong>Win Shares:</strong> {player.advancedStats?.winShares || "?"}</p>
                  <p><strong>Box Plus-Minus:</strong> {player.advancedStats?.boxPlusMinus || "?"}</p>
                  <p><strong>VORP:</strong> {player.advancedStats?.vorp || "?"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>    
      </div>
    </div>
  );
}

export default PlayerStatsModal;