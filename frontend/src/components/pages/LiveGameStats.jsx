import React, { useState, useEffect } from 'react';

const LiveGameStats = ({ playerName }) => {
  const [liveStats, setLiveStats] = useState(null);
  const [gameLog, setGameLog] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3000/getPlayerStats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ playerName })
        });
        const data = await response.json();
        if (data && data.game_in_progress) {
          setLiveStats(data);
          // Create a new row with current time and stats
          const newRow = {
            time: new Date().toLocaleTimeString(),
            points: data.points,
            assists: data.assists,
            rebounds: data.rebounds,
            steals: data.steals,
            blocks: data.blocks,
            turnovers: data.turnovers,
            fantasyPoints: data.fantasyPoints
          };
          setGameLog(prevLog => [...prevLog, newRow]);
        }
      } catch (error) {
        console.error('Error fetching live stats:', error);
      }
    };

    // Fetch immediately, then poll every 15 seconds
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [playerName]);

  return (
    <div>
      <h2>Live Stats for {playerName}</h2>
      {liveStats ? (
        <div>
          <p>Points: {liveStats.points}</p>
          <p>Assists: {liveStats.assists}</p>
          <p>Rebounds: {liveStats.rebounds}</p>
          <p>Steals: {liveStats.steals}</p>
          <p>Blocks: {liveStats.blocks}</p>
          <p>Turnovers: {liveStats.turnovers}</p>
          <p>Fantasy Points: {liveStats.fantasyPoints}</p>
        </div>
      ) : (
        <p>No live game data available</p>
      )}
      <h3>Game Log</h3>
      <table border="1" cellPadding="5" cellSpacing="0">
        <thead>
          <tr>
            <th>Time</th>
            <th>PTS</th>
            <th>AST</th>
            <th>REB</th>
            <th>ST</th>
            <th>BLK</th>
            <th>TO</th>
            <th>Fantasy Pts</th>
          </tr>
        </thead>
        <tbody>
          {gameLog.map((row, index) => (
            <tr key={index}>
              <td>{row.time}</td>
              <td>{row.points}</td>
              <td>{row.assists}</td>
              <td>{row.rebounds}</td>
              <td>{row.steals}</td>
              <td>{row.blocks}</td>
              <td>{row.turnovers}</td>
              <td>{row.fantasyPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LiveGameStats;
