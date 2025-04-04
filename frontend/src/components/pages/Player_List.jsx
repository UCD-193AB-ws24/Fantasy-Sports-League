import { useContext } from 'react';
import { AuthContext } from "../../AuthContext";
import React, { useState, useEffect } from 'react';
import MenuBar from '../MenuBar';
import PlayerStatsModal from './PlayerStats';
import './Player_List.css';
import axios from 'axios';

const Player_List = () => {
  const [players, setPlayers] = useState([]);
  const [originalPlayers, setOriginalPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [roster, setRoster] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' });
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');

  const { user } = useContext(AuthContext);
  const userId = user?.id;

  // Normalize string for better search functionality
  const normalizeString = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  // Utility function to create a safe filename from player name
  const safeFileName = (name) => name.split(' ').join('_');

  useEffect(() => {
    // Fetch all league players
    fetch('http://localhost:5001/api/leagues/1/players')
      .then(res => res.json())
      .then(async (fetchedPlayers) => {
        console.log('Fetched league players:', fetchedPlayers);
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
            }
            return p;
          })
        );
        setPlayers(updatedPlayers);
        setOriginalPlayers(updatedPlayers);
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
      const rosterPlayerIds = rosterData.players.map(rp => rp.player.id);
      setRoster(rosterPlayerIds);
    } catch (error) {
      console.error("Error fetching roster:", error);
    }
  };

  // Filter players based on search, team, and position
  const filteredPlayers = originalPlayers.filter(player =>
    normalizeString(player.name).includes(normalizeString(search)) &&
    (selectedTeam === '' || player.team === selectedTeam) &&
    (selectedPosition === '' || (player.positions && player.positions.includes(selectedPosition)))
  );

  // Sorting functionality using sortConfig
  const sortedPlayers = React.useMemo(() => {
    if (!sortConfig.key || sortConfig.direction === 'default') return filteredPlayers;
    return [...filteredPlayers].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;
      if (sortConfig.direction === 'desc') return bVal - aVal;
      if (sortConfig.direction === 'asc') return aVal - bVal;
      return 0;
    });
  }, [filteredPlayers, sortConfig]);

  const handleSort = (key) => {
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'default') {
        setSortConfig({ key, direction: 'desc' });
      } else if (sortConfig.direction === 'desc') {
        setSortConfig({ key, direction: 'asc' });
      } else if (sortConfig.direction === 'asc') {
        setSortConfig({ key: null, direction: 'default' });
      }
    } else {
      setSortConfig({ key, direction: 'desc' });
    }
  };

  const handleInfoClick = (player) => {
    setSelectedPlayer(player);
  };
  
  const handleAddToRoster = async (player, event) => {
    event.stopPropagation();
    try {
      const response = await axios.post('http://localhost:5001/api/roster/add', {
        userId,
        playerId: player.id
      }, {
        withCredentials: true
      });
      setRoster([...roster, player.id]);
      alert(response.data.message);
    } catch (error) {
      console.error("Error adding player to roster:", error);
      alert(error.response?.data?.error || "Error adding player to roster");
    }
  };
  
  const isPlayerOnRoster = (playerId) => roster.includes(playerId);

  // Compute unique teams and positions for the dropdown filters
  const teams = Array.from(new Set(originalPlayers.map(player => player.team).filter(Boolean)));
  const positions = Array.from(new Set(originalPlayers.flatMap(player => player.positions || [])));

  return (
    <>
      <MenuBar />
      <div className="PL_container">
        <h1 className="PL_header">NBA Player List</h1>

        {/* Unified Filters & Search */}
        <div className="PL_filtersContainer">
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
          <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
            <option value="">All Positions</option>
            {positions.map(position => (
              <option key={position} value={position}>{position}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="PL_table">
          <thead>
            <tr>
              <th onClick={() => handleSort('rank')}>
                Rank {sortConfig.key === 'rank' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
              </th>
              {/* Blank header for photo column */}
              <th className="PL_colPhoto"></th>
              <th>Name</th>
              <th>Team</th>
              <th>Position</th>
              <th>Jersey</th>
              <th onClick={() => handleSort('avgFanPts')}>
                Avg. Fan Pts {sortConfig.key === 'avgFanPts' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('gamesPlayed')}>
                GP {sortConfig.key === 'gamesPlayed' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('avgPts')}>
                PTS {sortConfig.key === 'avgPts' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('avgReb')}>
                REB {sortConfig.key === 'avgReb' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('avgAst')}>
                AST {sortConfig.key === 'avgAst' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('avgStl')}>
                STL {sortConfig.key === 'avgStl' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th onClick={() => handleSort('avgBlk')}>
                BLK {sortConfig.key === 'avgBlk' ? (sortConfig.direction === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th>Info</th>
              <th>Roster</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => (
              <tr key={player.id}>
                <td>{player.rank ?? '-'}</td>
                {/* Photo column with headshot */}
                <td className="PL_colPhoto">
                  <img 
                    src={`/headshots/${safeFileName(player.name)}_headshot.jpg`} 
                    onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                    style={{ width: "60px", height: "auto", display: "block", margin: "0 auto" }}
                    alt={player.name}
                  />
                </td>
                <td>{player.name}</td>
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
