import { useContext, useEffect, useState } from 'react';
import { AuthContext } from "../../AuthContext";
import MenuBar from '../MenuBar';
import PlayerStatsModal from './PlayerStats';
import './Player_List.css';

const Player_List = () => {
  // State for the players (the current page returned from the server)
  const [players, setPlayers] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]); // Store all players for client-side filtering
  const [totalPages, setTotalPages] = useState(1);
  // Filtering and sorting state
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'avgFanPts', direction: 'desc' });
  const [availabilityFilter, setAvailabilityFilter] = useState('available'); // New state for Available/All filter
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Other state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [leagueRosterPlayerIds, setLeagueRosterPlayerIds] = useState([]); // All player IDs on any roster in the league
  const [leagueId, setLeagueId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roster, setRoster] = useState([]); // Add this state for user's roster

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

  const playersPerPage = 50; // Increased from 20 to show more players
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

  // First, fetch the user's league ID
  useEffect(() => {
    const fetchUserLeague = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/leagues/user', {
          credentials: 'include'
        });
        const data = await response.json();
        if (data && data.length > 0) {
          // Use the first league the user is in
          setLeagueId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching user's league:", error);
      }
    };
    
    if (userId) {
      fetchUserLeague();
    }
  }, [userId]);

  // Fetch all rosters in the league to determine which players are taken
  const fetchLeagueRosters = async () => {
    if (!leagueId) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/leagues/${leagueId}/teams`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      // Extract all player IDs from all teams in the league
      const allPlayerIds = [];
      data.forEach(team => {
        if (team.players && Array.isArray(team.players)) {
          team.players.forEach(player => {
            allPlayerIds.push(player.id);
          });
        }
      });
      
      console.log('Players on rosters in league:', allPlayerIds);
      setLeagueRosterPlayerIds(allPlayerIds);
    } catch (error) {
      console.error("Error fetching league rosters:", error);
    }
  };

  // Fetch league rosters whenever leagueId changes
  useEffect(() => {
    if (leagueId) {
      fetchLeagueRosters();
    }
  }, [leagueId]);

  // Fetch user's own roster
  const fetchRoster = async () => {
    if (!userId || !leagueId) return;
    
    try {
      // Use the league-specific roster endpoint
      const response = await fetch(`http://localhost:5001/api/roster/${userId}/${leagueId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data && data.players) {
        const playerIds = data.players.map(rp => rp.player.id);
        setRoster(playerIds);
      }
    } catch (error) {
      console.error("Error fetching user roster:", error);
    }
  };

  // Fetch user's roster when component mounts
  useEffect(() => {
    if (userId) {
      fetchRoster();
    }
  }, [userId]);

  // Fetch all players from the general players endpoint
  useEffect(() => {
    const fetchAllPlayers = async () => {
      setIsLoading(true);
      try {
        // Use the general players endpoint instead of league-specific one
        const url = `http://localhost:5001/api/players`;
        console.log("Fetching all players from:", url);

        const res = await fetch(url, {
          credentials: 'include'
        });
        const data = await res.json();
        
        console.log('Fetched all players:', data.length, 'players');
        
        // For each player, fetch game logs and compute derived statistics.
        const playersWithStats = await Promise.all(
          (data || []).map(async (p) => {
            try {
              const logsRes = await fetch(`http://localhost:5001/api/players/${p.id}/gamelogs`, {
                credentials: 'include'
              });
              const logsData = await logsRes.json();
              
              let totalPoints = 0, totalReb = 0, totalAst = 0, totalStl = 0, totalBlk = 0, totalFP = 0;
              if (Array.isArray(logsData)) {
                logsData.forEach(g => {
                  totalPoints += g.pts ?? 0;
                  totalReb += g.reb ?? 0;
                  totalAst += g.ast ?? 0;
                  totalStl += g.st ?? 0;
                  totalBlk += g.blk ?? 0;
                  totalFP += g.fanPts ?? 0;
                });
              }
              const gp = Array.isArray(logsData) ? logsData.length : 0;
              
              return {
                ...p,
                gamesPlayed: gp,
                avgPts: gp > 0 ? totalPoints / gp : 0,
                avgReb: gp > 0 ? totalReb / gp : 0,
                avgAst: gp > 0 ? totalAst / gp : 0,
                avgStl: gp > 0 ? totalStl / gp : 0,
                avgBlk: gp > 0 ? totalBlk / gp : 0,
                avgFanPts: gp > 0 ? totalFP / gp : 0
              };
            } catch (err) {
              console.error(`Error fetching logs for ${p.name}:`, err);
              // Set default values if error
              return {
                ...p,
                gamesPlayed: 0,
                avgPts: 0,
                avgReb: 0,
                avgAst: 0,
                avgStl: 0,
                avgBlk: 0,
                avgFanPts: 0
              };
            }
          })
        );
        
        console.log('Processed players with stats:', playersWithStats.length);
        setAllPlayers(playersWithStats);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching players:", err);
        setIsLoading(false);
      }
    };
    
    fetchAllPlayers();
  }, []); // Only fetch once on component mount

  // Apply filters and sorting on the client side
  useEffect(() => {
    if (!allPlayers.length) {
      setPlayers([]);
      return;
    }
    
    let filtered = [...allPlayers];
    
    // Apply availability filter
    if (availabilityFilter === 'available') {
      filtered = filtered.filter(player => !isPlayerOnAnyRoster(player.id));
    }
    
    // Apply search filter
    if (search) {
      const searchLower = normalizeString(search);
      filtered = filtered.filter(player => 
        normalizeString(player.name).includes(searchLower)
      );
    }
    
    // Apply team filter
    if (selectedTeam) {
      filtered = filtered.filter(player => player.team === selectedTeam);
    }
    
    // Apply position filter
    if (selectedPosition) {
      filtered = filtered.filter(player => {
        if (!player.positions || !Array.isArray(player.positions)) return false;
        // Check if any of the player's positions match the selected position
        return player.positions.some(pos => {
          // Handle both exact matches and position groups
          if (pos === selectedPosition) return true;
          if (selectedPosition === 'Guard' && (pos === 'PG' || pos === 'SG' || pos === 'Guard')) return true;
          if (selectedPosition === 'Guard-Forward' && (pos === 'Guard-Forward' || pos === 'G-F')) return true;
          if (selectedPosition === 'Forward' && (pos === 'SF' || pos === 'PF' || pos === 'Forward')) return true;
          if (selectedPosition === 'Forward-Center' && (pos === 'Forward-Center' || pos === 'F-C')) return true;
          if (selectedPosition === 'Center' && (pos === 'C' || pos === 'Center')) return true;
          return false;
        });
      });
    }
    
    // Apply sorting
    if (sortConfig.key && sortConfig.direction !== 'default') {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || 0;
        const bValue = b[sortConfig.key] || 0;
        
        if (sortConfig.direction === 'desc') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    } else {
      // Default sort by avgFanPts descending
      filtered.sort((a, b) => (b.avgFanPts || 0) - (a.avgFanPts || 0));
    }
    
    // Apply pagination
    const startIndex = (currentPage - 1) * playersPerPage;
    const endIndex = startIndex + playersPerPage;
    const paginatedPlayers = filtered.slice(startIndex, endIndex);
    
    console.log(`Showing ${paginatedPlayers.length} players on page ${currentPage} of ${Math.ceil(filtered.length / playersPerPage)}`);
    setPlayers(paginatedPlayers);
    setTotalPages(Math.ceil(filtered.length / playersPerPage));
  }, [allPlayers, availabilityFilter, search, selectedTeam, selectedPosition, sortConfig, currentPage, leagueRosterPlayerIds]);

  // Reset page to 1 when any filter value changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTeam, selectedPosition, availabilityFilter]);

  // Sorting: update sortConfig and reset page to 1.
  const handleSort = (key) => {
    setCurrentPage(1);
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'desc') {
        setSortConfig({ key, direction: 'asc' });
      } else if (sortConfig.direction === 'asc') {
        setSortConfig({ key: 'avgFanPts', direction: 'desc' }); // Reset to default
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
      const response = await fetch('http://localhost:5001/api/roster/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          playerId: player.id,
          leagueId: leagueId  
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add player');
      }
      
      // Update local roster state immediately
      setRoster([...roster, player.id]);
      
      // Show success message
      alert(data.message);
      
      // Refresh roster data from server to ensure consistency
      await fetchRoster();
      
      // Also refresh league rosters to update the "On Roster" status
      await fetchLeagueRosters();
    } catch (error) {
      console.error("Error adding player to roster:", error);
      alert(error.message || "Error adding player to roster");
    }
  };

  const refetchLeagueRosterPlayers = async () => {
    await fetchLeagueRosters();
  };

  const isPlayerOnAnyRoster = (playerId) => leagueRosterPlayerIds.includes(playerId);

// Handle player drop from modal
  const handlePlayerDropped = async (playerId) => {
    console.log("Player dropped, refreshing league rosters...");
    
    // Remove from local roster state immediately for UI responsiveness
    setRoster(prev => prev.filter(id => id !== playerId));
    
    // Remove from league roster player IDs immediately
    setLeagueRosterPlayerIds(prev => prev.filter(id => id !== playerId));
    
    // Refresh both user roster and league rosters
    await fetchRoster();
    await fetchLeagueRosters();
  };

  return (
    <>
      <MenuBar />
      <div className="PL_container">
        <h1 className="PL_header">NBA Player List</h1>

        {/* Filters & Search */}
        <div className="PL_filtersContainer">
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            style={{ backgroundColor: availabilityFilter === 'available' ? '#4CAF50' : '#007bff', color: 'white' }}
          >
            <option value="available">Available</option>
            <option value="all">All Players</option>
          </select>
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

        {!leagueId ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Please join a league to view players.</p>
          </div>
        ) : isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Loading players...</p>
          </div>
        ) : players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>No players found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
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
                {players.map((player, index) => (
                  <tr key={player.id}>
                    <td>{index + 1 + (currentPage - 1) * playersPerPage}</td>
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
                      {isPlayerOnAnyRoster(player.id) ? (
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
          </>
        )}
      </div>
      
      {selectedPlayer && (
        <PlayerStatsModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onPlayerDropped={handlePlayerDropped}
          leagueId={leagueId}
        />
      )}
    </>
  );
};

export default Player_List;