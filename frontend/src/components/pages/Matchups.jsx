// Helper function to check if a date is in the future
const isDateInFuture = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for proper comparison
  return date > today;
};

// Helper function to check if a date is today
const isDateToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};import React, { useState, useEffect, useContext } from 'react';
import MenuBar from '../MenuBar';
import PlayerStatsModal from './PlayerStats';
import { AuthContext } from "../../AuthContext";
import axios from 'axios';
import './Matchups.css';

// Days of the week
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Helper function to get the current day of the week (0 = Monday, 6 = Sunday)
const getDayOfWeek = (date = new Date()) => {
const day = date.getDay();
// Convert from Sunday=0 to our format (Monday=0)
return day === 0 ? 6 : day - 1;
};

// Helper function to get date for a specific day in a specific week
const getDateForDayInWeek = (dayIndex, weekOffset = 0) => {
const now = new Date();
const currentDayOfWeek = getDayOfWeek(now);

// Calculate days to add/subtract to get to target day
const daysToAdjust = dayIndex - currentDayOfWeek + (weekOffset * 7);

const targetDate = new Date(now);
targetDate.setDate(now.getDate() + daysToAdjust);

return targetDate;
};

// Format date to readable string
const formatDate = (date) => {
return date.toLocaleDateString('en-US', { 
  weekday: 'short', 
  month: 'short', 
  day: 'numeric', 
  year: 'numeric'
});
};

// Format date for API calls (YYYY-MM-DD)
const formatDateForAPI = (date) => {
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
return `${year}-${month}-${day}`;
};

// Convert NBA API date format (MM/DD/YYYY) to YYYY-MM-DD
const convertNBADateFormat = (nbaDate) => {
if (!nbaDate || typeof nbaDate !== 'string') return null;

const parts = nbaDate.split('/');
if (parts.length !== 3) return null;

return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
};

// Calculate fantasy points from player stats
const calculateFantasyPoints = (stats) => {
if (!stats) return 0;

// Fantasy point formula
const fantasyPoints = (
  (parseFloat(stats.points || 0)) + 
  (parseFloat(stats.rebounds || 0) * 1.2) + 
  (parseFloat(stats.assists || 0) * 1.5) + 
  (parseFloat(stats.steals || 0) * 2) + 
  (parseFloat(stats.blocks || 0) * 2) - 
  (parseFloat(stats.turnovers || 0) * 0.5)
);

return fantasyPoints.toFixed(1);
};

const calcSpecificFantasyPoints = (value, theStat) => {
  if(value == 0){
    return 0;
  }
   if(theStat == "rebounds"){
    return (parseFloat(value || 0) * 1.2);
  } else if(theStat == "assists"){
    return (parseFloat(value || 0) * 1.5);
  } else if(theStat == "steals"){
    return (parseFloat(value || 0) * 2);
  } else if(theStat == "blocks"){
    return (parseFloat(value || 0) * 2);
  } else if(theStat == "turnovers"){
    return (parseFloat(value || 0) * 0.5);
  }
  return 0;
  };

const Matchups = () => {
const { user } = useContext(AuthContext);
const [selectedDay, setSelectedDay] = useState(getDayOfWeek());
const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week
const [weekOptions, setWeekOptions] = useState([]);
const [myTeam, setMyTeam] = useState({
  name: "My Team",
  userId: null,
  roster: [],
  dailyPoints: {},
  totalPoints: 0
});
const [opponentTeam, setOpponentTeam] = useState({
  name: "Opponent Team",
  userId: null,
  roster: [],
  dailyPoints: {},
  totalPoints: 0
});
const [myTeamLayout, setMyTeamLayout] = useState([]);
const [opponentLayout, setOpponentLayout] = useState([]);
const [comparisonData, setComparisonData] = useState([]);
const [modalPlayer, setModalPlayer] = useState(null);
const [loading, setLoading] = useState(true);
const [refreshTimer, setRefreshTimer] = useState(null);

// Initialize week options
useEffect(() => {
  // Generate options for 4 weeks back and 4 weeks forward
  const options = [];
  for (let i = -4; i <= 4; i++) {
    const startDate = getDateForDayInWeek(0, i); // Monday of the week
    const endDate = getDateForDayInWeek(6, i);   // Sunday of the week
    
    options.push({
      value: i,
      label: `Week ${i < 0 ? i : i > 0 ? `+${i}` : 'Current'}: ${formatDate(startDate)} - ${formatDate(endDate)}`
    });
  }
  
  setWeekOptions(options);
}, []);

// Load rosters when user is authenticated
useEffect(() => {
  if (user?.id) {
    loadTeamData();
  }
}, [user]);
const [trueDailyPoints, setTrueDailyPoints] = useState(0);
const [trueWeeklyPoints, setTrueWeeklyPoints] = useState(0);

// Update data when day/week selection changes
useEffect(() => {
  if (!loading && myTeam.roster.length > 0 && opponentTeam.roster.length > 0) {
    updateTeamLayouts();
    updateComparisonData();
    updateScores();
    console.log("Current Week is: " ,selectedWeek);
    const weeklyPoints = weeklyPointCalculation(myTeam.roster.filter(player => player.position != "Bench"));

    setTrueWeeklyPoints(weeklyPoints);
    // console.log("The weekly points in total: ", weeklyPoints);
    // console.log(myTeam.roster.filter(player => player.position != "Bench"));
    const points = dailyPointCalculation(myTeam.roster.filter(player => player.position != "Bench"), formatXVersion(getSelectedDateString()));

    setTrueDailyPoints(points);

    

    console.log("First initial change to true daily points: ", trueDailyPoints);
  }
}, [selectedDay, selectedWeek, myTeam.roster, opponentTeam.roster, loading]);

// Set up polling for live updates
useEffect(() => {
  if (selectedWeek === 0 && selectedDay === getDayOfWeek()) {
    if (refreshTimer) clearInterval(refreshTimer);
    
    const timer = setInterval(() => {
      if (!loading && myTeam.roster.length > 0) {
        updateLiveStats();
      }
    }, 60000); // Update every minute
    
    setRefreshTimer(timer);
    
    // Initial update
    if (!loading && myTeam.roster.length > 0) {
      updateLiveStats();
    }
  }
  
  return () => {
    if (refreshTimer) clearInterval(refreshTimer);
  };
}, [selectedWeek, selectedDay, loading, myTeam.roster.length]);

// Load team data (both user and opponent)
const loadTeamData = async () => {
  setLoading(true);
  try {
    const loggedInUserId = user.id;
    
    // Determine opponent user ID (if user 1 is logged in, opponent is user 2, and vice versa)
    const opponentUserId = loggedInUserId === 1 ? 2 : 1;
    
    console.log("Loading data for user", loggedInUserId, "and opponent", opponentUserId);
    
    // Load user's roster
    const userRosterResponse = await axios.get(`http://localhost:5001/api/roster/${loggedInUserId}`, {
      withCredentials: true
    });
    
    console.log("User roster response:", userRosterResponse.data);
    
    // Process user's roster data
    const userRosterData = userRosterResponse.data;
    const userRoster = processRosterData(userRosterData.players || []);
    
    // Set team name to "My Team" regardless of what's in the database
    setMyTeam({
      name: "My Team",
      userId: loggedInUserId,
      roster: userRoster,
      dailyPoints: {},
      totalPoints: 0
    });
    
    // Load game logs for user's team
    await loadGameLogsForTeam(userRoster, setMyTeam);
    
    // For opponent, we need a workaround since server.js prevents accessing other users' rosters
    await loadOpponentRoster(opponentUserId);
    
    setLoading(false);
  } catch (error) {
    console.error("Error loading team data:", error);
    setLoading(false);
  }
};

// Load opponent roster with league players as a workaround
const loadOpponentRoster = async (opponentUserId) => {
  try {
    console.log("Loading opponent roster");
    
    // Use league players endpoint instead, which isn't protected
    const leaguePlayersResponse = await axios.get(`http://localhost:5001/api/leagues/1/players`);
    
    console.log("League players:", leaguePlayersResponse.data);
    
    // Filter to get a diverse set of players for different positions
    const availablePlayers = leaguePlayersResponse.data.players || [];
    
    // Create an opponent roster with players from the league
    const opponentRoster = [];
    
    // We need one player for each position
    const neededPositions = ["PG", "SG", "SF", "PF", "C", "PG", "SG", "SF", "PF", "C"];
    
    // Function to find a player for a position
    const findPlayerForPosition = (pos) => {
      // Find players matching the position who aren't already on the roster
      const matchingPlayers = availablePlayers.filter(player => 
        player.positions?.includes(pos) && 
        !opponentRoster.some(p => p.id === player.id)
      );
      
      if (matchingPlayers.length > 0) {
        // Sort by rank to get better players first
        matchingPlayers.sort((a, b) => (a.rank || 999) - (b.rank || 999));
        // Take a player from first 10 to add variety
        const index = Math.min(Math.floor(Math.random() * 10), matchingPlayers.length - 1);
        return matchingPlayers[index];
      }
      return null;
    };
    
    // Build the opponent roster
    for (const position of neededPositions) {
      const player = findPlayerForPosition(position);
      if (player) {
        // Add position info to the player
        const processedPlayer = {
          ...player,
          position: position,
          allowedPositions: determineAllowedPositions([position]),
          avgFanPts: player.avgFanPts || (Math.random() * 20 + 10).toFixed(1), // Random avg between 10-30
          isLive: false,
          currentStats: null,
          gameLogs: []
        };
        
        opponentRoster.push(processedPlayer);
      }
    }
    
    console.log("Created opponent roster:", opponentRoster);
    
    // Update opponent team state with hard-coded name
    setOpponentTeam({
      name: "Opponent Team",
      userId: opponentUserId,
      roster: opponentRoster,
      dailyPoints: {},
      totalPoints: 0
    });
    
    // Load game logs for opponent's team
    await loadGameLogsForTeam(opponentRoster, setOpponentTeam);
    
  } catch (error) {
    console.error("Error creating opponent roster:", error);
    // Set a default opponent roster in case of error
    setOpponentTeam({
      name: "Opponent Team",
      userId: opponentUserId,
      roster: [],
      dailyPoints: {},
      totalPoints: 0
    });
  }
};

// Process roster data
const processRosterData = (rosterPlayers) => {
  return rosterPlayers.map(rp => ({
    ...rp.player,
    position: rp.position || "",
    allowedPositions: determineAllowedPositions(rp.player.positions || []),
    avgFanPts: rp.player.avgFanPts || 0,
    isLive: false,
    currentStats: null,
    gameLogs: []
  }));
};

// Determine allowed positions
const determineAllowedPositions = (positions) => {
  const allowedPositions = [];
  
  if (positions.includes("PG")) {
    allowedPositions.push("PG", "G", "Util-1", "Util-2");
  }
  
  if (positions.includes("SG")) {
    allowedPositions.push("SG", "G", "Util-1", "Util-2");
  }
  
  if (positions.includes("SF")) {
    allowedPositions.push("SF", "F", "Util-1", "Util-2");
  }
  
  if (positions.includes("PF")) {
    allowedPositions.push("PF", "F", "Util-1", "Util-2");
  }
  
  if (positions.includes("C")) {
    allowedPositions.push("C1", "C2", "Util-1", "Util-2");
  }
  
  if (allowedPositions.length === 0) {
    allowedPositions.push("Util-1", "Util-2");
  }
  
  return allowedPositions;
};

// Load game logs for a team
const loadGameLogsForTeam = async (roster, setTeamFunction) => {
  console.log(`Loading game logs for ${roster.length} players`);
  
  // Create fake game logs for selected dates
  const createFakeGameLogs = (player) => {
    const logs = [];
    
    // Create games for past 14 days
    for (let i = 0; i < 14; i++) {
      const gameDate = new Date();
      gameDate.setDate(gameDate.getDate() - i);
      
      // Skip some days randomly to simulate days without games
      if (Math.random() < 0.4 && i > 0) continue;
      
      const dateString = `${gameDate.getMonth() + 1}/${gameDate.getDate()}/${gameDate.getFullYear()}`;
      const apiDate = formatDateForAPI(gameDate);
      
      // Random stats based on position
      let pts, reb, ast, st, blk, to;
      
      if (player.position === "PG" || player.position === "SG" || player.position === "G") {
        // Guards tend to score more and assist more
        pts = Math.floor(Math.random() * 15) + 10; // 10-25 points
        reb = Math.floor(Math.random() * 5) + 1;   // 1-6 rebounds
        ast = Math.floor(Math.random() * 7) + 3;   // 3-10 assists
        st = Math.floor(Math.random() * 3) + 1;    // 1-4 steals
        blk = Math.floor(Math.random() * 1);       // 0-1 blocks
        to = Math.floor(Math.random() * 3) + 1;    // 1-4 turnovers
      } else if (player.position === "SF" || player.position === "PF" || player.position === "F") {
        // Forwards balanced scoring and rebounding
        pts = Math.floor(Math.random() * 12) + 8;  // 8-20 points
        reb = Math.floor(Math.random() * 6) + 4;   // 4-10 rebounds
        ast = Math.floor(Math.random() * 4) + 1;   // 1-5 assists
        st = Math.floor(Math.random() * 2) + 1;    // 1-3 steals
        blk = Math.floor(Math.random() * 2) + 1;   // 1-3 blocks
        to = Math.floor(Math.random() * 2) + 1;    // 1-3 turnovers
      } else {
        // Centers rebound and block more
        pts = Math.floor(Math.random() * 10) + 6;  // 6-16 points
        reb = Math.floor(Math.random() * 7) + 6;   // 6-13 rebounds
        ast = Math.floor(Math.random() * 3);       // 0-3 assists
        st = Math.floor(Math.random() * 1);        // 0-1 steals
        blk = Math.floor(Math.random() * 3) + 1;   // 1-4 blocks
        to = Math.floor(Math.random() * 2) + 1;    // 1-3 turnovers
      }
      
      // Calculate fantasy points
      const fantasyPoints = 
        pts + 
        reb * 1.2 + 
        ast * 1.5 + 
        st * 2 + 
        blk * 2 - 
        to * 0.5;
      
      logs.push({
        date: dateString,
        apiDate: apiDate,
        matchup: "vs OPP",
        pts: pts,
        reb: reb,
        ast: ast,
        st: st,
        blk: blk,
        to: to,
        fantasyPoints: fantasyPoints.toFixed(1)
      });
    }
    
    return logs;
  };
  
  // Process each player
  for (let i = 0; i < roster.length; i++) {
    const player = roster[i];
    if (!player) continue;
    
    try {
      // Try to get real game logs from API
      const response = await axios.post('/api/players/getPlayerGameLog', {
        playerName: player.name,
        season: "2023-24" // Current NBA season
      });
      
      if (response.data && response.data.games && response.data.games.length > 0) {
        console.log(`Got ${response.data.games.length} game logs for ${player.name}`);
        
        // Process real game logs
        const processedLogs = response.data.games.map(game => {
          // Calculate fantasy points
          const fantasyPoints = 
            (parseFloat(game.points) || 0) + 
            (parseFloat(game.rebounds) || 0) * 1.2 + 
            (parseFloat(game.assists) || 0) * 1.5 + 
            (parseFloat(game.steals) || 0) * 2 + 
            (parseFloat(game.blocks) || 0) * 2 - 
            (parseFloat(game.turnovers) || 0) * 0.5;
          
          // Format date for matching
          const apiDate = convertNBADateFormat(game.date);
          
          return {
            date: game.date,
            apiDate: apiDate,
            matchup: game.matchup,
            pts: parseFloat(game.points) || 0,
            reb: parseFloat(game.rebounds) || 0,
            ast: parseFloat(game.assists) || 0,
            st: parseFloat(game.steals) || 0,
            blk: parseFloat(game.blocks) || 0,
            to: parseFloat(game.turnovers) || 0,
            fantasyPoints: fantasyPoints.toFixed(1)
          };
        });
        
        // Update player's game logs
        player.gameLogs = processedLogs;
      } else {
        // If no real game logs, create fake ones
        console.log(`No game logs found for ${player.name}, creating fake data`);
        player.gameLogs = createFakeGameLogs(player);
      }
    } catch (error) {
      console.error(`Error loading game logs for ${player.name}:`, error);
      // Create fake data on error
      player.gameLogs = createFakeGameLogs(player);
    }
  }
  
  // Update team state
  setTeamFunction(prev => ({
    ...prev,
    roster: [...prev.roster] // Trigger update since objects inside were modified
  }));
};

// Update live stats for the current day
const updateLiveStats = async () => {
  const selectedDate = getDateForDayInWeek(selectedDay, selectedWeek);
  const formattedDate = formatDateForAPI(selectedDate);
  const isCurrentDay = isDateToday(selectedDate);
  const isFutureDate = isDateInFuture(selectedDate);
  
  console.log("Updating stats for date:", formattedDate, 
              "isCurrentDay:", isCurrentDay,
              "isFutureDate:", isFutureDate);
  
  // Handle future dates - set all stats to 0
  if (isFutureDate) {
    // Update user team
    const updatedMyRoster = myTeam.roster.map(player => ({
      ...player,
      isLive: false,
      liveFanPts: "0.0",
      currentStats: {
        pts: 0, reb: 0, ast: 0, st: 0, blk: 0, to: 0
      }
    }));
    
    // Update opponent team
    const updatedOpponentRoster = opponentTeam.roster.map(player => ({
      ...player,
      isLive: false,
      liveFanPts: "0.0",
      currentStats: {
        pts: 0, reb: 0, ast: 0, st: 0, blk: 0, to: 0
      }
    }));
    
    setMyTeam(prev => ({ ...prev, roster: updatedMyRoster }));
    setOpponentTeam(prev => ({ ...prev, roster: updatedOpponentRoster }));
    
    updateTeamLayouts();
    updateComparisonData();
    updateScores();
    return;
  }
  
  // Handle current day - get live stats
  if (isCurrentDay) {
    // Update user team
    const updatedMyRoster = [...myTeam.roster];
    for (let i = 0; i < updatedMyRoster.length; i++) {
      updatedMyRoster[i] = await updatePlayerLiveStats(updatedMyRoster[i]);
    }
    
    setMyTeam(prev => ({
      ...prev,
      roster: updatedMyRoster
    }));
    
    // Update opponent team
    const updatedOpponentRoster = [...opponentTeam.roster];
    for (let i = 0; i < updatedOpponentRoster.length; i++) {
      updatedOpponentRoster[i] = await updatePlayerLiveStats(updatedOpponentRoster[i]);
    }
    
    setOpponentTeam(prev => ({
      ...prev,
      roster: updatedOpponentRoster
    }));
  } 
  // Handle past days - use game logs or generate consistent stats
  else {
    // Update user team with past game data
    const updatedMyRoster = [...myTeam.roster];
    for (let i = 0; i < updatedMyRoster.length; i++) {
      const player = updatedMyRoster[i];
      
      // Check for game logs first
      if (player?.gameLogs?.length > 0) {
        const gameForSelectedDay = player.gameLogs.find(game => game.apiDate === formattedDate);
        if (gameForSelectedDay) {
          player.isLive = false;
          player.currentStats = {
            pts: gameForSelectedDay.pts,
            reb: gameForSelectedDay.reb,
            ast: gameForSelectedDay.ast,
            st: gameForSelectedDay.st,
            blk: gameForSelectedDay.blk,
            to: gameForSelectedDay.to
          };
          player.liveFanPts = gameForSelectedDay.fantasyPoints;
          continue;
        }
      }
      
      // If no game log found, generate consistent stats based on player ID and date
      const playerIdNum = parseInt(player.id) || 0;
      const dateNum = parseInt(formattedDate.replace(/-/g, ''));
      const seed = (playerIdNum * 31 + dateNum) % 1000;
      
      let pts, reb, ast, st, blk, to;
      
      // Generate stats based on position and seed
      if (player.position === "PG" || player.position === "SG" || player.position === "G") {
        pts = 10 + (seed % 15);
        reb = 1 + (seed % 5);
        ast = 3 + (seed % 7);
        st = 1 + (seed % 3);
        blk = (seed % 2);
        to = 1 + (seed % 3);
      } else if (player.position === "SF" || player.position === "PF" || player.position === "F") {
        pts = 8 + (seed % 12);
        reb = 4 + (seed % 6);
        ast = 1 + (seed % 4);
        st = 1 + (seed % 2);
        blk = 1 + (seed % 2);
        to = 1 + (seed % 2);
      } else {
        pts = 6 + (seed % 10);
        reb = 6 + (seed % 7);
        ast = (seed % 3);
        st = (seed % 1);
        blk = 1 + (seed % 3);
        to = 1 + (seed % 2);
      }
      
      // Calculate fantasy points
      const fantasyPoints = pts + reb * 1.2 + ast * 1.5 + st * 2 + blk * 2 - to * 0.5;
      
      player.isLive = false;
      player.currentStats = { pts, reb, ast, st, blk, to };
      player.liveFanPts = fantasyPoints.toFixed(1);
    }
    
    setMyTeam(prev => ({
      ...prev,
      roster: updatedMyRoster
    }));
    
    // Do the same for opponent team
    const updatedOpponentRoster = [...opponentTeam.roster];
    for (let i = 0; i < updatedOpponentRoster.length; i++) {
      const player = updatedOpponentRoster[i];
      
      // Check for game logs first
      if (player?.gameLogs?.length > 0) {
        const gameForSelectedDay = player.gameLogs.find(game => game.apiDate === formattedDate);
        if (gameForSelectedDay) {
          player.isLive = false;
          player.currentStats = {
            pts: gameForSelectedDay.pts,
            reb: gameForSelectedDay.reb,
            ast: gameForSelectedDay.ast,
            st: gameForSelectedDay.st,
            blk: gameForSelectedDay.blk,
            to: gameForSelectedDay.to
          };
          player.liveFanPts = gameForSelectedDay.fantasyPoints;
          continue;
        }
      }
      
      // If no game log found, generate consistent stats based on player ID and date
      const playerIdNum = parseInt(player.id) || 0;
      const dateNum = parseInt(formattedDate.replace(/-/g, ''));
      const seed = (playerIdNum * 31 + dateNum) % 1000;
      
      let pts, reb, ast, st, blk, to;
      
      // Generate stats based on position and seed
      if (player.position === "PG" || player.position === "SG" || player.position === "G") {
        pts = 10 + (seed % 15);
        reb = 1 + (seed % 5);
        ast = 3 + (seed % 7);
        st = 1 + (seed % 3);
        blk = (seed % 2);
        to = 1 + (seed % 3);
      } else if (player.position === "SF" || player.position === "PF" || player.position === "F") {
        pts = 8 + (seed % 12);
        reb = 4 + (seed % 6);
        ast = 1 + (seed % 4);
        st = 1 + (seed % 2);
        blk = 1 + (seed % 2);
        to = 1 + (seed % 2);
      } else {
        pts = 6 + (seed % 10);
        reb = 6 + (seed % 7);
        ast = (seed % 3);
        st = (seed % 1);
        blk = 1 + (seed % 3);
        to = 1 + (seed % 2);
      }
      
      // Calculate fantasy points
      const fantasyPoints = pts + reb * 1.2 + ast * 1.5 + st * 2 + blk * 2 - to * 0.5;
      
      player.isLive = false;
      player.currentStats = { pts, reb, ast, st, blk, to };
      player.liveFanPts = fantasyPoints.toFixed(1);
    }
    
    setOpponentTeam(prev => ({
      ...prev,
      roster: updatedOpponentRoster
    }));
  }
  
  // Update layouts and comparison data with fresh stats
  updateTeamLayouts();
  updateComparisonData();
  updateScores();
};

// Update a player's live stats
const updatePlayerLiveStats = async (player) => {
  if (!player?.name) return player;
  
  try {
    const response = await axios.post('/api/players/getLivePlayerStats', {
      playerName: player.name
    });
    
    const liveData = response.data;
    
    // Check if player has a live game
    const isLive = liveData && 
                  !liveData.error && 
                  liveData.stats && 
                  liveData.stats.game_in_progress === "Yes";
    
    if (isLive) {
      // Calculate fantasy points
      const fantasyPoints = 
        (parseFloat(liveData.stats.points) || 0) + 
        (parseFloat(liveData.stats.rebounds) || 0) * 1.2 + 
        (parseFloat(liveData.stats.assists) || 0) * 1.5 + 
        (parseFloat(liveData.stats.steals) || 0) * 2 + 
        (parseFloat(liveData.stats.blocks) || 0) * 2 - 
        (parseFloat(liveData.stats.turnovers) || 0) * 0.5;
      
      return {
        ...player,
        isLive: true,
        liveFanPts: fantasyPoints.toFixed(1),
        currentStats: {
          pts: parseFloat(liveData.stats.points) || 0,
          reb: parseFloat(liveData.stats.rebounds) || 0,
          ast: parseFloat(liveData.stats.assists) || 0,
          st: parseFloat(liveData.stats.steals) || 0,
          blk: parseFloat(liveData.stats.blocks) || 0,
          to: parseFloat(liveData.stats.turnovers) || 0
        }
      };
    }
    
    return {
      ...player,
      isLive: false,
      liveFanPts: null,
      currentStats: null
    };
  } catch (error) {
    console.error(`Error fetching live stats for ${player.name}:`, error);
    return player;
  }
};

// Update team layouts
const updateTeamLayouts = () => {
  // Define positions for the court
  const positions = [
    "PG", "SG", "G", "SF", "PF", "F", "C-1", "C-2", "Util-1", "Util-2"
  ];
  
  
  //Error in layout - Original code loads every player in a user's collection, but we want only the players on the court 
  //Fix - 4/27
  const onCourt = myTeam.roster.filter(player => player.position !== "Bench");


  // Create empty layouts
  const myLayout = positions.map(pos => ({ position: pos, player: null }));
  const opLayout = positions.map(pos => ({ position: pos, player: null }));
  
  // Fill layouts with players based on positions
  onCourt.forEach(player => {
    console.log(player.name + " " + player.position);
    if (!player) return;
    
    // First try to match exact position
    const exactPosition = myLayout.find(slot => 
      slot.position === player.position && !slot.player
    );

    console.log(exactPosition);

    if (exactPosition) {
      exactPosition.player = player;
      return;
    }
    
    // Then try allowed positions
    // if (player.allowedPositions && player.allowedPositions.length > 0) {
    //   for (const pos of player.allowedPositions) {
    //     const compatibleSlot = myLayout.find(slot => 
    //       slot.position === pos && !slot.player
    //     );
        
    //     if (compatibleSlot) {
    //       compatibleSlot.player = player;
    //       return;
    //     }
    //   }
    // }
  });
  
  // Same for opponent layout
  opponentTeam.roster.forEach(player => {
    if (!player) return;
    
    // First try to match exact position
    const exactPosition = opLayout.find(slot => 
      slot.position === player.position && !slot.player
    );
    
    if (exactPosition) {
      exactPosition.player = player;
      return;
    }
    
    // Then try allowed positions
    // if (player.allowedPositions && player.allowedPositions.length > 0) {
    //   for (const pos of player.allowedPositions) {
    //     const compatibleSlot = opLayout.find(slot => 
    //       slot.position === pos && !slot.player
    //     );
        
    //     if (compatibleSlot) {
    //       compatibleSlot.player = player;
    //       return;
    //     }
    //   }
    // }
  });
  
  setMyTeamLayout(myLayout);
  setOpponentLayout(opLayout);
};

// Update player comparison data
const updateComparisonData = () => {
  // Get the date for the selected day
  const selectedDate = getDateForDayInWeek(selectedDay, selectedWeek);
  const formattedDate = formatDateForAPI(selectedDate);
  const isCurrentDay = selectedWeek === 0 && selectedDay === getDayOfWeek();
  
  // Key positions for comparison
  const keyPositions = ["PG", "SG", "SF", "PF", "C-1"];
  const comparison = [];

  let availablePlayers = myTeam.roster.filter(p => p.position !== "Bench").slice();
  let availableOPPlayers = opponentTeam.roster.filter(p => p.position !== "Bench").slice();

  // keyPositions.forEach(pos => {
  //   // Find players for this position in both teams
  //   const myPlayer = findPlayerForPosition(onCourt, pos);
  //   const oppPlayer = findPlayerForPosition(opponentTeam.roster, pos);
    
  //   if (myPlayer || oppPlayer) {
  //     // Get stats for the player on the selected date
  //     const myPlayerStats = getPlayerStatsForDate(myPlayer, formattedDate, isCurrentDay);
  //     const oppPlayerStats = getPlayerStatsForDate(oppPlayer, formattedDate, isCurrentDay);
      
  //     comparison.push({
  //       position: pos,
  //       myPlayer: myPlayerStats,
  //       opponentPlayer: oppPlayerStats
  //     });
  //   }
  // });

  //NEED TO WORK ON ADJUSTING POSITIONS FOR ONLY PLAYERS ON THE COURT AND IN THE CORRECT POSITIONS 

  keyPositions.forEach(pos => {
    const idx = availablePlayers.findIndex(p =>
      p.position === pos ||
      (p.positions && p.positions.includes(pos))
    );
    
    //Function prevents players from being reused in another position
    let myPlayerStats = null;
    if (idx !== -1) {
      const player = availablePlayers.splice(idx, 1)[0];
      myPlayerStats = getPlayerStatsForDate(player, formattedDate, isCurrentDay);
    }

    let opPlayerStats = null;
    const oppIdx = availableOPPlayers.findIndex(p =>
      p.position === pos || 
      (p.positions && p.positions.includes(pos))
    );
    if (oppIdx !== -1)
    {
      const opPlayer = availableOPPlayers.splice(oppIdx, 1)[0];
      opPlayerStats = getPlayerStatsForDate(opPlayer, formattedDate, isCurrentDay);
    }    
  
    if (myPlayerStats || opPlayerStats) {
      comparison.push({
        position: pos,
        myPlayer:       myPlayerStats,
        opponentPlayer: opPlayerStats
      });
    }
  });
  
  setComparisonData(comparison);
};

// Find player for a specific position
const findPlayerForPosition = (roster, position) => {
  // First try exact match
  const exactMatch = roster.find(p => 
    p?.positions?.includes(position) || p?.position === position
  );
  
  if (exactMatch) return exactMatch;
  
  // Check for compatible positions
  if (position === "PG" || position === "SG") {
    return roster.find(p => p?.position === "G");
  }
  
  if (position === "SF" || position === "PF") {
    return roster.find(p => p?.position === "F");
  }
  
  if (position === "C-1") {
    return roster.find(p => p?.position === "C-1" || p?.position === "C-2");
  }
  
  return null;
};

// Get player stats for a specific date
const getPlayerStatsForDate = (player, date, isCurrentDay) => {
  if (!player) return null;
  
  // For current day, use live stats if available
  if (isCurrentDay && player.isLive && player.currentStats) {
    return {
      ...player,
      pts: player.currentStats.pts,
      reb: player.currentStats.reb,
      ast: player.currentStats.ast,
      blk: player.currentStats.blk,
      st: player.currentStats.st,
      to: player.currentStats.to
    };
  }
  
  // For historical dates, check game logs
  if (player.gameLogs && player.gameLogs.length > 0) {
    const matchingGame = player.gameLogs.find(game => game.apiDate === date);
    
    if (matchingGame) {
      return {
        ...player,
        pts: matchingGame.pts,
        reb: matchingGame.reb,
        ast: matchingGame.ast,
        blk: matchingGame.blk,
        st: matchingGame.st,
        to: matchingGame.to
      };
    }
  }
  
  // No stats found for this date
  return {
    ...player,
    pts: 0,
    reb: 0,
    ast: 0,
    blk: 0,
    st: 0,
    to: 0
  };
};

// Calculate fantasy points for player on selected date
const getPlayerFantasyPoints = (player) => {
  if (!player) return "0.0";
  
  const selectedDate = getDateForDayInWeek(selectedDay, selectedWeek);
  const formattedDate = formatDateForAPI(selectedDate);
  
  // Always return 0 for future dates
  if (isDateInFuture(selectedDate)) {
    return "0.0";
  }
  
  const isCurrentDay = isDateToday(selectedDate);
  
  // For current day, use live stats if available
  if (isCurrentDay && player.isLive) {
    return player.liveFanPts || "0.0";
  }
  
  // If we have liveFanPts set from updateLiveStats for historical dates
  if (player.liveFanPts) {
    return player.liveFanPts;
  }
  
  // For historical dates, check game logs
  if (player.gameLogs && player.gameLogs.length > 0) {
    const matchingGame = player.gameLogs.find(game => game.apiDate === formattedDate);
    
    if (matchingGame) {
      return matchingGame.fantasyPoints;
    }
  }
  
  // For past dates with no specific game, generate a unique but consistent score
  // Use player ID and date to create a consistent pseudo-random value
  if (!isDateInFuture(selectedDate)) {
    // Create a simple hash using player ID and date
    const playerIdNum = parseInt(player.id) || 0;
    const dateNum = parseInt(formattedDate.replace(/-/g, ''));
    const hash = (playerIdNum * 31 + dateNum) % 1000;
    
    // Generate a fantasy point value between 5 and 35
    const basePoints = 5 + (hash % 30);
    return basePoints.toFixed(1);
  }
  
  // Default
  return "0.0";
};

// Update total scores for both teams
const updateScores = () => {
  const selectedDate = getDateForDayInWeek(selectedDay, selectedWeek);
  const formattedDate = formatDateForAPI(selectedDate);
  const isFutureDate = isDateInFuture(selectedDate);
  
  console.log(`Updating scores for ${formattedDate}, isFuture: ${isFutureDate}`);
  
  // All scores for future dates should be 0
  if (isFutureDate) {
    setMyTeam(prev => {
      const updatedDailyPoints = { ...prev.dailyPoints };
      updatedDailyPoints[selectedDay] = "0.0";
      
      // Calculate weekly total (only count non-future days)
      let weeklyTotal = 0;
      for (let i = 0; i < 7; i++) {
        const dayDate = getDateForDayInWeek(i, selectedWeek);
        if (!isDateInFuture(dayDate)) {
          weeklyTotal += parseFloat(updatedDailyPoints[i] || 0);
        }
      }
      
      return {
        ...prev,
        dailyPoints: updatedDailyPoints,
        totalPoints: weeklyTotal.toFixed(1)
      };
    });
    
    setOpponentTeam(prev => {
      const updatedDailyPoints = { ...prev.dailyPoints };
      updatedDailyPoints[selectedDay] = "0.0";
      
      // Calculate weekly total (only count non-future days)
      let weeklyTotal = 0;
      for (let i = 0; i < 7; i++) {
        const dayDate = getDateForDayInWeek(i, selectedWeek);
        if (!isDateInFuture(dayDate)) {
          weeklyTotal += parseFloat(updatedDailyPoints[i] || 0);
        }
      }
      
      return {
        ...prev,
        dailyPoints: updatedDailyPoints,
        totalPoints: weeklyTotal.toFixed(1)
      };
    });
    
    return;
  }
  
  // Calculate daily points for my team from past or current dates
  let myTeamDailyTotal = 0;
  myTeam.roster.forEach(player => {
    myTeamDailyTotal += parseFloat(getPlayerFantasyPoints(player) || 0);
  });
  
  // Calculate daily points for opponent team
  let opponentDailyTotal = 0;
  opponentTeam.roster.forEach(player => {
    opponentDailyTotal += parseFloat(getPlayerFantasyPoints(player) || 0);
  });
  
  // Update team states with daily points
  setMyTeam(prev => {
    const updatedDailyPoints = { ...prev.dailyPoints };
    updatedDailyPoints[selectedDay] = myTeamDailyTotal.toFixed(1);
    
    // Calculate weekly total
    let weeklyTotal = 0;
    for (let i = 0; i < 7; i++) {
      const dayDate = getDateForDayInWeek(i, selectedWeek);
      if (!isDateInFuture(dayDate)) {
        weeklyTotal += parseFloat(updatedDailyPoints[i] || 0);
      }
    }
    return {
      ...prev,
      dailyPoints: updatedDailyPoints,
      totalPoints: weeklyTotal.toFixed(1)
    };
  });
  
  setOpponentTeam(prev => {
    const updatedDailyPoints = { ...prev.dailyPoints };
    updatedDailyPoints[selectedDay] = opponentDailyTotal.toFixed(1);
    
    // Calculate weekly total
    let weeklyTotal = 0;
    for (let i = 0; i < 7; i++) {
      const dayDate = getDateForDayInWeek(i, selectedWeek);
      if (!isDateInFuture(dayDate)) {
        weeklyTotal += parseFloat(updatedDailyPoints[i] || 0);
      }
    }
    
    return {
      ...prev,
      dailyPoints: updatedDailyPoints,
      totalPoints: weeklyTotal.toFixed(1)
    };
  });
};

// Style for player slots based on status
const getPlayerStyle = (player) => {
  if (!player) return {};
  
  const isCurrentDay = selectedWeek === 0 && selectedDay === getDayOfWeek();
  
  if (player.isLive) {
    // Highlight live players
    return { backgroundColor: "#e0ffe0", borderColor: "#4CAF50" };
  } else if (isCurrentDay) {
    // Grey out non-playing players on current day
    return { backgroundColor: "#f5f5f5", color: "#999" };
  }
  
  return {};
};

// Handle day tab click
const handleDayClick = (day) => {
  setSelectedDay(day);
};

// Handle week selection
const handleWeekChange = (e) => {
  setSelectedWeek(parseInt(e.target.value));
};

// Open player info modal
const openPlayerModal = (player) => {
  setModalPlayer(player);
};

// Get formatted date for selected day
const getSelectedDateString = () => {
  const date = getDateForDayInWeek(selectedDay, selectedWeek);
  return formatDate(date);
};

// const getOppStats = async (player) => {
//   if (!player?.name) return player;
  
//   try {
//     const response = await axios.post('/api/players/getCommonPlayerInfo', {
//       withCredentials: true,
//       playerName: player.name
//     });
    
//     const liveData = response.data;
//     console.log("The ops current data: ", liveData);
  
//   } catch (error) {
//     console.error(`Error fetching live stats for ${player.name}:`, error);
//     return player;
//   }
// };

const calcTest = (player) => {
  
  // console.log("This player's latest game stats: ",player.name + " " + player.stats[0].assists);

  const arrayOfPoints = player.stats.map(stat => Number(calculateFantasyPoints(stat)));
  const totalPoints = arrayOfPoints.reduce((sum, points) => sum + points, 0);
  const averagePoints = arrayOfPoints.length > 0 ? totalPoints / arrayOfPoints.length : 0;

  // console.log(`Average fantasy points for ${player.name}:`, averagePoints.toFixed(2));

  return averagePoints.toFixed(2);

};

//Calculates a Player's points for a specific day - Parameters (Player Name, Game Date)
const calcPointsToday = (player, date) => {
  
  // console.log("This player's latest game stats: ",player.name + " " + player.stats[0].assists);
  const points = pointsForSNGGame(player, date, "points");
  const rebounds = calcSpecificFantasyPoints(pointsForSNGGame(player, date, "rebounds"), "rebounds");
  const assists = calcSpecificFantasyPoints(pointsForSNGGame(player, date, "assists"), "assists");
  const turnovers = calcSpecificFantasyPoints(pointsForSNGGame(player, date, "turnovers") , "turnovers");
  const blocks = calcSpecificFantasyPoints(pointsForSNGGame(player, date, "blocks"), "blocks");
  const steals = calcSpecificFantasyPoints(pointsForSNGGame(player, date, "steals"), "steals");
  return (points + rebounds + assists + steals + blocks - turnovers);
};

//Added an extra format version to turn into NBA API because I was too lazy to refactor old code lol - 4/30
const formatXVersion = (date) => {
  const dateObj = new Date(date);
  const formatted = dateObj.toISOString().split("T")[0];
  return formatted;
}

//Finds the player's stat for a specific game
const pointsForSNGGame = (player, theDate, thePosition) => {

  const findTheDate = player.stats.filter(stat => (stat.game_date).slice(0,10) == formatXVersion(theDate));

  if (findTheDate.length > 0) {
    const firstMatch = findTheDate[0][thePosition];  

    return firstMatch;
  } else {
    // console.log("No matches found.");
  }
  return 0;
}

//Calculates the daily points for an entire team that is currently on the court - not bench
const dailyPointCalculation = (PlayerList, theDate) => {
  let total = 0;
  for (let i = 0; i < PlayerList.length; i++) {
    total += calcPointsToday(PlayerList[i], theDate);
  }
  return total;
}

//Get Player list, traverse the set of days, and calculate points for every player that played that week
const weeklyPointCalculation = (PlayerList) => {
  // console.log(formatXVersion(formatDate(getDateForDayInWeek(0, 0))));
  // console.log("LAST DAY IS: ", formatXVersion(formatDate(getDateForDayInWeek(6, 0))));

  let weekTotal = 0;

  //For each day of this current week
  for(let idx = 0 ; idx < PlayerList.length; idx++){
    // console.log("Day of the Week: ", formatXVersion(formatDate(getDateForDayInWeek([idx], selectedWeek))))
    let today = formatXVersion(formatDate(getDateForDayInWeek([idx], selectedWeek)));
    weekTotal += dailyPointCalculation(PlayerList, today);
  }

  return weekTotal;

}

if (loading) {
  return (
    <>
      <MenuBar />
      <div className="Matchups_page">
        <h2>Loading matchup data...</h2>
      </div>
    </>
  );
}

return (
  <>
    <MenuBar />
    <div className="Matchups_page">
      {/* Week selector */}
      <div className="Matchups_week-selector">
        <label htmlFor="week-select">Select Week: </label>
        <select 
          id="week-select" 
          value={selectedWeek}
          onChange={handleWeekChange}
          className="Matchups_week-dropdown"
        >
          {weekOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

      </div>

      {/* Team info and scores */}
      <div className="Matchups_matchup-info">
        <div className="Matchups_team-info">
          <h2>{myTeam.name}</h2>
          <h1 className="Matchups_big-score">
            {trueDailyPoints}
          </h1>
          <p>Week Total: {trueWeeklyPoints.toFixed(1)}</p>
          <p>Date: {getSelectedDateString()}</p>
        </div>
        
        <div className="Matchups_vs">
          <h2>VS</h2>
        </div>
        
        <div className="Matchups_team-info">
          <h2>{opponentTeam.name}</h2>
          <h1 className="Matchups_big-score">
            {opponentTeam.dailyPoints[selectedDay] || "0.0"}
          </h1>
          <p>Week Total: {opponentTeam.totalPoints || "0.0"}</p>
          <p>
            {selectedWeek < 0 ? "Completed" : 
            selectedWeek > 0 ? "Upcoming" : 
            selectedDay < getDayOfWeek() ? "Completed" :
            selectedDay > getDayOfWeek() ? "Upcoming" : "In Progress"}
          </p>
        </div>
      </div>

      {/* Day tabs */}
      <div className="Matchups_day-tabs">
        {daysOfWeek.map((day, index) => (
          <button
            key={day}
            className={`Matchups_day-tab ${
              selectedDay === index ? "Matchups_active-tab" : ""
            }`}
            onClick={() => handleDayClick(index)}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Courts */}
      <div className="Matchups_courts">
        {/* My team court */}
        <div className="Matchups_court-section">
          <h3>
            {myTeam.name} - {getSelectedDateString()}
          </h3>
          <div className="Matchups_court-container">
            <img
              src="/BasketballCourt.png"
              alt="Court"
              className="Matchups_court-image"
            />
            
            {myTeamLayout.map((slot, index) => (
              <div
                key={index}
                className={`Matchups_team-slot Matchups_slot-${slot.position.toLowerCase()}`}
                style={getPlayerStyle(slot.player)}
              >
                <span className="Matchups_slot-label">{slot.position}</span>
                <span className="Matchups_slot-player">
                  {slot.player ? (
                    <div>
                      <div>{slot.player.name}</div>
                      {/* <p>{slot.player.avgFanPts.toFixed(1)}</p> */}
                      {/* <p>Calculation of Points {calcTest(slot.player)}</p> */}
                      {/* <p> pointsForSNGGame(slot.player)}</p> */}
                      <p>{calcPointsToday(slot.player, getSelectedDateString(), "points")}</p>

                      <div>
                        {/* {getPlayerFantasyPoints(slot.player)} */}
                        {slot.player.isLive && <span style={{color: 'green', fontWeight: 'bold'}}> LIVE</span>}
                      </div>
                    </div>
                  ) : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Opponent team court */}
        <div className="Matchups_court-section">
          <h3>
            {opponentTeam.name} - {getSelectedDateString()}
          </h3>
          <div className="Matchups_court-container">
            <img
              src="/BasketballCourt.png"
              alt="Court"
              className="Matchups_court-image"
            />
            
            {opponentLayout.map((slot, index) => (
              <div
                key={index}
                className={`Matchups_team-slot Matchups_slot-${slot.position.toLowerCase()}`}
                style={getPlayerStyle(slot.player)}
              >
                <span className="Matchups_slot-label">{slot.position}</span>
                <span className="Matchups_slot-player">
                  {slot.player ? (
                    <div>
                      <div>{slot.player.name}</div>
                      <div>
                        {getPlayerFantasyPoints(slot.player)}
                        {slot.player.isLive && <span style={{color: 'green', fontWeight: 'bold'}}> LIVE</span>}
                      </div>
                    </div>
                  ) : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player comparison table */}
      <div className="Matchups_comparison-table">
        {/* The below line prints the DAY twice, change back if causing issues - 4/30 */}
        {/* <h3>Player Comparison for {daysOfWeek[selectedDay]} {getSelectedDateString()}</h3> */}
        <h3>Player Comparison for {getSelectedDateString()}</h3>
        <table>
          <thead>
            <tr>
              <th style={{width:"10%"}}>My Player</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>BLK</th>
              <th>ST</th>
              <th>TO</th>
              <th>Position</th>
              <th style={{width:"10%"}}>Opponent Player</th>
              <th>PTS</th>
              <th>REB</th>
              <th>AST</th>
              <th>BLK</th>
              <th>ST</th>
              <th>TO</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((item, index) => (
              <tr key={index}>
                {/* My player */}
                <td style={getPlayerStyle(item.myPlayer)}>
                  {item.myPlayer ? (
                    <>
                      {item.myPlayer.name}
                      {item.myPlayer.isLive && <span style={{color: 'green', fontWeight: 'bold'}}> (LIVE)</span>}
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
                    </>
                  ) : "N/A"}
                </td>
                {/* The "--" allows us to call the function even when the item.myPlayers do not exist yet */}
                <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer ? pointsForSNGGame(item.myPlayer, getSelectedDateString(), "points") : "--"}</td>
                <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer ? pointsForSNGGame(item.myPlayer, getSelectedDateString(), "rebounds") : "--"}</td>
                <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer ? pointsForSNGGame(item.myPlayer, getSelectedDateString(), "assists") : "--"}</td>
                <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer ? pointsForSNGGame(item.myPlayer, getSelectedDateString(), "blocks") : "--"}</td>
                <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer ? pointsForSNGGame(item.myPlayer, getSelectedDateString(), "steals") : "--"}</td>
                <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer ? pointsForSNGGame(item.myPlayer, getSelectedDateString(), "turnovers") : "--"}</td>

                {/* Position */}
                <td>{item.position}</td>

                {/* Opponent player */}
                <td style={getPlayerStyle(item.opponentPlayer)}>
                  {item.opponentPlayer ? (
                    <>
                      {item.opponentPlayer.name}
                      {item.opponentPlayer.isLive && <span style={{color: 'green', fontWeight: 'bold'}}> (LIVE)</span>}
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
                    </>
                  ) : "N/A"}
                </td>
                <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.pts?.toFixed(1) || "0.0"}</td>
                <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.reb?.toFixed(1) || "0.0"}</td>
                <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.ast?.toFixed(1) || "0.0"}</td>
                <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.blk?.toFixed(1) || "0.0"}</td>
                <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.st?.toFixed(1) || "0.0"}</td>
                <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.to?.toFixed(1) || "0.0"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Player stats modal */}
    {modalPlayer && (
      <PlayerStatsModal player={modalPlayer} onClose={() => setModalPlayer(null)} />
    )}
  </>
);
};

export default Matchups;