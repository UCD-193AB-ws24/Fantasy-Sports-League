import React, { useState } from 'react';
import MenuBar from '../MenuBar';
import PlayerStatsModal from './PlayerStats'; // same modal used in YourRoster
import './Matchups.css';

// Hardcoded list of days
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Example matchup info
const matchupInfo = {
  myTeam: {
    name: "My Team",
    projectedScore: 100,
    currentScore: 95,
    gamesPlayed: 5,
    gamesRemaining: 2,
  },
  opponent: {
    name: "Opponent Team",
    projectedScore: 98,
    currentScore: 92,
    gamesPlayed: 5,
    gamesRemaining: 2,
  },
};

// Hardcoded court layouts per day (same layout for each day, for demo)
const defaultLayout = {
  myTeam: [
    { position: "PG", player: "-" },
    { position: "G", player: "-" },
    { position: "SG", player: "-" },
    { position: "SF", player: "-" },
    { position: "PF", player: "-" },
    { position: "F",  player: "-" },
    { position: "C1", player: "-" },
    { position: "C2", player: "-" },
    { position: "Util1", player: "-" },
    { position: "Util2",  player: "-" },
  ],
  opponent: [
    { position: "PG", player: "-" },
    { position: "G", player: "-" },
    { position: "SG", player: "-" },
    { position: "SF", player: "-" },
    { position: "PF", player: "-" },
    { position: "F",  player: "-" },
    { position: "C1", player: "-" },
    { position: "C2", player: "-" },
    { position: "Util1", player: "-" },
    { position: "Util2",  player: "-" },
  ],
};

// Dummy data for the comparison table
const teamComparison = [
  { 
    position: "PG", 
    myPlayer: { name: "Player A", pts: 25, reb: 4, ast: 5, blk: 0, st: 2, to: 3 }, 
    opponentPlayer: { name: "Player V", pts: 20, reb: 3, ast: 7, blk: 1, st: 1, to: 2 } 
  },
  { 
    position: "SG", 
    myPlayer: { name: "Player B", pts: 18, reb: 5, ast: 4, blk: 0, st: 1, to: 2 }, 
    opponentPlayer: { name: "Player W", pts: 22, reb: 6, ast: 3, blk: 0, st: 2, to: 1 } 
  },
  { 
    position: "SF", 
    myPlayer: { name: "Player C", pts: 30, reb: 7, ast: 6, blk: 1, st: 1, to: 3 }, 
    opponentPlayer: { name: "Player X", pts: 28, reb: 8, ast: 5, blk: 0, st: 2, to: 2 } 
  },
  { 
    position: "PF", 
    myPlayer: { name: "Player D", pts: 15, reb: 10, ast: 2, blk: 2, st: 1, to: 2 }, 
    opponentPlayer: { name: "Player Y", pts: 17, reb: 9, ast: 3, blk: 1, st: 1, to: 3 } 
  },
  { 
    position: "C", 
    myPlayer: { name: "Player E", pts: 20, reb: 12, ast: 2, blk: 3, st: 0, to: 1 }, 
    opponentPlayer: { name: "Player Z", pts: 19, reb: 11, ast: 1, blk: 2, st: 0, to: 2 } 
  },
];

const Matchups = () => {
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [modalPlayer, setModalPlayer] = useState(null);

  const handleDayClick = (day) => {
    setSelectedDay(day);
  };

  // Opens the player info modal
  const openPlayerModal = (player) => {
    setModalPlayer(player);
  };

  // Closes the modal
  const closeModal = () => {
    setModalPlayer(null);
  };

  // Using the same layout for all days in this demo
  const layout = defaultLayout;

  return (
    <>
      <MenuBar />

      <div className="Matchups_page">
        {/* Header: Team info, projected/current scores, day tabs */}
        <div className="Matchups_header">
          <div className="Matchups_matchup-info">
            <div className="Matchups_team-info">
              <h2>{matchupInfo.myTeam.name}</h2>
              {/* Big score text */}
              <h1 className="Matchups_big-score">{matchupInfo.myTeam.currentScore}</h1>

              <p>Projected: {matchupInfo.myTeam.projectedScore}</p>
              <p>
                Games: {matchupInfo.myTeam.gamesPlayed} played,{" "}
                {matchupInfo.myTeam.gamesRemaining} remaining
              </p>
            </div>
            <div className="Matchups_vs">
              <h2>VS</h2>
            </div>
            <div className="Matchups_team-info">
              <h2>{matchupInfo.opponent.name}</h2>
              {/* Big score text */}
              <h1 className="Matchups_big-score">{matchupInfo.opponent.currentScore}</h1>

              <p>Projected: {matchupInfo.opponent.projectedScore}</p>
              <p>
                Games: {matchupInfo.opponent.gamesPlayed} played,{" "}
                {matchupInfo.opponent.gamesRemaining} remaining
              </p>
            </div>
          </div>

          <div className="Matchups_day-tabs">
            {daysOfWeek.map((day) => (
              <button
                key={day}
                className={`Matchups_day-tab ${
                  selectedDay === day ? "Matchups_active-tab" : ""
                }`}
                onClick={() => handleDayClick(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Two Courts: one for my team, one for opponent */}
        <div className="Matchups_courts">
          <div className="Matchups_court-section">
            <h3>
              {matchupInfo.myTeam.name} - Court Layout for {selectedDay}
            </h3>
            <div className="Matchups_court-container">
              <img
                src="/BasketballCourt.png"
                alt="Court"
                className="Matchups_court-image"
              />
              {layout.myTeam.map((slot, index) => (
                <div
                  key={index}
                  className={`Matchups_team-slot Matchups_slot-${slot.position.toLowerCase()}`}
                >
                  <span className="Matchups_slot-label">{slot.position}</span>
                  <span className="Matchups_slot-player">{slot.player}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="Matchups_court-section">
            <h3>
              {matchupInfo.opponent.name} - Court Layout for {selectedDay}
            </h3>
            <div className="Matchups_court-container">
              <img
                src="/BasketballCourt.png"
                alt="Court"
                className="Matchups_court-image"
              />
              {layout.opponent.map((slot, index) => (
                <div
                  key={index}
                  className={`Matchups_team-slot Matchups_slot-${slot.position.toLowerCase()}`}
                >
                  <span className="Matchups_slot-label">{slot.position}</span>
                  <span className="Matchups_slot-player">{slot.player}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Centered Comparison Table */}
        <div className="Matchups_comparison-table">
          <h3>Player Comparison</h3>
          <table>
            <thead>
              <tr>
                <th>My Player</th>
                <th>PTS</th>
                <th>REB</th>
                <th>AST</th>
                <th>BLK</th>
                <th>ST</th>
                <th>TO</th>
                <th>Position</th>
                <th>Opponent Player</th>
                <th>PTS</th>
                <th>REB</th>
                <th>AST</th>
                <th>BLK</th>
                <th>ST</th>
                <th>TO</th>
              </tr>
            </thead>
            <tbody>
              {teamComparison.map((item, index) => (
                <tr key={index}>
                  {/* My Player */}
                  <td>
                    {item.myPlayer.name}
                    <button
                      className="Matchups_info-btn"
                      onClick={() => openPlayerModal(item.myPlayer)}
                    >
                      <img
                        src="/infoIcon.png"
                        alt="info"
                        className="Matchups_info-icon"
                      />
                    </button>
                  </td>
                  <td>{item.myPlayer.pts}</td>
                  <td>{item.myPlayer.reb}</td>
                  <td>{item.myPlayer.ast}</td>
                  <td>{item.myPlayer.blk}</td>
                  <td>{item.myPlayer.st}</td>
                  <td>{item.myPlayer.to}</td>

                  {/* Position in the middle */}
                  <td>{item.position}</td>

                  {/* Opponent Player */}
                  <td>
                    {item.opponentPlayer.name}
                    <button
                      className="Matchups_info-btn"
                      onClick={() => openPlayerModal(item.opponentPlayer)}
                    >
                      <img
                        src="/infoIcon.png"
                        alt="info"
                        className="Matchups_info-icon"
                      />
                    </button>
                  </td>
                  <td>{item.opponentPlayer.pts}</td>
                  <td>{item.opponentPlayer.reb}</td>
                  <td>{item.opponentPlayer.ast}</td>
                  <td>{item.opponentPlayer.blk}</td>
                  <td>{item.opponentPlayer.st}</td>
                  <td>{item.opponentPlayer.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats modal for whichever player is clicked */}
      {modalPlayer && (
        <PlayerStatsModal player={modalPlayer} onClose={closeModal} />
      )}
    </>
  );
};

export default Matchups;
