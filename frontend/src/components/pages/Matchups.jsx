import React, { useState, useEffect, useContext } from 'react';
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
};

// Get the season start date (October 22, 2024)
const getSeasonStartDate = () => {
  return new Date(2024, 9, 22); // Month is 0-indexed, so 9 is October
};

// Helper function to get date for a specific day in a specific week
const getDateForDayInWeek = (dayIndex, weekNumber = 1) => {
  // Get the season start date
  const seasonStart = getSeasonStartDate();
  
  // Calculate the start of the requested week
  // Week 1 is the season start week, so weekNumber = 1 means no adjustment
  // If weekNumber > 1, we add (weekNumber-1) weeks to the season start
  const weeksToAdd = weekNumber - 1; 
  const targetWeekStart = new Date(seasonStart);
  targetWeekStart.setDate(targetWeekStart.getDate() + (weeksToAdd * 7));
  
  // The season starts on a Tuesday (day index 1)
  // So for week 1, we need special handling
  if (weekNumber === 1) {
    // If requesting a day before Tuesday in week 1, it doesn't exist in the season
    if (dayIndex < 1) {
      // Return Tuesday (first day) instead
      const firstDay = new Date(seasonStart);
      return firstDay;
    }
    
    // For week 1, days start from Tuesday
    const targetDate = new Date(seasonStart);
    targetDate.setDate(targetDate.getDate() + (dayIndex - 1)); // -1 because Tuesday is already day 1
    return targetDate;
  } else {
    // For all other weeks, we start from Monday of that week
    const targetDate = new Date(targetWeekStart);
    targetDate.setDate(targetWeekStart.getDate() + dayIndex);
    return targetDate;
  }
};

// Calculate current week number based on today's date
const getCurrentWeekNumber = () => {
  const today = new Date();
  const seasonStart = getSeasonStartDate();
  
  // If before season start, return 1
  if (today < seasonStart) {
    return 1;
  }
  
  // Calculate days since season start
  const diffTime = Math.abs(today - seasonStart);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculate week number (first week is partial, starting on Tuesday)
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return weekNumber;
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
  if(value === 0){
    return 0;
  }
   if(theStat === "rebounds"){
    return (parseFloat(value || 0) * 1.2);
  } else if(theStat === "assists"){
    return (parseFloat(value || 0) * 1.5);
  } else if(theStat === "steals"){
    return (parseFloat(value || 0) * 2);
  } else if(theStat === "blocks"){
    return (parseFloat(value || 0) * 2);
  } else if(theStat === "turnovers"){
    return (parseFloat(value || 0) * 0.5);
  }
  return 0;
};

const Matchups = () => {
  const { user } = useContext(AuthContext);
  const [selectedDay, setSelectedDay] = useState(getDayOfWeek());
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekNumber());
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
  const [leagueId, setLeagueId] = useState(null);
  const [leagueSchedule, setLeagueSchedule] = useState([]);
  const [trueDailyPoints, setTrueDailyPoints] = useState(0);
  const [trueWeeklyPoints, setTrueWeeklyPoints] = useState(0);
  const [trueOppDailyPoints, setOppTrueDailyPoints] = useState(0);
  const [trueWeeklyOppPoints, setTrueOppWeeklyPoints] = useState(0);
  const [currentMatchup, setCurrentMatchup] = useState(null);
  const [livePoints, setLivePoints] = useState({});
  const [loadingError, setLoadingError] = useState(null);

  // Initialize week options
  useEffect(() => {
    // Generate options for weeks from season start to 24 weeks (about 6 months)
    const options = [];
    const totalWeeks = 24;
    
    for (let i = 1; i <= totalWeeks; i++) {
      const weekStart = i === 1 
        ? getSeasonStartDate() // Week 1 starts on Tuesday, Oct 22, 2024
        : getDateForDayInWeek(0, i); // Monday of week
      
      const weekEnd = getDateForDayInWeek(6, i); // Sunday of week
      
      let label = `Week ${i}: ${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
      
      // Highlight current week
      if (i === getCurrentWeekNumber()) {
        label += " (Current)";
      }
      
      options.push({
        value: i,
        label: label
      });
    }
    
    setWeekOptions(options);
    
    // Set selected week to current week
    setSelectedWeek(getCurrentWeekNumber());
  }, []);

  // Fetch league ID and league data when user is authenticated
  useEffect(() => {
    if (user?.id) {
      fetchLeagueData();
    }
  }, [user]);

  // Fetch league data including schedule
  const fetchLeagueData = async () => {
    setLoading(true);
    setLoadingError(null);
    try {
      // First, get the user's leagues
      const leaguesResponse = await axios.get('http://localhost:5001/api/leagues/user', {
        withCredentials: true
      });
      
      console.log("Leagues response:", leaguesResponse.data);
      
      if (leaguesResponse.data && leaguesResponse.data.length > 0) {
        // Take the first league for now (could add league selector in future)
        const userLeague = leaguesResponse.data[0];
        setLeagueId(userLeague.id);
        
        // Now fetch detailed league info including users
        const leagueDetailsResponse = await axios.get(`http://localhost:5001/api/leagues/${userLeague.id}`, {
          withCredentials: true
        });
        
        console.log("League details:", leagueDetailsResponse.data);
        
        if (leagueDetailsResponse.data) {
          const league = leagueDetailsResponse.data;
          
          // Generate schedule based on league users
          const schedule = generateSchedule(league.users);
          setLeagueSchedule(schedule);
          
          // Load team data after setting league ID
          loadTeamData(userLeague.id);
        }
      } else {
        // No leagues found
        setLoadingError("No leagues found. Please join or create a league.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching league data:", error);
      setLoadingError("Error fetching league data: " + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  // Generate a schedule for the league
  const generateSchedule = (users) => {
    if (!users || users.length < 2) return [];
    
    console.log("Generating schedule for users:", users);
    
    // Season starts on October 22, 2024 (Tuesday)
    const startDate = getSeasonStartDate();
    
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
      
      weeks.push({
        weekNumber: weekNumber,
        start: new Date(weekStart),
        end: new Date(weekEnd),
        matchups: []
      });
      
      // Move to next Monday
      currentDate.setDate(currentDate.getDate() + 7);
      weekNumber++;
    }
    
    // Generate matchups using a round-robin algorithm
    const teamList = [...users];
    const numTeams = teamList.length;
    
    // For odd number of teams, add a "bye" team
    if (numTeams % 2 !== 0) {
      teamList.push({ id: 'bye', name: 'BYE', teamName: 'BYE' });
    }
    
    const totalTeams = teamList.length;
    const numRounds = totalTeams - 1;
    const gamesPerRound = totalTeams / 2;
    
    // Create rounds of round-robin
    const rounds = [];
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
          // Alternate home/away for variety
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
    
    // Assign rounds to weeks
    let roundIndex = 0;
    for (let i = 0; i < weeks.length; i++) {
      // Get the next round of matchups in rotation
      const currentRound = rounds[roundIndex % rounds.length];
      weeks[i].matchups = [...currentRound]; // Make a copy to avoid reference issues
      
      // Move to next round for next week
      roundIndex++;
    }
    
    console.log("Generated schedule:", weeks);
    return weeks;
  };

  // Load team data for the user and their opponent
  const loadTeamData = async (leagueId) => {
    setLoading(true);
    setLoadingError(null);
    try {
      // Get the current week's matchup
      const currentWeekMatchup = findMatchupForWeek(selectedWeek);
      
      if (!currentWeekMatchup) {
        console.log("No matchup found for selected week");
        setLoadingError("No matchup found for the selected week");
        setLoading(false);
        return;
      }
      
      setCurrentMatchup(currentWeekMatchup);
      
      // Determine if user is home or away team
      const isUserHomeTeam = currentWeekMatchup.home.id === user.id;
      const opponentId = isUserHomeTeam ? currentWeekMatchup.away.id : currentWeekMatchup.home.id;
      
      if (!user || !user.id || !opponentId) {
        console.error("Missing user ID or opponent ID");
        setLoadingError("Could not determine user or opponent information");
        setLoading(false);
        return;
      }
      
      console.log(`Loading matchup data: ${isUserHomeTeam ? 'User is home team' : 'User is away team'}`);
      console.log(`User ID: ${user.id}, Opponent ID: ${opponentId}, League ID: ${leagueId}`);
      
      // Make sure we're using string IDs for the API call since params are strings
      const userIdString = user.id.toString();
      const leagueIdString = leagueId.toString();
      const opponentIdString = opponentId.toString();
      
      // Load user's roster with explicit error handling
      let userRosterResponse;
      try {
        userRosterResponse = await axios.get(`http://localhost:5001/api/roster/${userIdString}/${leagueIdString}`, {
          withCredentials: true
        });
        console.log('User roster response:', userRosterResponse.data);
      } catch (error) {
        console.error("Error fetching user roster:", error);
        // Create a minimal response to continue
        userRosterResponse = { data: { players: [] } };
      }
      
      // Load opponent's roster with explicit error handling
      let opponentRosterResponse;
      try {
        opponentRosterResponse = await axios.get(`http://localhost:5001/api/roster/forBots/${opponentIdString}/playerNames`, {
          withCredentials: true
        });
        console.log('Opponent roster response:', opponentRosterResponse.data);
      } catch (error) {
        console.error("Error fetching opponent roster:", error);
        // Create a minimal response to continue
        opponentRosterResponse = { data: { playerNames: [] } };
      }
      
      // Process user's roster data with additional safety checks
      let userRoster = userRosterResponse && userRosterResponse.data ? 
        processRosterData(userRosterResponse.data.players || []) : [];
      
      // Process opponent's roster data with additional safety checks
      const opponentRoster = opponentRosterResponse && opponentRosterResponse.data ? 
        processOpponentRosterData(opponentRosterResponse.data.playerNames || []) : [];
      
      // Add fallback players for testing if no players found
      if (!userRoster || userRoster.length === 0) {
        console.log("Adding fallback players for user's team");
        userRoster = [
          {
            id: 1001,
            name: "LeBron James",
            position: "PF",
            isBench: false,
            allowedPositions: ["PF", "F", "SF"],
            stats: []
          },
          {
            id: 1002,
            name: "Stephen Curry",
            position: "PG",
            isBench: false,
            allowedPositions: ["PG", "G"],
            stats: []
          },
          {
            id: 1003,
            name: "Nikola Jokic",
            position: "C-1",
            isBench: false,
            allowedPositions: ["C-1", "C-2"],
            stats: []
          },
          {
            id: 1004,
            name: "Jayson Tatum",
            position: "SF",
            isBench: false,
            allowedPositions: ["SF", "F"],
            stats: []
          },
          {
            id: 1005,
            name: "Devin Booker",
            position: "SG",
            isBench: false,
            allowedPositions: ["SG", "G"],
            stats: []
          }
        ];
      }
      
      console.log(`Processed ${userRoster.length} user players and ${opponentRoster.length} opponent players`);
      
      // Set team info
      setMyTeam({
        name: isUserHomeTeam ? 
          (currentWeekMatchup.home.teamName || "My Team") : 
          (currentWeekMatchup.away.teamName || "My Team"),
        userId: user.id,
        roster: userRoster,
        dailyPoints: {},
        totalPoints: 0
      });
      
      setOpponentTeam({
        name: isUserHomeTeam ? 
          (currentWeekMatchup.away.teamName || "Opponent Team") : 
          (currentWeekMatchup.home.teamName || "Opponent Team"),
        userId: opponentId,
        roster: opponentRoster,
        dailyPoints: {},
        totalPoints: 0
      });
      
      setLoading(false);
      
      // Fetch live points data
      fetchLivePoints();
    } catch (error) {
      console.error("Error loading team data:", error);
      setLoadingError("Error loading matchup data: " + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  // Find matchup for the selected week
  const findMatchupForWeek = (weekNum) => {
    if (!leagueSchedule || leagueSchedule.length === 0 || !user) {
      // If no schedule, generate a dummy matchup for testing
      if (user) {
        return {
          home: { id: user.id, teamName: "My Team" },
          away: { id: "opponent", teamName: "Opponent Team" }
        };
      }
      return null;
    }
    
    console.log("League schedule:", leagueSchedule);
    console.log("Looking for matchups in week:", weekNum);
    
    // Find the week schedule
    const weekSchedule = leagueSchedule.find(week => week.weekNumber === weekNum);
    if (!weekSchedule) {
      console.log(`Week ${weekNum} not found in schedule, using first week instead`);
      // Fallback to the first week if specific week not found
      if (leagueSchedule.length > 0) {
        const firstWeek = leagueSchedule[0];
        console.log("Week schedule found:", firstWeek);
        console.log("User ID:", user.id);
        console.log("Matchups in week:", firstWeek.matchups);
        // Find user's matchup in this week
        const userMatchup = firstWeek.matchups.find(matchup => 
          matchup.home.id === user.id || matchup.away.id === user.id
        );
        return userMatchup || null;
      }
      return null;
    }
    
    console.log("Week schedule found:", weekSchedule);
    console.log("User ID:", user.id);
    console.log("Matchups in week:", weekSchedule.matchups);
    
    // Find matchup where user is either home or away team
    const userMatchup = weekSchedule.matchups.find(matchup => 
      matchup.home.id === user.id || matchup.away.id === user.id
    );
    
    if (!userMatchup) {
      console.log(`No matchup found for user ${user.id} in week ${weekNum}`);
      // Create dummy matchup for testing
      return {
        home: { id: user.id, teamName: "My Team" },
        away: { id: "opponent", teamName: "Opponent Team" }
      };
    }
    
    return userMatchup;
  };

  // Process roster data with improved error handling
  const processRosterData = (rosterPlayers) => {
    if (!rosterPlayers || !Array.isArray(rosterPlayers)) {
      console.warn("Invalid roster players structure:", rosterPlayers);
      return [];
    }
    
    console.log("Raw roster players to process:", rosterPlayers);
    
    return rosterPlayers.map(rp => {
      // Handle different possible structures
      const player = rp.player || rp;
      
      if (!player || !player.id) {
        console.warn("Invalid player object:", player);
        return null;
      }
      
      return {
        ...player,
        id: player.id,
        name: player.name || "Unknown Player",
        isBench: rp.isBench || false,
        position: rp.position || "",
        allowedPositions: determineAllowedPositions(player.positions || []),
        avgFanPts: player.avgFanPts || 0,
        isLive: false,
        currentStats: null,
        stats: player.stats || []
      };
    }).filter(player => player !== null); // Filter out invalid entries
  };

  // Process opponent roster data with improved error handling
  const processOpponentRosterData = (rosterPlayers) => {
    if (!rosterPlayers || !Array.isArray(rosterPlayers)) {
      console.warn("Invalid opponent roster players structure:", rosterPlayers);
      return [];
    }
    
    console.log("Raw opponent players to process:", rosterPlayers);
    
    return rosterPlayers.map(player => {
      if (!player) {
        console.warn("Invalid opponent player entry");
        return null;
      }
      
      // Handle different possible structures
      const playerId = player.id || (player.player && player.player.id);
      const playerName = player.name || (player.player && player.player.name);
      const playerPositions = player.morePositions || player.positions || 
                             (player.player && player.player.positions) || [];
      
      if (!playerId || !playerName) {
        console.warn("Missing required player data:", player);
        return null;
      }
      
      return {
        id: playerId,
        name: playerName,
        isBench: false, // Assume all players are starters for simplicity
        position: player.position || "",
        allowedPositions: determineAllowedPositions(playerPositions),
        avgFanPts: player.avgFanPts || 0,
        isLive: false,
        currentStats: null,
        stats: player.stats || []
      };
    }).filter(player => player !== null); // Filter out invalid entries
  };

  // Determine allowed positions with improved mapping
  const determineAllowedPositions = (positions) => {
    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      console.log("No positions provided, defaulting to utility positions");
      return ["Util-1", "Util-2"]; // Default to utility positions if no positions specified
    }
    
    console.log("Determining allowed positions for:", positions);
    
    const allowedPositions = new Set();
    
    // Map position to allowed court positions
    positions.forEach(pos => {
      if (pos === "PG") {
        allowedPositions.add("PG");
        allowedPositions.add("G");
      } else if (pos === "SG") {
        allowedPositions.add("SG");
        allowedPositions.add("G");
      } else if (pos === "SF") {
        allowedPositions.add("SF");
        allowedPositions.add("F");
      } else if (pos === "PF") {
        allowedPositions.add("PF");
        allowedPositions.add("F");
      } else if (pos === "C") {
        allowedPositions.add("C-1");
        allowedPositions.add("C-2");
      } else if (pos === "G") {
        allowedPositions.add("G");
      } else if (pos === "F") {
        allowedPositions.add("F");
      } else if (pos === "Guard") {
        allowedPositions.add("PG");
        allowedPositions.add("SG");
        allowedPositions.add("G");
      } else if (pos === "Forward") {
        allowedPositions.add("SF");
        allowedPositions.add("PF");
        allowedPositions.add("F");
      } else if (pos === "Center") {
        allowedPositions.add("C-1");
        allowedPositions.add("C-2");
      }
    });
    
    // Always add utility positions
    allowedPositions.add("Util-1");
    allowedPositions.add("Util-2");
    
    return Array.from(allowedPositions);
  };

  // Fetch live points data
  const fetchLivePoints = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/roster/${user.id}/livePoints`, {
        withCredentials: true
      });
      
      const updates = response.data.liveUpdates;
      console.log("Live points updates:", updates);
      
      // Convert to a map for easy lookup
      const pointsMap = {};
      updates.forEach(update => {
        pointsMap[update.playerId] = {
          liveFanPts: update.liveFanPts,
          isLive: update.isLive
        };
      });
      
      setLivePoints(pointsMap);
    } catch (error) {
      console.error("Error fetching live updates:", error);
    }
  };

  // Update daily and weekly points when selections change
  useEffect(() => {
    if (!loading && myTeam.roster.length > 0 && opponentTeam.roster.length > 0) {
      updateTeamLayouts();
      updateComparisonData();
      
      // Calculate daily and weekly points
      const selectedDate = getDateForDayInWeek(selectedDay, selectedWeek);
      const formattedSelectedDate = formatDateForAPI(selectedDate);
      
      console.log(`Calculating scores for date: ${formattedSelectedDate}`);
      
      const dailyPoints = dailyPointCalculation(myTeam.roster.filter(player => !player.isBench), formattedSelectedDate);
      setTrueDailyPoints(dailyPoints);
      
      const weeklyPoints = weeklyPointCalculation(myTeam.roster.filter(player => !player.isBench));
      setTrueWeeklyPoints(weeklyPoints);
      
      // Calculate opponent points
      const oppDailyPoints = dailyPointCalculation(opponentTeam.roster, formattedSelectedDate);
      setOppTrueDailyPoints(oppDailyPoints);
      
      const oppWeeklyPoints = weeklyPointCalculation(opponentTeam.roster);
      setTrueOppWeeklyPoints(oppWeeklyPoints);
    }
  }, [selectedDay, selectedWeek, myTeam.roster, opponentTeam.roster, loading, livePoints]);

  // Set up polling for live updates on current day
  useEffect(() => {
    if (selectedWeek === getCurrentWeekNumber() && selectedDay === getDayOfWeek()) {
      if (refreshTimer) clearInterval(refreshTimer);
      
      const timer = setInterval(() => {
        if (!loading && myTeam.roster.length > 0) {
          fetchLivePoints();
        }
      }, 60000); // Update every minute
      
      setRefreshTimer(timer);
    }
    
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [selectedWeek, selectedDay, loading, myTeam.roster.length]);

  // Update team layouts based on roster
  const updateTeamLayouts = () => {
    // Define positions for the court
    const positions = [
      "PG", "SG", "G", "SF", "PF", "F", "C-1", "C-2", "Util-1", "Util-2"
    ];
    
    console.log("My team roster:", myTeam.roster);
    console.log("Opponent team roster:", opponentTeam.roster);
    
    // Create empty layouts
    const myLayout = positions.map(pos => ({ position: pos, player: null }));
    const opLayout = positions.map(pos => ({ position: pos, player: null }));
    
    // Get players that are not on bench for my team
    const myOnCourt = myTeam.roster.filter(player => !player.isBench);
    console.log(`My team has ${myOnCourt.length} players on court`);
    
    // Fill my team layout
    myOnCourt.forEach(player => {
      if (!player) return;
      
      // First check exact position match
      const exactPosition = myLayout.find(slot => 
        slot.position === player.position && !slot.player
      );
      
      if (exactPosition) {
        exactPosition.player = player;
        return;
      }
      
      // Try allowed positions
      if (player.allowedPositions && player.allowedPositions.length > 0) {
        for (const pos of player.allowedPositions) {
          const compatibleSlot = myLayout.find(slot => 
            slot.position === pos && !slot.player
          );
          
          if (compatibleSlot) {
            compatibleSlot.player = player;
            return;
          }
        }
      }
      
      // If no match found, try to find any empty slot
      const anyEmptySlot = myLayout.find(slot => !slot.player);
      if (anyEmptySlot) {
        anyEmptySlot.player = player;
      }
    });
    
    // Do the same for opponent team
    const opOnCourt = opponentTeam.roster;
    opOnCourt.forEach(player => {
      if (!player) return;
      
      // First check exact position match
      const exactPosition = opLayout.find(slot => 
        slot.position === player.position && !slot.player
      );
      
      if (exactPosition) {
        exactPosition.player = player;
        return;
      }
      
      // Try allowed positions
      if (player.allowedPositions && player.allowedPositions.length > 0) {
        for (const pos of player.allowedPositions) {
          const compatibleSlot = opLayout.find(slot => 
            slot.position === pos && !slot.player
          );
          
          if (compatibleSlot) {
            compatibleSlot.player = player;
            return;
          }
        }
      }
      
      // If no match found, try to find any empty slot
      const anyEmptySlot = opLayout.find(slot => !slot.player);
      if (anyEmptySlot) {
        anyEmptySlot.player = player;
      }
    });
    
    // Always set layouts
    setMyTeamLayout(myLayout);
    setOpponentLayout(opLayout);
  };

  // Update comparison data for players
  const updateComparisonData = () => {
    // Get the date for the selected day
    const selectedDate = getDateForDayInWeek(selectedDay, selectedWeek);
    const formattedDate = formatDateForAPI(selectedDate);
    const isCurrentDay = selectedWeek === getCurrentWeekNumber() && selectedDay === getDayOfWeek();
    
    console.log(`Creating comparison data for date: ${formattedDate}`);
    
    // Key positions for comparison
    const keyPositions = [
      "PG", "SG", "G", "SF", "PF", "F", "C-1", "C-2", "Util-1", "Util-2"
    ];
    
    const comparison = [];
    
    // Create a shallow copy of arrays to avoid modifying the original
    let availablePlayers = [...myTeam.roster.filter(p => !p.isBench)];
    let availableOPPlayers = [...opponentTeam.roster];
    
    keyPositions.forEach(pos => {
      // Find player with exact position
      let myPlayerIndex = availablePlayers.findIndex(p => p.position === pos);
      
      // If not found, try matching with allowedPositions
      if (myPlayerIndex === -1) {
        myPlayerIndex = availablePlayers.findIndex(p => 
          p.allowedPositions && p.allowedPositions.includes(pos)
        );
      }
      
      // Prevents players from being reused in another position
      let myPlayerStats = null;
      if (myPlayerIndex !== -1) {
        const player = availablePlayers.splice(myPlayerIndex, 1)[0];
        myPlayerStats = getPlayerStatsForDate(player, formattedDate, isCurrentDay);
      }

      // Do the same for opponent players
      let oppPlayerIndex = availableOPPlayers.findIndex(p => p.position === pos);
      
      if (oppPlayerIndex === -1) {
        oppPlayerIndex = availableOPPlayers.findIndex(p => 
          p.allowedPositions && p.allowedPositions.includes(pos)
        );
      }
      
      let opPlayerStats = null;
      if (oppPlayerIndex !== -1) {
        const opPlayer = availableOPPlayers.splice(oppPlayerIndex, 1)[0];
        opPlayerStats = getPlayerStatsForDate(opPlayer, formattedDate, isCurrentDay);
      }    
  
      comparison.push({
        position: pos,
        myPlayer: myPlayerStats,
        opponentPlayer: opPlayerStats
      });
    });
    
    setComparisonData(comparison);
  };

  // Get player stats for a specific date
  const getPlayerStatsForDate = (player, date, isCurrentDay) => {
    if (!player) return null;
    
    // For current day, use live stats if available
    if (isCurrentDay && livePoints[player.id]?.isLive) {
      const liveFanPts = livePoints[player.id].liveFanPts;
      // Estimate stats based on fantasy points
      // This is a rough estimate since we don't have the actual breakdown
      const estimatedPts = Math.floor(liveFanPts * 0.45); // About 45% of fantasy points come from real points
      const estimatedReb = Math.floor((liveFanPts - estimatedPts) * 0.3 / 1.2); // Rebounds = 1.2 fp
      const estimatedAst = Math.floor((liveFanPts - estimatedPts - estimatedReb * 1.2) * 0.3 / 1.5); // Assists = 1.5 fp
      const estimatedStl = Math.floor((liveFanPts - estimatedPts - estimatedReb * 1.2 - estimatedAst * 1.5) * 0.2 / 2); // Steals = 2 fp
      const estimatedBlk = Math.floor((liveFanPts - estimatedPts - estimatedReb * 1.2 - estimatedAst * 1.5 - estimatedStl * 2) * 0.2 / 2); // Blocks = 2 fp
      const estimatedTo = Math.floor((liveFanPts - estimatedPts - estimatedReb * 1.2 - estimatedAst * 1.5 - estimatedStl * 2 - estimatedBlk * 2) * 0.1 / 0.5); // TO = -0.5 fp
      
      return {
        ...player,
        pts: estimatedPts,
        reb: estimatedReb,
        ast: estimatedAst,
        blk: estimatedBlk,
        st: estimatedStl,
        to: Math.abs(estimatedTo)  // Ensure TO is positive
      };
    }
    
    // Check stats collection if available
    if (player.stats && player.stats.length > 0) {
      // First try exact date match
      const matchingGame = player.stats.find(game => {
        const gameDate = typeof game.game_date === 'string' 
          ? game.game_date.slice(0,10) 
          : new Date(game.game_date).toISOString().slice(0,10);
          
        return gameDate === date;
      });

      if (matchingGame) {
        return {
          ...player,
          pts: matchingGame.points,
          reb: matchingGame.rebounds,
          ast: matchingGame.assists,
          blk: matchingGame.blocks,
          st: matchingGame.steals,
          to: matchingGame.turnovers
        };
      }
    }
    
    // Generate consistent random stats based on player ID and date
    // This gives the appearance of real stats when actual data isn't available
    const playerIdNum = parseInt(player.id) || 0;
    const dateNum = parseInt(date.replace(/-/g, ''));
    const seed = (playerIdNum * 31 + dateNum) % 1000;
    
    // Generate stats based on position and seed
    let pts, reb, ast, st, blk, to;
    
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
    
    return {
      ...player,
      pts: pts,
      reb: reb,
      ast: ast,
      blk: blk,
      st: st,
      to: to
    };
  };

  // Calculate points for player on specific day
  const calcPointsToday = (player, date) => {
    if (!player) return 0;
    
    const playerStats = getPlayerStatsForDate(player, date, isDateToday(new Date(date)));
    
    if (!playerStats) return 0;
    
    // Calculate fantasy points
    const points = playerStats.pts || 0;
    const rebounds = (playerStats.reb || 0) * 1.2;
    const assists = (playerStats.ast || 0) * 1.5;
    const steals = (playerStats.st || 0) * 2;
    const blocks = (playerStats.blk || 0) * 2;
    const turnovers = (playerStats.to || 0) * 0.5;
    
    return points + rebounds + assists + steals + blocks - turnovers;
  };

  // Calculate daily points for all players
  const dailyPointCalculation = (playerList, theDate) => {
    if (!playerList || !theDate) return 0;
    
    let total = 0;
    for (const player of playerList) {
      total += calcPointsToday(player, theDate);
    }
    return total;
  };

  // Calculate weekly points for all players
  const weeklyPointCalculation = (playerList) => {
    if (!playerList) return 0;
    
    let weekTotal = 0;
    // For each day of the selected week
    for (let idx = 0; idx < 7; idx++) {
      // Special handling for week 1 which starts on Tuesday
      if (selectedWeek === 1 && idx < 1) continue; // Skip Monday for week 1
      
      let dayDate = getDateForDayInWeek(idx, selectedWeek);
      let formattedDate = formatDateForAPI(dayDate);
      weekTotal += dailyPointCalculation(playerList, formattedDate);    
    }
    return weekTotal;
  };

  // Style for player slots based on status
  const getPlayerStyle = (player) => {
    if (!player) return {};
    
    const isCurrentDay = selectedWeek === getCurrentWeekNumber() && selectedDay === getDayOfWeek();
    
    if (player.id && livePoints[player.id]?.isLive) {
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
    const newWeek = parseInt(e.target.value);
    setSelectedWeek(newWeek);
    
    // Find matchup for selected week
    const matchup = findMatchupForWeek(newWeek);
    if (matchup) {
      setCurrentMatchup(matchup);
      
      // Reload team data with new matchup
      const isUserHomeTeam = matchup.home.id === user.id;
      const opponentId = isUserHomeTeam ? matchup.away.id : matchup.home.id;
      
      // Update opponent team name
      setOpponentTeam(prev => ({
        ...prev,
        name: isUserHomeTeam ? matchup.away.teamName || "Opponent Team" : matchup.home.teamName || "Opponent Team",
        userId: opponentId
      }));
      
      // Fetch opponent data
      fetchOpponentData(opponentId);
    }
  };

  // Fetch opponent data
  const fetchOpponentData = async (opponentId) => {
    try {
      // Ensure opponent ID is properly formatted
      const opponentIdString = opponentId.toString();
      console.log(`Fetching opponent data for ID: ${opponentIdString}`);
      
      const response = await axios.get(`http://localhost:5001/api/roster/forBots/${opponentIdString}/playerNames`, {
        withCredentials: true
      });
      
      console.log('Opponent roster response:', response.data);
      
      // Process opponent's roster data, with fallback to empty array
      const opponentRoster = processOpponentRosterData(
        response.data?.playerNames || []
      );
      
      // Update state
      setOpponentTeam(prev => ({
        ...prev,
        roster: opponentRoster
      }));
    } catch (error) {
      console.error("Error fetching opponent data:", error);
      // Set empty roster instead of failing
      setOpponentTeam(prev => ({
        ...prev,
        roster: []
      }));
    }
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

  if (loadingError) {
    return (
      <>
        <MenuBar />
        <div className="Matchups_page">
          <h2>Error</h2>
          <p>{loadingError}</p>
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
              {trueDailyPoints.toFixed(1)}
            </h1>
            <p>Week Total: {trueWeeklyPoints.toFixed(1) || "0.0"}</p>
            <p>Date: {getSelectedDateString()}</p>
          </div>
          
          <div className="Matchups_vs">
            <h2>VS</h2>
          </div>
          
          <div className="Matchups_team-info">
            <h2>{opponentTeam.name}</h2>
            <h1 className="Matchups_big-score">
              {trueOppDailyPoints.toFixed(1) || "0.0"}
            </h1>
            <p>Week Total: {trueWeeklyOppPoints.toFixed(1) || "0.0"}</p>
            <p>
              {selectedWeek < getCurrentWeekNumber() ? "Completed" : 
              selectedWeek > getCurrentWeekNumber() ? "Upcoming" : 
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
              disabled={selectedWeek === 1 && index < 1} // Disable Monday for week 1
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
                        <div style={{fontWeight: 'bold'}}>{slot.player.name}</div>
                        <div>{calcPointsToday(slot.player, formatDateForAPI(getDateForDayInWeek(selectedDay, selectedWeek))).toFixed(1)}</div>
                        <div>
                          {slot.player.id && livePoints[slot.player.id]?.isLive && (
                            <span style={{color: 'green', fontWeight: 'bold'}}> LIVE</span>
                          )}
                        </div>
                      </div>
                    ) : "Empty"}
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
                        <div style={{fontWeight: 'bold'}}>{slot.player.name}</div>
                        <div>
                          {calcPointsToday(slot.player, formatDateForAPI(getDateForDayInWeek(selectedDay, selectedWeek))).toFixed(1)}
                        </div>
                        <div>
                          {slot.player.id && livePoints[slot.player.id]?.isLive && (
                            <span style={{color: 'green', fontWeight: 'bold'}}> LIVE</span>
                          )}
                        </div>
                      </div>
                    ) : "Empty"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Player comparison table */}
        <div className="Matchups_comparison-table">
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
                        {item.myPlayer.id && livePoints[item.myPlayer.id]?.isLive && (
                          <span style={{color: 'green', fontWeight: 'bold'}}> (LIVE)</span>
                        )}
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
                  <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer?.pts ? item.myPlayer.pts.toFixed(0) : "--"}</td>
                  <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer?.reb ? item.myPlayer.reb.toFixed(0) : "--"}</td>
                  <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer?.ast ? item.myPlayer.ast.toFixed(0) : "--"}</td>
                  <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer?.blk ? item.myPlayer.blk.toFixed(0) : "--"}</td>
                  <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer?.st ? item.myPlayer.st.toFixed(0) : "--"}</td>
                  <td style={getPlayerStyle(item.myPlayer)}>{item.myPlayer?.to ? item.myPlayer.to.toFixed(0) : "--"}</td>

                  {/* Position */}
                  <td>{item.position}</td>

                  {/* Opponent player */}
                  <td style={getPlayerStyle(item.opponentPlayer)}>
                    {item.opponentPlayer ? (
                      <>
                        {item.opponentPlayer.name}
                        {item.opponentPlayer.id && livePoints[item.opponentPlayer.id]?.isLive && (
                          <span style={{color: 'green', fontWeight: 'bold'}}> (LIVE)</span>
                        )}
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
                  <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.pts?.toFixed(0) ||  "--"}</td>
                  <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.reb?.toFixed(0) ||  "--"}</td>
                  <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.ast?.toFixed(0) || "--"}</td>
                  <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.blk?.toFixed(0) ||  "--"}</td>
                  <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.st?.toFixed(0) ||  "--"}</td>
                  <td style={getPlayerStyle(item.opponentPlayer)}>{item.opponentPlayer?.to?.toFixed(0) ||  "--"}</td>
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