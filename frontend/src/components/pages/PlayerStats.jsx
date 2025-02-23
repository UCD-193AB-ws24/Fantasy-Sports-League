import React from 'react';
import './PlayerStats.css';

function PlayerStatsModal({ player, onClose }) {
  return (
    <div className="PS_modal-overlay" onClick={onClose}>
      <div className="PS_modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="PS_close-button" onClick={onClose}>×</button>
        
        <div className="PS_container">
          <div className="PS_content-wrapper">
            {/* LEFT COLUMN: Player Image with dynamic team border */}
            <div 
              className="PS_player-image-container"
              style={{ borderImage: `linear-gradient(to bottom, ${player.teamColors[0]}, ${player.teamColors[1]}) 1` }}
            >
              <img
                src={player.statsImage}
                alt={player.name}
                className="PS_player-image"
                style={{
                  objectPosition: player.objectPosition || "center",
                  transform: `scale(${player.imageZoom || 1})`
                }}
              />
            </div>

            {/* RIGHT COLUMN: Top Banner + Bottom Content */}
            <div className="PS_right-content">
              {/* Top Banner: Dynamic Player Info */}
              <div className="PS_player-info-banner">
                <div
                  className="PS_player-banner"
                  style={{
                    background: `linear-gradient(to right, ${player.teamColors[0]}, ${player.teamColors[1]})`
                  }}
                >
                  <img
                    src={player.teamLogo || "default-team-logo.png"}
                    alt="Team Logo"
                    className="PS_team-logo"
                  />
                  <div className="PS_player-info">
                    <h1>{player.name} | #{player.jersey || "?"}</h1>
                    <p>{player.position} | {player.team || "Team Name"}</p>
                    <div className="PS_stats">
                      <span>Rank: <strong>{player.stats?.rank || "?"}</strong></span>
                      <span>GP: <strong>{player.stats?.gp || "?"}</strong></span>
                      <span>PTS: <strong>{player.stats?.pts || "?"}</strong></span>
                      <span>REB: <strong>{player.stats?.reb || "?"}</strong></span>
                      <span>AST: <strong>{player.stats?.ast || "?"}</strong></span>
                      <span>ST: <strong>{player.stats?.st || "?"}</strong></span>
                      <span>BLK: <strong>{player.stats?.blk || "?"}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Content: Tabs, Upcoming Game, Game Log, Advanced Stats */}
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
                        {player.gameLog?.map((game, index) => (
                          <tr key={index}>
                            <td>{game.date}</td>
                            <td>{game.opp}</td>
                            <td className={game.status.startsWith("W") ? "PS_win" : ""}>{game.status}</td>
                            <td>{game.fanPts}</td>
                            <td>{game.min}</td>
                            <td>{game.pts}</td>
                            <td>{game.reb}</td>
                            <td>{game.ast}</td>
                            <td>{game.st}</td>
                            <td>{game.blk}</td>
                            <td>{game.to}</td>
                          </tr>
                        ))}
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
