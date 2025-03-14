import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './PublicLeague.css';

const PublicLeague = () => {
  const [standings, setStandings] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    // Fetch league standings
    axios.get('http://localhost:5001/api/leagues/1/standings') // Ensure the URL is correct
      .then(response => {
        if (Array.isArray(response.data)) {
          setStandings(response.data);
        } else {
          console.error('Standings response is not an array:', response.data);
        }
      })
      .catch(error => console.error('Error fetching standings:', error));

    // Fetch player stats
    axios.get('http://localhost:5001/api/players/stats') // Ensure the URL is correct
      .then(response => setPlayerStats(response.data))
      .catch(error => console.error('Error fetching player stats:', error));

    // Fetch list of teams
    axios.get('http://localhost:5001/api/teams') // Ensure the URL is correct
      .then(response => setTeams(response.data))
      .catch(error => console.error('Error fetching teams:', error));
  }, []);

  return (
    <div className="public-league-container">
      <h1>Fantasy Basketball League</h1>
      
      <section className="standings-section">
        <h2>League Standings</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Wins</th>
              <th>Losses</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(standings) && standings.map((team, index) => (
              <tr key={team.id}>
                <td>{index + 1}</td>
                <td>{team.name}</td>
                <td>{team.wins}</td>
                <td>{team.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="player-stats-section">
        <h2>Player Stats</h2>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Points</th>
              <th>Rebounds</th>
              <th>Assists</th>
            </tr>
          </thead>
          <tbody>
            {playerStats.map(player => (
              <tr key={player.id}>
                <td>{player.name}</td>
                <td>{player.points}</td>
                <td>{player.rebounds}</td>
                <td>{player.assists}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="teams-section">
        <h2>Teams</h2>
        <ul>
          {teams.map(team => (
            <li key={team.id}>{team.name}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default PublicLeague;
