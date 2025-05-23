import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MenuBar from '../MenuBar';
import { AuthContext } from '../../AuthContext';
import axios from 'axios';
import io from 'socket.io-client';
import './LeagueDetails.css';

const LeagueDetails = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('standings');
  const [editMode, setEditMode] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRestartDraftConfirm, setShowRestartDraftConfirm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    maxTeams: 10,
    scoringFormat: 'Standard',
    draftType: 'Snake',
    isPrivate: false,
    draftDate: ''
  });
  const [leagueSchedule, setLeagueSchedule] = useState([]);
  
  // Roster and Draft tab states
  const [teamRosters, setTeamRosters] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [draftComplete, setDraftComplete] = useState(false);
  const [draftPicks, setDraftPicks] = useState([]);
  
  // Chat tab state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const messageContainerRef = useRef(null);

  useEffect(() => {
    const fetchLeague = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
          withCredentials: true
        });
        
        setLeague(response.data);
        
        // Set the user's team as the default selected team
        if (user && response.data.users) {
          const userInLeague = response.data.users.find(u => u.id === user.id);
          if (userInLeague) {
            setSelectedTeamId(user.id.toString());
          } else if (response.data.users.length > 0) {
            // If user is not in league, default to first team
            setSelectedTeamId(response.data.users[0].id.toString());
          }
        }
        
        setFormData({
          name: response.data.name,
          maxTeams: response.data.maxTeams,
          scoringFormat: response.data.scoringFormat,
          draftType: response.data.draftType,
          isPrivate: response.data.isPrivate,
          draftDate: response.data.draftDate ? new Date(response.data.draftDate).toISOString().split('T')[0] : ''
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching league:", error);
        setError('Failed to fetch league details');
        setLoading(false);
      }
    };
    
    fetchLeague();
    
    // Connect to socket for chat
    const socket = io('http://localhost:5002', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to chat socket');
      setSocketConnected(true);
      
      // Join league chat room
      socket.emit('join-chat', { leagueId });
    });
    
    socket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
      
      // Scroll to bottom when new message arrives
      setTimeout(() => {
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
      }, 100);
    });
    
    socket.on('chat-history', (history) => {
      setMessages(history);
      
      // Scroll to bottom when history loads
      setTimeout(() => {
        if (messageContainerRef.current) {
          messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
      }, 100);
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from chat socket');
      setSocketConnected(false);
    });
    
    // Cleanup socket connection
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [leagueId, user]);

  // Fetch team rosters and draft data when needed
  useEffect(() => {
    if (league && (activeTab === 'rosters' || activeTab === 'draft' || activeTab === 'draftResults')) {
      fetchTeamRosters();
    }
  }, [league, activeTab]);

  // Add schedule generation when league data is loaded
  useEffect(() => {
    if (league && league.users) {
      const schedule = generateSchedule(league.users);
      setLeagueSchedule(schedule);
    }
  }, [league]);
  
  // Scroll to bottom of messages when messages change or tab changes to chat
  useEffect(() => {
    if (activeTab === 'chat' && messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  // Fetch team rosters and draft data
  const fetchTeamRosters = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/leagues/${leagueId}/teams`, {
        withCredentials: true
      });
      
      setTeamRosters(response.data);
      
      // Process draft data
      const allPicks = [];
      const teams = response.data;
      
      teams.forEach(team => {
        team.players.forEach(player => {
          if (player.pickNumber && player.pickRound) {
            allPicks.push({
              pickNumber: player.pickNumber,
              round: player.pickRound,
              teamId: team.userId,
              teamName: team.teamName || `Team ${team.name}`,
              player: player
            });
          }
        });
      });
      
      // Sort picks by pick number
      allPicks.sort((a, b) => a.pickNumber - b.pickNumber);
      setDraftPicks(allPicks);
      
      // Check if draft is complete
      setDraftComplete(allPicks.length > 0);
      
    } catch (error) {
      console.error("Error fetching team rosters:", error);
    }
  };

  // Send message function
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socketConnected || !user) return;
    
    const messageData = {
      leagueId: parseInt(leagueId),
      userId: user.id,
      userName: user.name,
      teamName: user.teamName || `Team ${user.name}`,
      text: newMessage.trim(),
      timestamp: new Date().toISOString()
    };
    
    socketRef.current.emit('send-message', messageData);
    setNewMessage('');
  };

  const generateSchedule = (teams) => {
    // NBA season starts on October 22, 2024 (Tuesday)
    const startDate = new Date(2024, 9, 22); // Month is 0-indexed, so 9 is October
    
    // All-Star break is typically in mid-February
    // For 2025, let's assume it's February 14-20
    const allStarBreakStart = new Date(2025, 1, 14);
    const allStarBreakEnd = new Date(2025, 1, 20);
    
    // Generate week dates
    const weeks = [];
    let currentDate = new Date(startDate);
    
    // First week is special (starts on Tuesday)
    const firstWeekEnd = new Date(currentDate);
    firstWeekEnd.setDate(firstWeekEnd.getDate() + (7 - firstWeekEnd.getDay())); // Go to the next Sunday
    weeks.push({
      weekNumber: 1,
      start: new Date(currentDate),
      end: new Date(firstWeekEnd),
      matchups: []
    });
    
    // Move to the start of the next week (Monday)
    currentDate = new Date(firstWeekEnd);
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Generate remaining weeks (all Monday-Sunday)
    const endOfSeason = new Date(2025, 3, 15); // April 15, 2025
    let weekNumber = 2;
    
    while (currentDate < endOfSeason) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday is 6 days after Monday
      
      // Skip All-Star break week
      const isAllStarBreak = 
        (weekStart <= allStarBreakEnd && weekStart >= allStarBreakStart) ||
        (weekEnd <= allStarBreakEnd && weekEnd >= allStarBreakStart) ||
        (weekStart <= allStarBreakStart && weekEnd >= allStarBreakEnd);
      
      if (!isAllStarBreak) {
        weeks.push({
          weekNumber: weekNumber,
          start: new Date(weekStart),
          end: new Date(weekEnd),
          matchups: []
        });
        weekNumber++;
      }
      
      // Move to next Monday
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    // Generate proper round-robin schedule
    const numTeams = teams.length;
    
    // For odd number of teams, add a "bye" team
    const teamList = [...teams];
    if (numTeams % 2 !== 0) {
      teamList.push({ id: 'bye', name: 'BYE', teamName: 'BYE' });
    }
    
    const rounds = [];
    const totalTeams = teamList.length;
    const numRounds = totalTeams - 1;
    const gamesPerRound = totalTeams / 2;
    
    // Create rounds of round-robin
    // Use circle method: fix one team (0) and rotate others
    for (let round = 0; round < numRounds; round++) {
      const roundMatchups = [];
      const roundTeams = [teamList[0]]; // Fixed team
      
      // Arrange other teams in circle rotation
      for (let i = 1; i < totalTeams; i++) {
        const pos = (round + i) % (totalTeams - 1) + 1;
        roundTeams.push(teamList[pos]);
      }
      
      // Create matchups for this round
      for (let game = 0; game < gamesPerRound; game++) {
        const team1Index = game;
        const team2Index = totalTeams - 1 - game;
        
        // Skip matchups that include the fake "bye" team
        if (roundTeams[team1Index].id !== 'bye' && roundTeams[team2Index].id !== 'bye') {
          // Alternate home/away for variety - use round number for deterministic pattern
          const isTeam1Home = (round + game) % 2 === 0;
          const matchup = {
            home: isTeam1Home ? roundTeams[team1Index] : roundTeams[team2Index],
            away: isTeam1Home ? roundTeams[team2Index] : roundTeams[team1Index]
          };
          
          roundMatchups.push(matchup);
        }
      }
      
      rounds.push(roundMatchups);
    }
    
    // Assign rounds to weeks, repeating as needed to fill the season
    let roundIndex = 0;
    for (let i = 0; i < weeks.length; i++) {
      // Get the next round of matchups in rotation
      const currentRound = rounds[roundIndex % rounds.length];
      weeks[i].matchups = [...currentRound]; // Make a copy to avoid reference issues
      
      // Move to next round for next week
      roundIndex++;
    }
    
    return weeks;
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Format chat timestamp
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }) + ' ' + date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle leaving a league
  const handleLeaveLeague = async () => {
    setLeaveLoading(true);
    try {
      await axios.post(
        'http://localhost:5001/api/leagues/leave',
        { leagueId },
        { withCredentials: true }
      );
      
      // Navigate back to leagues page
      navigate('/leagues');
    } catch (error) {
      console.error("Error leaving league:", error);
      setError(error.response?.data?.error || 'Failed to leave league');
      setLeaveLoading(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put(`http://localhost:5001/api/leagues/${leagueId}`,
        formData,
        { withCredentials: true }
      );
      
      // Refresh league data
      const response = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
        withCredentials: true
      });
      
      setLeague(response.data);
      setEditMode(false);
    } catch (error) {
      console.error("Error updating league:", error);
      setError('Failed to update league settings');
    }
  };
  
  // Get team name from user object
  const getTeamName = (userId) => {
    if (!league || !league.users) return "Unknown Team";
    
    const user = league.users.find(u => u.id.toString() === userId.toString());
    return user ? (user.teamName || `Team ${user.name}`) : "Unknown Team";
  };
  
  // Get player image URL from player name
  const getPlayerImageUrl = (playerName) => {
    if (!playerName) return '/headshots/default.jpg';
    
    const safeName = playerName.split(' ').join('_');
    return `/headshots/${safeName}_headshot.jpg`;
  };
  
  // Find selected team data from rosters
  const getSelectedTeam = () => {
    if (!selectedTeamId || !teamRosters || teamRosters.length === 0) {
      return null;
    }
    
    return teamRosters.find(team => team.userId.toString() === selectedTeamId);
  };
  
  // Group draft picks by round
  const getDraftPicksByRound = () => {
    if (!draftPicks || draftPicks.length === 0) return [];
    
    const roundsMap = {};
    draftPicks.forEach(pick => {
      if (!roundsMap[pick.round]) {
        roundsMap[pick.round] = [];
      }
      roundsMap[pick.round].push(pick);
    });
    
    // Convert to array sorted by round number
    return Object.keys(roundsMap)
      .map(round => ({ 
        round: parseInt(round), 
        picks: roundsMap[round].sort((a, b) => a.pickNumber - b.pickNumber)
      }))
      .sort((a, b) => a.round - b.round);
  };

  const isCommissioner = league && user && league.commissionerId === user.id.toString();

  if (loading) {
    return (
      <div>
        <MenuBar />
        <div className="LD_container">
          <h2>Loading league details...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <MenuBar />
        <div className="LD_container">
          <h2>Error: {error}</h2>
          <button onClick={() => navigate('/leagues')} className="LD_button">Back to Leagues</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MenuBar />
      <div className="LD_container">
        <div className="LD_header-section">
          <h1 className="LD_league-name">{league.name}</h1>
          <div className="LD_league-info">
            <span>Teams: {league.users?.length || 0} / {league.maxTeams}</span>
            <span>Format: {league.scoringFormat}</span>
            <span>Draft Type: {league.draftType}</span>
            <span>League ID: {league.id}</span>
          </div>
        </div>
        
        {/* League Navigation Tabs */}
        <div className="LD_tabs" style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto' }}>
          <button 
            className={`LD_tab ${activeTab === 'standings' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('standings')}
          >
            Standings
          </button>
          <button 
            className={`LD_tab ${activeTab === 'transactions' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button 
            className={`LD_tab ${activeTab === 'chat' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            League Chat
          </button>
          <button 
            className={`LD_tab ${activeTab === 'trading' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('trading')}
          >
            Trading List
          </button>
          <button 
            className={`LD_tab ${activeTab === 'schedules' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('schedules')}
          >
            Schedule
          </button>
          <button 
            className={`LD_tab ${activeTab === 'rosters' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('rosters')}
          >
            Rosters
          </button>
          <button 
            className={`LD_tab ${activeTab === 'draft' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('draft')}
          >
            Draft
          </button>
          <button 
            className={`LD_tab ${activeTab === 'draftResults' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('draftResults')}
          >
            Draft Results
          </button>
          <button 
            className={`LD_tab ${activeTab === 'records' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            Record Book
          </button>
          <button 
            className={`LD_tab ${activeTab === 'email' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            Email League
          </button>
          <button 
            className={`LD_tab ${activeTab === 'managers' ? 'LD_active-tab' : ''}`}
            onClick={() => setActiveTab('managers')}
          >
            Managers
          </button>
          {isCommissioner && (
            <button 
              className={`LD_tab ${activeTab === 'settings' ? 'LD_active-tab' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          )}
        </div>
        
        {/* Tab Content */}
        <div className="LD_tab-content">
          {activeTab === 'standings' && (
            <div className="LD_standings">
              <h2>League Standings</h2>
              <table className="LD_standings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Manager</th>
                    <th>W</th>
                    <th>L</th>
                    <th>Win %</th>
                    <th>Pts For</th>
                    <th>Pts Against</th>
                  </tr>
                </thead>
                <tbody>
                  {league.users?.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>{user.teamName || `Team ${user.name}`}</td>
                      <td>{user.name}</td>
                      <td>0</td>
                      <td>0</td>
                      <td>.000</td>
                      <td>0</td>
                      <td>0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {activeTab === 'managers' && (
            <div className="LD_managers">
              <h2>League Managers</h2>
              <div className="LD_managers-list">
                {league.users?.map(user => (
                  <div key={user.id} className="LD_manager-card">
                    <h3>{user.name}</h3>
                    <p>{user.teamName || `Team ${user.name}`}</p>
                    <p>{user.email}</p>
                    {league.commissionerId === user.id.toString() && (
                      <span className="LD_commissioner-badge">Commissioner</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Improved Rosters Tab */}
          {activeTab === 'rosters' && (
            <div className="LD_rosters">
              <h2>Team Rosters</h2>
              
              {/* Team Selector Dropdown */}
              <div className="LD_team-selector">
                <label htmlFor="team-select">Select Team:</label>
                <select 
                  id="team-select" 
                  value={selectedTeamId || ''}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="LD_team-select"
                >
                  {league.users?.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.teamName || `Team ${user.name}`}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Selected Team Roster */}
              <div className="LD_team-roster">
                <h3>{getSelectedTeam() ? getTeamName(selectedTeamId) : 'Team Roster'}</h3>
                
                {teamRosters.length > 0 ? (
                  getSelectedTeam() ? (
                    <table className="LD_roster-table">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Position</th>
                          <th>Team</th>
                          <th>Draft Pick</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSelectedTeam().players.sort((a, b) => {
                          // Sort by draft order if available
                          if (a.pickNumber && b.pickNumber) {
                            return a.pickNumber - b.pickNumber;
                          }
                          // Fallback to name sort
                          return a.name.localeCompare(b.name);
                        }).map(player => (
                          <tr key={player.id}>
                            <td>
                              <div className="LD_player-info">
                                <img 
                                  src={getPlayerImageUrl(player.name)}
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                                  alt={player.name}
                                  className="LD_player-image"
                                />
                                <span>{player.name}</span>
                              </div>
                            </td>
                            <td>{player.positions?.join(', ') || '-'}</td>
                            <td>{player.team || '-'}</td>
                            <td>
                              {player.pickNumber ? 
                                `Round ${player.pickRound}, Pick ${player.pickNumber}` : 
                                'Free Agent'
                              }
                            </td>
                          </tr>
                        ))}
                        {(!getSelectedTeam().players || getSelectedTeam().players.length === 0) && (
                          <tr>
                            <td colSpan="4" className="LD_no-players">No players on roster</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <p>Select a team to view roster</p>
                  )
                ) : (
                  <div className="LD_loading-roster">
                    <p>Loading roster data...</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Draft Tab */}
          {activeTab === 'draft' && (
            <div className="LD_draft">
              <h2>League Draft</h2>
              
              <div className="LD_draft-info">
                <h3>Draft Information</h3>
                <p>Draft Type: {league.draftType}</p>
                <p>Draft Date: {league.draftDate ? new Date(league.draftDate).toLocaleDateString() : 'Not scheduled'}</p>
                
                <div className={`LD_draft-status ${league.draftCompleted ? 'LD_completed' : league.draftDate ? 'LD_upcoming' : 'LD_ready'}`}>
                  <span className="LD_status-dot"></span>
                  <span>
                    {league.draftCompleted ? 'Draft Completed' : 
                     league.draftDate ? `Draft scheduled for ${new Date(league.draftDate).toLocaleDateString()}` : 
                     'Draft not yet scheduled'}
                  </span>
                </div>
              </div>
              
              <div className="LD_draft-buttons">
                {isCommissioner && !league.draftCompleted && (
                  <button 
                    onClick={() => navigate(`/leagues/${league.id}/draft/setup`)}
                    className="LD_button LD_setup-button"
                  >
                    {league.draftDate ? 'Edit Draft Settings' : 'Set Up Draft'}
                  </button>
                )}
                
                <button
                  onClick={() => navigate(`/leagues/${league.id}/draft`)}
                  className="LD_button LD_draft-button"
                >
                  {league.draftCompleted ? 'View Draft Results' : 'Enter Draft Room'}
                </button>
                
                {isCommissioner && league.draftCompleted && (
                <button
                  onClick={() => setShowRestartDraftConfirm(true)}
                  className="LD_button LD_restart-button"
                >
                  Restart Draft
                </button>
              )}
          </div>
      </div>
    )}

          {/* Draft Results Tab */}
          {activeTab === 'draftResults' && (
            <div className="LD_draft-results">
              <h2>League Draft Results</h2>
              
              {draftPicks.length > 0 ? (
                <div className="LD_draft-rounds-container">
                  {getDraftPicksByRound().map(roundData => (
                    <div key={`round-${roundData.round}`} className="LD_draft-round-vertical">
                      <h3>Round {roundData.round}</h3>
                      <table className="LD_draft-picks-table">
                        <thead>
                          <tr>
                            <th>Pick #</th>
                            <th>Team</th>
                            <th>Player</th>
                            <th>Position</th>
                            <th>NBA Team</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roundData.picks.map(pick => (
                            <tr 
                              key={`pick-${pick.pickNumber}`}
                              className={(user && user.id.toString() === pick.teamId.toString()) ? 'LD_highlight-pick' : ''}
                            >
                              <td>{pick.pickNumber}</td>
                              <td>{pick.teamName}</td>
                              <td>
                                <div className="LD_player-info">
                                  <img 
                                    src={getPlayerImageUrl(pick.player.name)}
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                                    alt={pick.player.name}
                                    className="LD_player-image"
                                  />
                                  <span>{pick.player.name}</span>
                                </div>
                              </td>
                              <td>{pick.player.positions?.join(', ') || '-'}</td>
                              <td>{pick.player.team || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="LD_no-draft-data">
                  <p>Draft has not been completed yet.</p>
                  <button
                    onClick={() => navigate(`/leagues/${league.id}/draft`)}
                    className="LD_button LD_draft-button"
                  >
                    Enter Draft Room
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="LD_chat">
              <h2>League Chat</h2>
              
              {/* Messages Container */}
              <div className="LD_messages-container" ref={messageContainerRef}>
                {messages.length > 0 ? (
                  messages.map((message, index) => (
                    <div 
                      key={`${message.userId}-${index}-${message.timestamp}`} 
                      className={`LD_message ${message.userId === user?.id ? 'LD_my-message' : ''}`}
                    >
                      <div className="LD_message-header">
                        <span className="LD_message-sender">{message.userName}</span>
                        <span className="LD_message-team">({message.teamName})</span>
                        <span className="LD_message-time">{formatMessageTime(message.timestamp)}</span>
                      </div>
                      <div className="LD_message-text">{message.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="LD_no-messages">
                    No messages yet. Be the first to send a message!
                  </div>
                )}
              </div>
              
              {/* Message Input Form */}
              <form onSubmit={sendMessage} className="LD_message-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="LD_message-input"
                  disabled={!socketConnected}
                />
                <button 
                  type="submit" 
                  className="LD_send-button"
                  disabled={!socketConnected || !newMessage.trim()}
                >
                  Send
                </button>
              </form>
              
              {!socketConnected && (
                <div className="LD_connection-warning">
                  Connection lost. Reconnecting...
                </div>
              )}
            </div>
          )}
          
          {/* Schedules Tab */}
          {activeTab === 'schedules' && (
            <div className="LD_schedules">
              <h2>League Schedule</h2>
              {leagueSchedule.length > 0 ? (
                leagueSchedule.map((week) => (
                  <div key={week.weekNumber} className="LD_schedule-week">
                    <h3>Week {week.weekNumber}: {formatDate(week.start)} - {formatDate(week.end)}</h3>
                    <div className="LD_matchups">
                      {week.matchups.map((matchup, index) => (
                        <div key={index} className="LD_matchup">
                          <span className="LD_home-team">{matchup.home.teamName || `Team ${matchup.home.name}`}</span>
                          <span className="LD_vs">vs</span>
                          <span className="LD_away-team">{matchup.away.teamName || `Team ${matchup.away.name}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p>No schedule available. Please make sure there are enough teams in the league.</p>
              )}
            </div>
          )}
          
          {/* Settings Tab (for commissioner) */}
          {activeTab === 'settings' && isCommissioner && (
            <div className="LD_settings">
              <h2>League Settings</h2>
              
              {editMode ? (
                <form className="LD_settings-form">
                  <div className="LD_form-group">
                    <label htmlFor="name">League Name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="LD_input"
                    />
                  </div>
                  
                  <div className="LD_form-group">
                    <label htmlFor="maxTeams">Max Teams</label>
                    <select
                      id="maxTeams"
                      name="maxTeams"
                      value={formData.maxTeams}
                      onChange={handleChange}
                      className="LD_select"
                    >
                      {[4, 6, 8, 10, 12, 14, 16, 20].map(num => (
                        <option key={num} value={num}>{num} Teams</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="LD_form-group">
                    <label htmlFor="scoringFormat">Scoring Format</label>
                    <select
                      id="scoringFormat"
                      name="scoringFormat"
                      value={formData.scoringFormat}
                      onChange={handleChange}
                      className="LD_select"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Points">Points Only</option>
                      <option value="Categories">Category Based</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  
                  <div className="LD_form-group">
                    <label htmlFor="draftType">Draft Type</label>
                    <select
                      id="draftType"
                      name="draftType"
                      value={formData.draftType}
                      onChange={handleChange}
                      className="LD_select"
                    >
                      <option value="Snake">Snake</option>
                      <option value="Auction">Auction</option>
                      <option value="Linear">Linear</option>
                    </select>
                  </div>
                  
                  <div className="LD_form-group">
                    <label htmlFor="draftDate">Draft Date</label>
                    <input
                      id="draftDate"
                      type="date"
                      name="draftDate"
                      value={formData.draftDate}
                      onChange={handleChange}
                      className="LD_input"
                    />
                  </div>
                  
                  <div className="LD_form-group LD_checkbox-group">
                    <label htmlFor="isPrivate" className="LD_checkbox-label">
                      <input
                        id="isPrivate"
                        type="checkbox"
                        name="isPrivate"
                        checked={formData.isPrivate}
                        onChange={handleChange}
                        className="LD_checkbox"
                      />
                      <span>Private League</span>
                    </label>
                  </div>
                  
                  <div className="LD_button-group">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="LD_button LD_cancel-button"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="LD_button LD_save-button"
                    >
                      Save Settings
                    </button>
                  </div>
                </form>
              ) : (
                <div className="LD_settings-view">
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">League Name:</span>
                    <span className="LD_settings-value">{league.name}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Max Teams:</span>
                    <span className="LD_settings-value">{league.maxTeams}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Scoring Format:</span>
                    <span className="LD_settings-value">{league.scoringFormat}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Draft Type:</span>
                    <span className="LD_settings-value">{league.draftType}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Draft Date:</span>
                    <span className="LD_settings-value">
                      {league.draftDate ? new Date(league.draftDate).toLocaleDateString() : 'Not scheduled'}
                    </span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">League Type:</span>
                    <span className="LD_settings-value">{league.isPrivate ? 'Private' : 'Public'}</span>
                  </div>
                  <div className="LD_settings-item">
                    <span className="LD_settings-label">Created:</span>
                    <span className="LD_settings-value">{new Date(league.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  <button
                    onClick={() => setEditMode(true)}
                    className="LD_button LD_edit-button"
                  >
                    Edit Settings
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Placeholder content for other tabs */}
          {activeTab === 'transactions' && (
            <div className="LD_transactions">
              <h2>League Transactions</h2>
              <p>No transactions to display yet.</p>
            </div>
          )}
          
          {activeTab === 'trading' && (
            <div className="LD_trading">
              <h2>Trading Block</h2>
              <p>No players on the trading block yet.</p>
            </div>
          )}
          
          {activeTab === 'records' && (
            <div className="LD_records">
              <h2>League Record Book</h2>
              <p>League records will be displayed here.</p>
            </div>
          )}
          
          {activeTab === 'email' && (
            <div className="LD_email">
              <h2>League Contact</h2>
              <p>For any questions regarding this league, please contact the commissioner:</p>
              {league && league.users && (
                <div className="LD_commissioner-email">
                  <p><strong>Commissioner:</strong> {
                    league.users.find(u => u.id.toString() === league.commissionerId)?.name || 'Unknown'
                  }</p>
                  <p><strong>Email:</strong> <a href={`mailto:${
                    league.users.find(u => u.id.toString() === league.commissionerId)?.email || ''
                  }`}>
                    {league.users.find(u => u.id.toString() === league.commissionerId)?.email || 'Not available'}
                  </a></p>
                </div>
              )}
            </div>
          )}
          
          {/* Leave League Button - Only show for non-commissioners */}
          {user && league && league.commissionerId !== user.id.toString() && (
            <div className="LD_leave-league">
              <button 
                onClick={() => setShowLeaveConfirm(true)}
                className="LD_button LD_leave-button"
              >
                Leave League
              </button>
            </div>
          )}

          {/* Leave League Confirmation Dialog */}
          {showLeaveConfirm && (
            <div className="LD_confirmation-dialog">
              <div className="LD_confirmation-content">
                <h3>Leave League?</h3>
                <p>Are you sure you want to leave the league "{league.name}"?</p>
                <div className="LD_confirmation-buttons">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="LD_button LD_cancel-button"
                    disabled={leaveLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeaveLeague}
                    className="LD_button LD_confirm-button"
                    disabled={leaveLoading}
                  >
                    {leaveLoading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Restart Draft Confirmation Dialog */}
        {showRestartDraftConfirm && (
          <div className="LD_confirmation-dialog">
          <div className="LD_confirmation-content">
            <h3>Restart Draft?</h3>
            <p>Are you sure you want to restart the draft for "{league.name}"?</p>
            <p>This action will:</p>
            <ul>
              <li>Delete all current draft picks</li>
              <li>Reset all team rosters</li>
              <li>Allow for a new draft</li>
            </ul>
            <p>This action cannot be undone.</p>
            <div className="LD_confirmation-buttons">
              <button
                onClick={() => setShowRestartDraftConfirm(false)}
                className="LD_button LD_cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // First close the dialog to give user feedback
                  setShowRestartDraftConfirm(false);
                  
                  // Then make the API call to reset the draft
                  axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/reset`, {}, {
                    withCredentials: true
                  })
                  .then(() => {
                    // After successful reset, navigate to the draft page
                    navigate(`/leagues/${leagueId}/draft`);
                  })
                  .catch(error => {
                    console.error("Error resetting draft:", error);
                    alert("Failed to reset draft: " + (error.response?.data?.error || error.message));
                  });
                }}
                className="LD_button LD_confirm-button"
              >
                Restart Draft
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default LeagueDetails;