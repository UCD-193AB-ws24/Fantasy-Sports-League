import { useContext } from 'react';
import { AuthContext } from "../../AuthContext";
import React, { useState, useEffect } from 'react';
import MenuBar from '../MenuBar';
import PlayerStatsModal from './PlayerStats';
import './Player_List.css';
import axios from 'axios';

const Player_List = () => {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [roster, setRoster] = useState([]);
  
  const { user } = useContext(AuthContext);
  const userId = user?.id;

  // Normalize string for better search functionality
  const normalizeString = (str) => {
    return str
      .normalize('NFD')                          // decompose accented letters
      .replace(/[\u0300-\u036f]/g, "")           // remove diacritics
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")  // remove punctuation
      .replace(/\s+/g, " ")                      // normalize spaces
      .trim()
      .toLowerCase();
  };

  // Utility function to create a safe file name from player name
  const safeFileName = (name) => {
    return name.split(' ').join('_');
  };

  useEffect(() => {
    // 1) Fetch all league players
    fetch('http://localhost:5001/api/leagues/1/players')
      .then(res => res.json())
      .then(async (fetchedPlayers) => {
        console.log('Fetched league players:', fetchedPlayers);

        // 2) For each player, fetch their game logs and compute averages in the front end
        const updatedPlayers = await Promise.all(
          fetchedPlayers.map(async (p) => {
            try {
              // Fetch that player's logs
              const logsRes = await fetch(`http://localhost:5001/api/players/${p.id}/gamelogs`);
              const logsData = await logsRes.json();

              // Compute sums for points, rebounds, etc.
              let totalPoints = 0, totalReb = 0, totalAst = 0, totalStl = 0, totalBlk = 0, totalFP = 0;
              logsData.forEach(g => {
                totalPoints += g.pts ?? 0;
                totalReb += g.reb ?? 0;
                totalAst += g.ast ?? 0;
                totalStl += g.st ?? 0;
                totalBlk += g.blk ?? 0;
                totalFP += g.fanPts ?? 0;
              });

              const gp = logsData.length;
              p.gamesPlayed = gp;
              p.avgPts = gp > 0 ? totalPoints / gp : 0;
              p.avgReb = gp > 0 ? totalReb / gp : 0;
              p.avgAst = gp > 0 ? totalAst / gp : 0;
              p.avgStl = gp > 0 ? totalStl / gp : 0;
              p.avgBlk = gp > 0 ? totalBlk / gp : 0;
              p.avgFanPts = gp > 0 ? totalFP / gp : 0;

            } catch (err) {
              console.error(`Error fetching logs for ${p.name}:`, err);
              // If logs can't be fetched, leave them as 0 or undefined
            }

            return p;
          })
        );

        setPlayers(updatedPlayers);
      })
      .catch(err => console.error(err));
      
    // Fetch the user's roster to know which players are already added
    fetchRoster();
  }, []);
  
  const fetchRoster = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/roster/${userId}`, {
        withCredentials: true
      });
      const rosterData = response.data;
      
      // Create array of player IDs on roster for easy checking
      const rosterPlayerIds = rosterData.players.map(rp => rp.player.id);
      setRoster(rosterPlayerIds);
    } catch (error) {
      console.error("Error fetching roster:", error);
    }
  };

  // Filter by search term using normalized strings
  const filteredPlayers = players.filter(player =>
    normalizeString(player.name).includes(normalizeString(search))
  );

  const handleInfoClick = (player) => {
    setSelectedPlayer(player);
  };
  
  const handleAddToRoster = async (player, event) => {
    event.stopPropagation(); // Prevent triggering other click handlers
    
    try {
      const response = await axios.post('http://localhost:5001/api/roster/add', {
        userId,
        playerId: player.id
      }, {
        withCredentials: true
      });
      
      // Update local roster state to reflect the change
      setRoster([...roster, player.id]);
      
      // Show success message with position assignment
      alert(response.data.message);
      
      // Optional: Refresh the page to show updated roster
      // If you uncomment this, also add a confirmation dialog
      // if (confirm("Player added successfully! View your roster now?")) {
      //   window.location.href = '/YourRoster';
      // }
    } catch (error) {
      console.error("Error adding player to roster:", error);
      alert(error.response?.data?.error || "Error adding player to roster");
    }
  };
  
  const isPlayerOnRoster = (playerId) => {
    return roster.includes(playerId);
  };

  return (
    <>
      <MenuBar />
      <div className="PL_container">
        <h1 className="PL_header">NBA Player List</h1>
        <input
          type="text"
          className="PL_searchBar"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <table className="PL_table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Team</th>
              <th>Position</th>
              <th>Jersey</th>
              <th>Avg. Fan Pts</th>
              <th>GP</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>STL</th>
              <th>BLK</th>
              <th>Info</th>
              <th>Roster</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player) => (
              <tr key={player.id}>
                <td>{player.rank ?? '-'}</td>
                <td>
                  <img 
                    src={`/headshots/${safeFileName(player.name)}_headshot.jpg`} 
                    onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                    style={{ width: "50px", height: "auto", marginRight: "8px", verticalAlign: "middle" }}
                    alt={player.name}
                  />
                  {player.name}
                </td>
                <td>{player.team || '-'}</td>
                <td>
                  {player.positions && player.positions.length > 0
                    ? player.positions.join(', ')
                    : '-'}
                </td>
                <td>{player.jersey ?? '?'}</td>
                <td>
                  {player.avgFanPts !== undefined
                    ? player.avgFanPts.toFixed(1)
                    : '-'}
                </td>
                <td>{player.gamesPlayed ?? 0}</td>
                <td>
                  {player.avgPts !== undefined
                    ? player.avgPts.toFixed(1)
                    : '-'}
                </td>
                <td>
                  {player.avgReb !== undefined
                    ? player.avgReb.toFixed(1)
                    : '-'}
                </td>
                <td>
                  {player.avgAst !== undefined
                    ? player.avgAst.toFixed(1)
                    : '-'}
                </td>
                <td>
                  {player.avgStl !== undefined
                    ? player.avgStl.toFixed(1)
                    : '-'}
                </td>
                <td>
                  {player.avgBlk !== undefined
                    ? player.avgBlk.toFixed(1)
                    : '-'}
                </td>
                <td>
                  <button
                    className="PL_infoButton"
                    onClick={() => handleInfoClick(player)}
                  >
                    Info
                  </button>
                </td>
                <td>
                  {isPlayerOnRoster(player.id) ? (
                    <span className="PL_onRoster">On Roster</span>
                  ) : (
                    <button
                      className="PL_addButton"
                      onClick={(e) => handleAddToRoster(player, e)}
                    >
                      Add
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {selectedPlayer && (
        <PlayerStatsModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </>
  );
};

export default Player_List;