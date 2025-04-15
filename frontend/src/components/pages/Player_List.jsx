import { useContext, useEffect, useState } from 'react';
import { AuthContext } from "../../AuthContext";
import MenuBar from '../MenuBar';
import PlayerStatsModal from './PlayerStats';
import './Player_List.css';
import axios from 'axios';

const Player_List = () => {
  // State for the players (the current page returned from the server)
  const [players, setPlayers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  // Filtering and sorting state
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' });
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Other state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [roster, setRoster] = useState([]);

  // Static mappings for teams and positions.
  // teamMap maps friendly team names to the value stored in your database.
  const teamMap = {
    "Atlanta Hawks": "Hawks",
    "Boston Celtics": "Celtics",
    "Brooklyn Nets": "Nets",
    "Charlotte Hornets": "Hornets",
    "Chicago Bulls": "Bulls",
    "Cleveland Cavaliers": "Cavaliers",
    "Dallas Mavericks": "Mavericks",
    "Denver Nuggets": "Nuggets",
    "Detroit Pistons": "Pistons",
    "Golden State Warriors": "Warriors",
    "Houston Rockets": "Rockets",
    "Indiana Pacers": "Pacers",
    "Los Angeles Clippers": "Clippers",
    "Los Angeles Lakers": "Lakers",
    "Memphis Grizzlies": "Grizzlies",
    "Miami Heat": "Heat",
    "Milwaukee Bucks": "Bucks",
    "Minnesota Timberwolves": "Timberwolves",
    "New Orleans Pelicans": "Pelicans",
    "New York Knicks": "Knicks",
    "Oklahoma City Thunder": "Thunder",
    "Orlando Magic": "Magic",
    "Philadelphia 76ers": "76ers",
    "Phoenix Suns": "Suns",
    "Portland Trail Blazers": "Trail Blazers",
    "Sacramento Kings": "Kings",
    "San Antonio Spurs": "Spurs",
    "Toronto Raptors": "Raptors",
    "Utah Jazz": "Jazz",
    "Washington Wizards": "Wizards"
  };

  // Array of friendly team names.
  const allFriendlyTeamNames = Object.keys(teamMap);
  // For positions, here we use a static list.
  const allPositions = ["Guard", "Guard-Forward", "Forward", "Forward-Center", "Center"];

  const playersPerPage = 20;
  const { user } = useContext(AuthContext);
  const userId = user?.id;

  // Normalize string for filtering.
  const normalizeString = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  // Create a safe filename for the player headshot.
  const safeFileName = (name) => name.split(' ').join('_');

  // Fetch players from the server, passing filter, sort, and pagination parameters.
  useEffect(() => {
    const params = new URLSearchParams();
    params.append("limit", playersPerPage);
    params.append("page", currentPage);
    if (selectedTeam) {
      // selectedTeam is already the database value, for example: "Hawks"
      params.append("team", selectedTeam);
    }
    if (selectedPosition) {
      params.append("position", selectedPosition);
    }
    if (search) {
      params.append("search", search);
    }
    if (sortConfig.key && sortConfig.direction !== "default") {
      params.append("sortKey", sortConfig.key);
      params.append("sortDirection", sortConfig.direction);
    }
    const url = `http://localhost:5001/api/leagues/1/players?${params.toString()}`;
    console.log("Fetching:", url);

    fetch(url)
      .then(res => res.json())
      .then(async (data) => {
        console.log('Fetched league players (server-side):', data);
        // For each player, fetch game logs and compute derived statistics.
        const updatedPlayers = await Promise.all(
          data.players.map(async (p) => {
            try {
              const logsRes = await fetch(`http://localhost:5001/api/players/${p.id}/gamelogs`);
              const logsData = await logsRes.json();
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
        setTotalPages(data.totalPages);
      })
      .catch(err => console.error(err));

    fetchRoster();
  }, [currentPage, sortConfig, selectedTeam, selectedPosition, search]);

  // Reset page to 1 when any filter value changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTeam, selectedPosition]);

  // Fetch roster.
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

  // Use the server-side filtered/sorted players directly.
  const playersToDisplay = players;

  // Ensure the current page value is valid.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Sorting: update sortConfig and reset page to 1.
  const handleSort = (key) => {
    setCurrentPage(1);
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
      }, { withCredentials: true });
      setRoster([...roster, player.id]);
      alert(response.data.message);
    } catch (error) {
      console.error("Error adding player to roster:", error);
      alert(error.response?.data?.error || "Error adding player to roster");
    }
  };

  const isPlayerOnRoster = (playerId) => roster.includes(playerId);

  return (
    <>
      <MenuBar />
      <div className="PL_container">
        <h1 className="PL_header">NBA Player List</h1>

        {/* Filters & Search */}
        <div className="PL_filtersContainer">
          <select
            value={
              // Reverse lookup: if selectedTeam is set, find its friendly name; otherwise, blank.
              Object.keys(teamMap).find(key => teamMap[key] === selectedTeam) || ""
            }
            onChange={(e) =>
              // When the user selects a friendly name, store its mapped value.
              setSelectedTeam(teamMap[e.target.value] || "")
            }
          >
            <option value="">All Teams</option>
            {allFriendlyTeamNames.map(team => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
          >
            <option value="">All Positions</option>
            {allPositions.map(position => (
              <option key={position} value={position}>
                {position}
              </option>
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
            {playersToDisplay.map((player) => (
              <tr key={player.id}>
                <td>{player.rank ?? '-'}</td>
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
                <td>{player.positions && player.positions.length > 0 ? player.positions.join(', ') : '-'}</td>
                <td>{player.jersey ?? '?'}</td>
                <td>{player.avgFanPts !== undefined ? player.avgFanPts.toFixed(1) : '-'}</td>
                <td>{player.gamesPlayed ?? 0}</td>
                <td>{player.avgPts !== undefined ? player.avgPts.toFixed(1) : '-'}</td>
                <td>{player.avgReb !== undefined ? player.avgReb.toFixed(1) : '-'}</td>
                <td>{player.avgAst !== undefined ? player.avgAst.toFixed(1) : '-'}</td>
                <td>{player.avgStl !== undefined ? player.avgStl.toFixed(1) : '-'}</td>
                <td>{player.avgBlk !== undefined ? player.avgBlk.toFixed(1) : '-'}</td>
                <td>
                  <button className="PL_infoButton" onClick={() => handleInfoClick(player)}>
                    Info
                  </button>
                </td>
                <td>
                  {isPlayerOnRoster(player.id) ? (
                    <span className="PL_onRoster">On Roster</span>
                  ) : (
                    <button className="PL_addButton" onClick={(e) => handleAddToRoster(player, e)}>
                      Add
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="PL_pagination" style={{ marginTop: "1rem", textAlign: "center" }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
            disabled={currentPage === 1}
            style={{ marginRight: "10px" }}
          >
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
            disabled={currentPage === totalPages}
            style={{ marginLeft: "10px" }}
          >
            Next
          </button>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              let page = Number(e.target.value);
              if (Number.isNaN(page) || page < 1) page = 1;
              if (page > totalPages) page = totalPages;
              setCurrentPage(page);
            }}
            style={{ width: "50px", marginLeft: "10px", textAlign: "center" }}
          />
        </div>
      </div>
      
      {selectedPlayer && (
        <PlayerStatsModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </>
  );
};

export default Player_List;
