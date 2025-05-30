import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import MenuBar from '../MenuBar';
import axios from 'axios';
import io from 'socket.io-client';
import './DraftBoard.css';

const DraftBoard = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [league, setLeague] = useState(null);
  const [draftState, setDraftState] = useState({
    status: 'not_started', // not_started, in_progress, completed
    currentRound: 0,
    currentPick: 0,
    currentTeam: null,
    pickTimeRemaining: 0,
    draftOrder: [],
    picks: []
  });
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [currentUserTurn, setCurrentUserTurn] = useState(false);
  const [queue, setQueue] = useState([]);
  const [teamRosters, setTeamRosters] = useState({});
  const [teamNames, setTeamNames] = useState({});
  const [highlightedPlayer, setHighlightedPlayer] = useState(null);
  const [recentPick, setRecentPick] = useState(null);
  const [pickingInProgress, setPickingInProgress] = useState(false);
  const [pickingTeamId, setPickingTeamId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(true); // Default to true to avoid initial "reconnecting"
  const [lastPickedPlayerId, setLastPickedPlayerId] = useState(null);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState(null);
  const [teamData, setTeamData] = useState({});
  const [showReconnectMessage, setShowReconnectMessage] = useState(false);
  const [botPickInProgress, setBotPickInProgress] = useState(false);
  // Add state for debouncing updates
  const [isUpdating, setIsUpdating] = useState(false);
  const [userChangedTeam, setUserChangedTeam] = useState(false);
  
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const picksEndRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const processingTimeoutRef = useRef(null);
  const lastPickTimeRef = useRef(null);
  const previousTeamIdRef = useRef(null);
  const connectionAttempts = useRef(0);
  const botPickQueueRef = useRef([]);
  const updateTimeoutRef = useRef(null);

  // Load initial data and set up team names
  useEffect(() => {
    const initializeData = async () => {
      await loadDraftData();
      await fetchAllTeamNames();
    };
    
    initializeData();
    
    // Set up a periodic refresh to ensure data stays current
    const refreshInterval = setInterval(() => {
      if (!socketConnected) {
        console.log("Socket disconnected, fetching data via API...");
        loadDraftData(false); // Silent refresh
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, [leagueId, socketConnected]);

  // Connect to WebSocket
  useEffect(() => {
    // Function to establish socket connection
    const connectSocket = () => {
      console.log("Attempting to connect to WebSocket...");
      // Close any existing socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Create new socket connection with better configuration
      socketRef.current = io('http://localhost:5002', {
        reconnection: true,
        reconnectionAttempts: 30,         // Increase from 10 to 30
        reconnectionDelay: 2000,          // Increase from 1000 to 2000
        reconnectionDelayMax: 10000,      // Increase from 5000 to 10000
        timeout: 30000,                   // Increase from 20000 to 30000
        forceNew: true,                   // Add this to create fresh connection
        transports: ['websocket'],        // Prefer WebSocket transport
      });

      socketRef.current.on('connect', async () => {
        console.log('✅ Connected to WebSocket');
        connectionAttempts.current = 0;
        setSocketConnected(true);
        
        // Join the draft room for this league
        socketRef.current.emit('join-draft', { leagueId });
        
        // Clear any reconnect timer
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        
        // Immediately fetch all team names to ensure we have them
        await fetchAllTeamNames();
      });

      // Modify disconnect handling to reduce flickering
      socketRef.current.on('disconnect', () => {
        console.log('❌ Disconnected from WebSocket');
        connectionAttempts.current += 1;
        
        // Only show reconnecting after 3 failed attempts to avoid quick flashes
        if (connectionAttempts.current > 3) {
          setSocketConnected(false);
        }
        
        // Set up reconnect timer with longer delay
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            console.log("Attempting to reconnect...");
            connectSocket();
          }, 3000); // Increase from 2000 to 3000 for faster transitions
        }
      });

      // Improve connect_error handling
      socketRef.current.on('connect_error', (err) => {
        console.error('WebSocket connection error:', err);
        connectionAttempts.current += 1;
        
        // Only show reconnecting after 3 failed attempts
        if (connectionAttempts.current > 3) {
          setSocketConnected(false);
        }
      });

      // Add reconnecting event handler to suppress message during normal reconnect
      socketRef.current.on('reconnecting', (attemptNumber) => {
        console.log(`WebSocket reconnecting, attempt ${attemptNumber}`);
        // Don't show reconnecting message for first few reconnection attempts
        if (attemptNumber <= 2) {
          setSocketConnected(true);
        }
      });

      // Add reconnect event handler to clear warning immediately
      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log(`WebSocket reconnected on attempt ${attemptNumber}`);
        setSocketConnected(true);
        connectionAttempts.current = 0;
      });

      // Draft event handlers with debouncing
      socketRef.current.on('draft-update', (draftData) => {
        // Only process updates if we're not already updating
        if (!isUpdating) {
          setIsUpdating(true);
          
          // Set a timeout to reset the updating flag
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          
          updateTimeoutRef.current = setTimeout(() => {
            setIsUpdating(false);
          }, 500); // Prevent updates for 500ms
          
          console.log('📊 Draft update received:', draftData);
          // Store the previous team ID before updating
          previousTeamIdRef.current = draftState.currentTeam?.userId;
          
          // Ensure we have team names for all teams in the draft order
          if (draftData.draftOrder && draftData.draftOrder.length > 0) {
            populateTeamNames(draftData.draftOrder);
            
            // Use setTimeout to ensure team names update is processed
            setTimeout(() => {
              // Ensure currentTeam has a complete teamName
              if (draftData.currentTeam && draftData.currentTeam.userId) {
                const currentUserId = draftData.currentTeam.userId;
                const currentTeamName = teamNames[currentUserId] || 
                                       (typeof draftData.currentTeam === 'object' ? 
                                        draftData.currentTeam.teamName : null) || 
                                        `Team ${currentUserId}`;
                
                console.log(`Setting current team name to: ${currentTeamName} for user ID ${currentUserId}`);
                
                // Update draft state with correct team name
                setDraftState(prevState => ({
                  ...prevState,
                  ...draftData,
                  // Ensure we keep existing picks if they're not in the update
                  picks: draftData.picks || prevState.picks,
                  currentTeam: {
                    ...draftData.currentTeam,
                    userId: currentUserId,
                    teamName: currentTeamName
                  }
                }));
              } else {
                // If no current team data, just update state
                setDraftState(prevState => ({
                  ...prevState,
                  ...draftData,
                  picks: draftData.picks || prevState.picks
                }));
              }
            }, 100);
          } else {
            // If no draft order, just update state
            setDraftState(prevState => ({
              ...prevState,
              ...draftData,
              picks: draftData.picks || prevState.picks
            }));
          }

          // If it's a new team's turn, automatically reset picking state
          if (draftData.currentTeam?.userId !== previousTeamIdRef.current) {
            console.log(`Team changed from ${previousTeamIdRef.current} to ${draftData.currentTeam?.userId}`);
            setPickingInProgress(false);
            setPickingTeamId(null);
            
            // Check if it's a bot's turn
            if (draftData.status === 'in_progress' && draftData.currentTeam?.userId) {
              const currentTeamId = draftData.currentTeam.userId;
              
              // Check if this team is a bot
              const isCurrentTeamBot = league?.users?.some(u => 
                u.id === parseInt(currentTeamId) && 
                u.email && 
                u.email.endsWith('@bot.com')
              );
              
              if (isCurrentTeamBot) {
                console.log(`Bot ${currentTeamId}'s turn - adding to pick queue`);
                
                // Add to the bot pick queue rather than immediately executing
                botPickQueueRef.current.push({
                  leagueId: leagueId,
                  draftId: draftData.id || draft?.id
                });
                
                // Process the queue
                processBotPickQueue();
              }
            }
          }

          // Check if it's the current user's turn
          const isUserTurn = user && draftData.currentTeam?.userId === user.id;
          console.log(`Is user's turn? ${isUserTurn}`);
          setCurrentUserTurn(isUserTurn);
          
          // Reset picking state if it's the user's turn again
          if (isUserTurn && pickingInProgress && pickingTeamId !== user.id) {
            console.log("Resetting picking state for user's turn");
            setPickingInProgress(false);
            setPickingTeamId(null);
          }

          // Update team rosters based on picks
          updateTeamRostersFromPicks(draftData.picks || []);
        }
      });

      socketRef.current.on('pick-in-progress', (data) => {
        // Only process if not already updating
        if (!isUpdating) {
          setIsUpdating(true);
          
          // Set timeout to reset updating flag
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          
          updateTimeoutRef.current = setTimeout(() => {
            setIsUpdating(false);
          }, 500);
          
          console.log('🔄 Pick in progress event received:', data);
          
          // Only set picking in progress if it's not already set
          // or if it's for a different team
          if (!pickingInProgress || pickingTeamId !== data.teamId) {
            setPickingInProgress(true);
            setPickingTeamId(data.teamId);
            
            // Auto-reset after 3 seconds as a fallback (reduced from 10 seconds)
            if (processingTimeoutRef.current) {
              clearTimeout(processingTimeoutRef.current);
            }
            
            processingTimeoutRef.current = setTimeout(() => {
              console.log("Auto-resetting picking state after timeout");
              setPickingInProgress(false);
              setPickingTeamId(null);
            }, 3000); // Reduced from 10000 to 3000 for faster transitions
          }
        }
      });

      socketRef.current.on('pick-made', (pickData) => {
        // Only process if not already updating
        if (!isUpdating) {
          setIsUpdating(true);
          
          // Set timeout to reset updating flag
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          
          updateTimeoutRef.current = setTimeout(() => {
            setIsUpdating(false);
          }, 500);
          
          console.log('✅ Pick made event received:', pickData);
          lastPickTimeRef.current = new Date();
          
          // Clear any processing timeout immediately
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
          
          // Store the last picked player ID
          setLastPickedPlayerId(pickData.playerId);
          
          // Reset picking state immediately
          setPickingInProgress(false);
          setPickingTeamId(null);
          
          // Show animation/highlight for the recent pick
          setRecentPick(pickData);
          
          // Clear the highlight after 2 seconds (reduced from 3)
          setTimeout(() => {
            setRecentPick(null);
          }, 2000);
          
          // Update the draft picks - make sure not to add duplicates
          setDraftState(prev => {
            // Check if this pick already exists
            const pickExists = prev.picks.some(p => 
              p.pickNumber === pickData.pickNumber
            );
            
            if (pickExists) {
              return prev; // No update needed
            }
            
            // Add the new pick
            const updatedPicks = [...prev.picks, pickData];
            
            // Sort by pick number for consistency
            updatedPicks.sort((a, b) => a.pickNumber - b.pickNumber);
            
            return {
              ...prev,
              picks: updatedPicks
            };
          });

          // Update team rosters with the new pick
          updateTeamRosterWithPick(pickData);
          
          // Remove player from queue if present
          setQueue(prev => prev.filter(player => player.id !== pickData.playerId));
          
          // Scroll to the latest pick
          setTimeout(() => {
            if (picksEndRef.current) {
              picksEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
          
          // Handle bot pick queue for sequential picks
          // Remove current bot pick from queue
          botPickQueueRef.current.shift();
          setBotPickInProgress(false);
          
          // Process next bot in queue after a short delay
          setTimeout(() => {
            processBotPickQueue();
          }, 1000);
        }
      });

      socketRef.current.on('draft-started', async (data) => {
        console.log('🚀 Draft started event received', data);
        
        // First fetch complete league and draft data to ensure we have team names
        try {
          // Get the complete league data with all users
          const leagueResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
            withCredentials: true
          });
          setLeague(leagueResponse.data);
          
          // Get fresh draft data immediately after start
          const draftResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}/draft`, {
            withCredentials: true
          });
          
          // Process the draft order - ensure team names are mapped
          if (data && data.draftOrder && data.draftOrder.length > 0) {
            // Map team names more explicitly
            const names = {};
            data.draftOrder.forEach((team, idx) => {
              let userId;
              if (typeof team === 'object' && team.userId) {
                userId = team.userId;
                names[userId] = team.teamName || `Team ${userId}`;
              } else {
                userId = team;
                // Find this user in the league data
                const user = leagueResponse.data.users.find(u => u.id === parseInt(userId));
                if (user) {
                  names[userId] = user.teamName || `Team ${user.name}`;
                } else {
                  names[userId] = `Team ${userId}`;
                }
              }
            });
            
            // Update team names state
            setTeamNames(prev => ({...prev, ...names}));
            
            // Get the first team in draft order
            const firstTeamId = typeof data.draftOrder[0] === 'object' ? 
              data.draftOrder[0].userId : 
              data.draftOrder[0];
            
            const firstTeamName = names[firstTeamId] || `Team ${firstTeamId}`;
            
            console.log(`First team to draft: ${firstTeamName} (ID: ${firstTeamId})`);
            
            // Update draft state with complete information
            setDraftState(prev => ({
              ...prev,
              status: 'in_progress',
              draftOrder: data.draftOrder,
              currentRound: 1,
              currentPick: 1,
              // Ensure we have currentTeam set properly from the start
              currentTeam: {
                userId: firstTeamId,
                teamName: firstTeamName
              }
            }));
          }
        } catch (error) {
          console.error("Error fetching draft data after start:", error);
        }
        
        // Reload all draft data
        loadDraftData();
      });

      socketRef.current.on('draft-completed', () => {
        console.log('🏆 Draft completed event received');
        setDraftState(prev => ({ ...prev, status: 'completed' }));
        
        // Show completion message
        alert("Draft completed!");
      });
    };

    // Initialize connection
    connectSocket();

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [leagueId, user]);

  // Add this useEffect to add a delay before showing the reconnect message
  useEffect(() => {
    let timer;
    if (!socketConnected) {
      // Only show the reconnect message after 5 seconds of being disconnected
      timer = setTimeout(() => {
        setShowReconnectMessage(true);
      }, 5000);
    } else {
      setShowReconnectMessage(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [socketConnected]);

  // Update timer effect
  useEffect(() => {
    if (draftState.status === 'in_progress' && draftState.pickTimeRemaining > 0) {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Set up new timer
      timerRef.current = setInterval(() => {
        setDraftState(prev => {
          const newTimeRemaining = Math.max(0, prev.pickTimeRemaining - 1);
          
          // When timer hits 0, we need to trigger the timeout pick
          // But we can't do it inside setState, so we'll use a separate effect
          if (newTimeRemaining === 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
          
          return {
            ...prev,
            pickTimeRemaining: newTimeRemaining
          };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [draftState.status, draftState.currentRound, draftState.currentPick]); // Changed dependencies

  // Separate effect to handle timeout when timer reaches 0
  useEffect(() => {
    if (draftState.pickTimeRemaining === 0 && 
        draftState.status === 'in_progress' && 
        currentUserTurn && 
        !pickingInProgress) {
      console.log("Timer reached 0, handling timeout pick");
      handleTimeoutPick();
    }
  }, [draftState.pickTimeRemaining, draftState.status, currentUserTurn]);

  // Effect to detect when it becomes the user's turn
  useEffect(() => {
    if (currentUserTurn && !pickingInProgress) {
      console.log("It's now the user's turn and not picking in progress");
      
      // Reset picking state explicitly when it becomes the user's turn
      setPickingInProgress(false);
      setPickingTeamId(null);
    }
  }, [currentUserTurn, draftState.currentTeam]);

  // Filter players based on search and filters
  useEffect(() => {
    if (!allPlayers.length) return;
    
    let filtered = [...allPlayers];
    
    // Filter out already drafted players
    const draftedIds = draftState.picks.map(pick => pick.playerId);
    filtered = filtered.filter(player => !draftedIds.includes(player.id));
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(player =>
        player.name.toLowerCase().includes(term)
      );
    }
    
    // Apply team filter
    if (selectedTeam) {
      filtered = filtered.filter(player => player.team === selectedTeam);
    }
    
    // Apply position filter
    if (selectedPosition) {
      filtered = filtered.filter(player =>
        player.positions && player.positions.includes(selectedPosition)
      );
    }
    
    setFilteredPlayers(filtered);
  }, [allPlayers, searchTerm, selectedTeam, selectedPosition, draftState.picks]);

  // Update team rosters when picks change
  useEffect(() => {
    if (allPlayers.length && draftState.picks.length) {
      updateTeamRostersFromPicks(draftState.picks);
    }
  }, [draftState.picks, allPlayers]);

  // Scroll to bottom of picks list when new picks are added
  useEffect(() => {
    if (picksEndRef.current) {
      picksEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [draftState.picks.length]);

  // Initialize selected roster team
  useEffect(() => {
    if (user && !selectedRosterTeam && !userChangedTeam) {
      setSelectedRosterTeam(user.id.toString());
    }
  }, [user, userChangedTeam]);
  
  // Effect to reset picking state if it's been too long
  useEffect(() => {
    if (pickingInProgress && lastPickTimeRef.current) {
      const now = new Date();
      const timeSinceLastPick = now - lastPickTimeRef.current;
      
      // If it's been more than 5 seconds and we're still "processing" (reduced from 15)
      if (timeSinceLastPick > 5000) {
        console.log("Resetting stuck picking state after timeout");
        setPickingInProgress(false);
        setPickingTeamId(null);
      }
    }
  }, [pickingInProgress, draftState]);

  // Process bot pick queue
  const processBotPickQueue = () => {
    if (botPickQueueRef.current.length === 0 || botPickInProgress) return;
    
    setBotPickInProgress(true);
    
    const { leagueId, draftId } = botPickQueueRef.current[0];
    
    // Show the bot as "picking" for a more natural flow
    const currentBot = draftState.currentTeam?.userId;
    if (currentBot) {
      setPickingInProgress(true);
      setPickingTeamId(currentBot);
      
      // Wait a random time (2-4 seconds) before actually making the pick
      // This simulates the bot "thinking" about their pick
      const thinkTime = Math.floor(Math.random() * 2000) + 2000; // 2-4 seconds
      
      setTimeout(() => {
        // Make the actual API call
        axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/autopick`, {}, {
          withCredentials: true
        }).catch(error => {
          console.error("Error in bot auto-pick:", error);
          // Reset states if there was an error
          setPickingInProgress(false);
          setPickingTeamId(null);
          setBotPickInProgress(false);
        });
      }, thinkTime);
    }
  };

  // Function to update team roster data from all picks
  const updateTeamRostersFromPicks = (picks) => {
    if (!picks || picks.length === 0 || !allPlayers || allPlayers.length === 0) return;
    
    // Group the picks by team
    const teamPicks = {};
    picks.forEach(pick => {
      if (!teamPicks[pick.teamId]) {
        teamPicks[pick.teamId] = [];
      }
      
      // Find player details
      const player = allPlayers.find(p => p.id === pick.playerId);
      if (player) {
        teamPicks[pick.teamId].push({
          ...player,
          pickNumber: pick.pickNumber,
          round: pick.round,
        });
      }
    });
    
    // Update team rosters
    const updatedTeamData = {...teamData};
    
    Object.keys(teamPicks).forEach(teamId => {
      const roster = teamPicks[teamId];
      
      // Initialize team data if it doesn't exist
      if (!updatedTeamData[teamId]) {
        updatedTeamData[teamId] = {
          teamName: getTeamName(teamId),
          players: [],
          positions: {
            PG: null, SG: null, SF: null, PF: null, C: null,
            G: null, F: null, UTIL: null,
            bench: []
          }
        };
      }
      
      // Update players
      updatedTeamData[teamId].players = roster;
      
      // Auto-assign positions based on player positions
      let assignedPositions = {
        PG: null, SG: null, SF: null, PF: null, C: null,
        G: null, F: null, UTIL: null,
        bench: []
      };
      
      // First pass - try to assign players to their primary positions
      roster.forEach(player => {
        // Normalize and expand positions
        let normalizedPositions = [];
        if (player.positions && player.positions.length > 0) {
          player.positions.forEach(pos => {
            // Split hyphenated positions and normalize to lowercase
            pos.split('-').forEach(subPos => {
              normalizedPositions.push(subPos.trim().toLowerCase());
            });
          });
        }

        console.log(`Assigning player: ${player.name}, positions: ${normalizedPositions.join(', ')}`);

        if (normalizedPositions.length === 0) {
          assignedPositions.bench.push(player);
          return;
        }

        let assigned = false;

        // Try to assign to Guard, Forward, Center slots
        if (!assigned && normalizedPositions.includes('guard')) {
          if (!assignedPositions.PG) {
            assignedPositions.PG = player;
            assigned = true;
          } else if (!assignedPositions.SG) {
            assignedPositions.SG = player;
            assigned = true;
          }
        }
        if (!assigned && normalizedPositions.includes('forward')) {
          if (!assignedPositions.SF) {
            assignedPositions.SF = player;
            assigned = true;
          } else if (!assignedPositions.PF) {
            assignedPositions.PF = player;
            assigned = true;
          }
        }
        if (!assigned && normalizedPositions.includes('center')) {
          if (!assignedPositions.C) {
            assignedPositions.C = player;
            assigned = true;
          }
        }

        // If still not assigned, try UTIL
        if (!assigned && !assignedPositions.UTIL) {
          assignedPositions.UTIL = player;
          assigned = true;
        }

        // If still not assigned, put on bench
        if (!assigned) {
          assignedPositions.bench.push(player);
        }
      });
      
      updatedTeamData[teamId].positions = assignedPositions;
    });
    
    setTeamData(updatedTeamData);
    
  };

  // Function to update a single team's roster with a new pick
  const updateTeamRosterWithPick = (pick) => {
    // Find player details
    const player = allPlayers.find(p => p.id === pick.playerId);
    if (!player) return;
    
    setTeamData(prevData => {
      const updatedData = {...prevData};
      const teamId = pick.teamId;
      
      // Initialize team data if it doesn't exist
      if (!updatedData[teamId]) {
        updatedData[teamId] = {
          teamName: pick.teamName || getTeamName(teamId),
          players: [],
          positions: {
            PG: null, SG: null, SF: null, PF: null, C: null,
            G: null, F: null, UTIL: null,
            bench: []
          }
        };
      }
      
      // Add player to roster
      const playerWithPickInfo = {
        ...player,
        pickNumber: pick.pickNumber,
        round: pick.round
      };
      
      // Add to players array
      updatedData[teamId].players = [...(updatedData[teamId].players || []), playerWithPickInfo];
      
      // Try to assign to a position
      const positions = updatedData[teamId].positions;
      
      if (!player.positions || player.positions.length === 0) {
        positions.bench.push(playerWithPickInfo);
      } else {
        const primaryPos = player.positions[0];
        if (primaryPos === 'PG' && !positions.PG) {
          positions.PG = playerWithPickInfo;
        } else if (primaryPos === 'SG' && !positions.SG) {
          positions.SG = playerWithPickInfo;
        } else if (primaryPos === 'SF' && !positions.SF) {
          positions.SF = playerWithPickInfo;
        } else if (primaryPos === 'PF' && !positions.PF) {
          positions.PF = playerWithPickInfo;
        } else if (primaryPos === 'C' && !positions.C) {
          positions.C = playerWithPickInfo;
        } else if ((primaryPos === 'PG' || primaryPos === 'SG') && !positions.G) {
          positions.G = playerWithPickInfo;
        } else if ((primaryPos === 'SF' || primaryPos === 'PF') && !positions.F) {
          positions.F = playerWithPickInfo;
        } else if (!positions.UTIL) {
          positions.UTIL = playerWithPickInfo;
        } else {
          positions.bench.push(playerWithPickInfo);
        }
      }
      
      return updatedData;
    });
  };

  // Populate team names based on draft order
  const populateTeamNames = async (draftOrder) => {
    if (!draftOrder || draftOrder.length === 0) return;
    
    console.log("Populating team names from draft order:", draftOrder);
    
    const newNames = {...teamNames};
    let didUpdate = false;
    
    // First try to use existing league data
    if (league && league.users) {
      league.users.forEach(user => {
        if (!newNames[user.id]) {
          newNames[user.id] = user.teamName || `Team ${user.name}`;
          didUpdate = true;
        }
      });
    }
    
    // Process draft order to extract team names
    for (const item of draftOrder) {
      let userId;
      let teamName;
      
      if (typeof item === 'object' && item.userId) {
        userId = item.userId;
        teamName = item.teamName;
      } else {
        userId = item;
        // Try to find in existing names
        teamName = newNames[userId];
      }
      
      // If we got a team name from the draft order, update our mapping
      if (teamName && !newNames[userId]) {
        newNames[userId] = teamName;
        didUpdate = true;
      }
    }
    
    // If we don't have enough names yet, fetch league data
    if (didUpdate || Object.keys(newNames).length < draftOrder.length) {
      try {
        const leagueResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
          withCredentials: true
        });
        
        if (leagueResponse.data && leagueResponse.data.users) {
          leagueResponse.data.users.forEach(user => {
            newNames[user.id] = user.teamName || `Team ${user.name}`;
          });
        }
        
        // Update state with all the names we've collected
        setTeamNames(newNames);
        console.log("Updated team names:", newNames);
      } catch (error) {
        console.error("Error fetching league data for team names:", error);
      }
    }
    
    return newNames;
  };
  
  // Fetch all team names for the league
  const fetchAllTeamNames = async () => {
    try {
      const leagueResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
        withCredentials: true
      });
      
      if (leagueResponse.data && leagueResponse.data.users) {
        const names = {};
        leagueResponse.data.users.forEach(user => {
          names[user.id] = user.teamName || `Team ${user.name}`;
        });
        setTeamNames(names);
      }
    } catch (error) {
      console.error("Error fetching team names:", error);
    }
  };

  const loadDraftData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      // Fetch league data
      const leagueResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}`, {
        withCredentials: true
      });
      setLeague(leagueResponse.data);
      
      // Set up team names mapping from league data
      if (leagueResponse.data && leagueResponse.data.users) {
        const names = {};
        leagueResponse.data.users.forEach(user => {
          names[user.id] = user.teamName || `Team ${user.name}`;
        });
        setTeamNames(prev => ({...prev, ...names}));
      }

      // Fetch draft state
      const draftResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}/draft`, {
        withCredentials: true
      });
      
      // First, ensure we have the correct team name for the current team
      let updatedCurrentTeam = draftResponse.data.currentTeam;
      if (updatedCurrentTeam && updatedCurrentTeam.userId) {
        const teamName = teamNames[updatedCurrentTeam.userId] || 
                        updatedCurrentTeam.teamName;
        
        if (teamName) {
          updatedCurrentTeam = {
            ...updatedCurrentTeam,
            teamName: teamName
          };
        }
      }
      
      // Merge the new state with existing state, preserving any data not included in the response
      setDraftState(prevState => ({
        ...prevState,
        ...draftResponse.data,
        currentTeam: updatedCurrentTeam || prevState.currentTeam,
        // Only update picks if picks are included in the response
        picks: draftResponse.data.picks || prevState.picks
      }));
      
      // Check if it's the current user's turn
      if (user && draftResponse.data.currentTeam?.userId === user.id) {
        setCurrentUserTurn(true);
        // Make sure processing is reset when it's the user's turn
        setPickingInProgress(false);
        setPickingTeamId(null);
      } else {
        setCurrentUserTurn(false);
      }

      // Load players if needed
      if (allPlayers.length === 0) {
        try {
          const playersResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}/players`, {
            withCredentials: true,
            params: {
              limit: 500,
              sortKey: 'rank',
              sortDirection: 'asc'
            }
          });
          
          console.log("Players fetched:", playersResponse.data.players?.length || 0);
          
          if (playersResponse.data.players && playersResponse.data.players.length > 0) {
            setAllPlayers(playersResponse.data.players);
          } else {
            console.log("No players from league endpoint, trying backup...");
            
            // Fallback to fetch players from backup endpoint
            const backupResponse = await axios.get(`http://localhost:5001/api/players`, {
              withCredentials: true
            });
            
            if (backupResponse.data && backupResponse.data.length > 0) {
              setAllPlayers(backupResponse.data);
            }
          }
        } catch (playerError) {
          console.error("Error fetching players:", playerError);
        }
      }

      // Fetch team rosters
      const teamsResponse = await axios.get(`http://localhost:5001/api/leagues/${leagueId}/teams`, {
        withCredentials: true
      });
      
      // Format team rosters
      const rosters = {};
      teamsResponse.data.forEach(team => {
        rosters[team.userId] = {
          teamName: team.teamName || `Team ${team.name}`,
          userName: team.name,
          players: team.players || []
        };
      });
      setTeamRosters(rosters);
      
      if (showLoading) {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading draft data:", error);
      if (showLoading) {
        setError('Failed to load draft data');
        setLoading(false);
      }
    }
  };

  const renderActionButtons = (player) => {
    // Don't show draft buttons for already drafted players
    const isDrafted = draftState.picks.some(pick => pick.playerId === player.id);
    
    if (isDrafted) {
      return <td>Drafted</td>;
    }
    
    // Check if this is the last picked player by the user
    const isLastPickedByUser = player.id === lastPickedPlayerId && pickingTeamId === user?.id;
    
    return (
      <td>
        {currentUserTurn && !pickingInProgress && (
          <button
            onClick={() => handleMakePick(player.id)}
            className="DB_action-button DB_draft-button"
            style={{
              padding: '8px 15px',
              backgroundColor: '#dc3545',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'block'
            }}
          >
            Draft Now
          </button>
        )}
        {currentUserTurn && pickingInProgress && isLastPickedByUser && (
          <button
            className="DB_action-button DB_processing"
            disabled={true}
          >
            Processing...
          </button>
        )}
        <button
          onClick={() => handleAddToQueue(player)}
          className="DB_action-button DB_queue-button"
          style={{
            marginTop: '5px',
            padding: '6px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: queue.some(p => p.id === player.id) ? 'none' : 'block'
          }}
        >
          +Queue
        </button>
      </td>
    );
  };

  const handleMakePick = async (playerId) => {
    if (!currentUserTurn || pickingInProgress) {
      console.log("Cannot make pick: not user's turn or picking in progress");
      return;
    }
    
    try {
      // Show picking status immediately
      setPickingInProgress(true);
      setPickingTeamId(user?.id);
      setLastPickedPlayerId(playerId);
      lastPickTimeRef.current = new Date();
      
      console.log(`Making pick: ${playerId}`);
      
      // Set up a timeout to reset picking state if no response - reduced to 3 seconds
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      processingTimeoutRef.current = setTimeout(() => {
        console.log("No response after 3 seconds, resetting picking state");
        setPickingInProgress(false);
        setPickingTeamId(null);
        // Force refresh data
        loadDraftData(false);
      }, 3000); // Reduced from 10000 to 3000 ms
      
      // Make the API call to draft the player
      await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/pick`, {
        playerId
      }, {
        withCredentials: true
      });
      
      // The actual state update will be handled by the WebSocket events
      
    } catch (error) {
      console.error("Error making pick:", error);
      alert(error.response?.data?.error || 'Failed to make pick');
      
      // Reset picking state
      setPickingInProgress(false);
      setPickingTeamId(null);
      
      // Clear timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      
      // Force a refresh of draft data
      loadDraftData(false);
    }
  };

  const handleAddToQueue = (player) => {
    if (queue.find(p => p.id === player.id)) return;
    setQueue([...queue, player]);
  };

  const handleRemoveFromQueue = (playerId) => {
    setQueue(queue.filter(player => player.id !== playerId));
  };

  const handleMoveInQueue = (playerId, direction) => {
    const index = queue.findIndex(player => player.id === playerId);
    if (index === -1) return;
    
    const newQueue = [...queue];
    if (direction === 'up' && index > 0) {
      [newQueue[index], newQueue[index - 1]] = [newQueue[index - 1], newQueue[index]];
    } else if (direction === 'down' && index < queue.length - 1) {
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    }
    
    setQueue(newQueue);
  };

  const handleStartDraft = async () => {
    try {
      setPickingInProgress(true);
      
      await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/start`, {}, {
        withCredentials: true
      });
      
      // Immediately fetch updated team names to get the correct first pick team
      await fetchAllTeamNames();
      
      // Refresh draft data to get the initial state
      setTimeout(() => {
        loadDraftData(false);
      }, 500);
    } catch (error) {
      console.error("Error starting draft:", error);
      alert(error.response?.data?.error || 'Failed to start draft');
      setPickingInProgress(false);
      
      // Force a refresh of draft data
      loadDraftData();
    }
  };

  const handleAutoPick = async () => {
    if (!currentUserTurn || pickingInProgress) {
      console.log("Cannot auto-pick: not user's turn or picking in progress");
      return;
    }
    
    try {
      setPickingInProgress(true);
      setPickingTeamId(user?.id);
      lastPickTimeRef.current = new Date();
      
      // Set up a timeout to reset picking state if no response - reduced to 3 seconds
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      processingTimeoutRef.current = setTimeout(() => {
        console.log("No response after 3 seconds, resetting picking state");
        setPickingInProgress(false);
        setPickingTeamId(null);
        // Force refresh data
        loadDraftData(false);
      }, 3000); // Reduced from 10000 to 3000 ms
      
      await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/autopick`, {}, {
        withCredentials: true
      });
      
      // The pick should be handled by the WebSocket events
    } catch (error) {
      console.error("Error making auto pick:", error);
      alert(error.response?.data?.error || 'Failed to make auto pick');
      
      // Reset picking state
      setPickingInProgress(false);
      setPickingTeamId(null);
      
      // Clear timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      
      // Force a refresh of draft data
      loadDraftData(false);
    }
  };

// Add a ref to store the current queue
const queueRef = useRef([]);
  
// Update the queue ref whenever queue changes
useEffect(() => {
  queueRef.current = queue;
}, [queue]);

// Add this new function after handleAutoPick
const handleTimeoutPick = async () => {
  // Use the ref to get the current queue value
  const currentQueue = queueRef.current;
  
  if (!currentUserTurn || pickingInProgress) {
    console.log("Cannot make timeout pick: not user's turn or already picking");
    return;
  }
  
  try {
    setPickingInProgress(true);
    setPickingTeamId(user?.id);
    lastPickTimeRef.current = new Date();
    
    console.log(`Making timeout pick with queue: ${currentQueue.length} players in queue`);
    
    // Set up a timeout to reset picking state if no response
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    
    processingTimeoutRef.current = setTimeout(() => {
      console.log("No response after 5 seconds, resetting picking state");
      setPickingInProgress(false);
      setPickingTeamId(null);
      loadDraftData(false);
    }, 5000);
    
    // If we have queued players, try to pick the first available one
    if (currentQueue.length > 0) {
      // Find first player in queue that hasn't been drafted
      const draftedIds = draftState.picks.map(pick => pick.playerId);
      let playerToPick = null;
      
      for (const queuedPlayer of currentQueue) {
        if (!draftedIds.includes(queuedPlayer.id)) {
          playerToPick = queuedPlayer;
          break;
        }
      }
      
      if (playerToPick) {
        console.log(`Picking from queue: ${playerToPick.name}`);
        setLastPickedPlayerId(playerToPick.id);
        
        // Use the regular pick endpoint
        await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/pick`, {
          playerId: playerToPick.id
        }, {
          withCredentials: true
        });
        
        // Remove picked player from queue
        setQueue(prev => prev.filter(p => p.id !== playerToPick.id));
        return;
      } else {
        console.log("All queued players have been drafted");
      }
    }
    
    // If no valid queued players, use autopick
    console.log("No valid players in queue, using autopick");
    await axios.post(`http://localhost:5001/api/leagues/${leagueId}/draft/autopick`, {}, {
      withCredentials: true
    });
    
  } catch (error) {
    console.error("Error making timeout pick:", error);
    
    // Reset picking state
    setPickingInProgress(false);
    setPickingTeamId(null);
    
    // Clear timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    
    // Force a refresh of draft data
    loadDraftData(false);
  }
};

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Find player by ID
  const getPlayerById = (playerId) => {
    return allPlayers.find(player => player.id === playerId);
  };

  // Get current pick number
  const getCurrentPickNumber = () => {
    if (!draftState.currentRound || !draftState.currentPick) return 1;
    
    const teamsCount = draftState.draftOrder.length;
    return ((draftState.currentRound - 1) * teamsCount) + draftState.currentPick;
  };

  // Get draft pick color class
  const getPickColorClass = (pick) => {
    if (!pick) return '';
    
    const positionColorMap = {
      'PG': 'DB_position-pg',
      'SG': 'DB_position-sg',
      'G': 'DB_position-g',
      'SF': 'DB_position-sf',
      'PF': 'DB_position-pf',
      'F': 'DB_position-f',
      'C': 'DB_position-c'
    };
    
    const player = getPlayerById(pick.playerId);
    if (player && player.positions && player.positions.length > 0) {
      return positionColorMap[player.positions[0]] || '';
    }
    
    return '';
  };
  
  // Check if this pick is the most recent one
  const isRecentPick = (pick) => {
    return recentPick && recentPick.pickNumber === pick.pickNumber;
  };

  // Is team currently picking
  const isTeamPicking = (teamId) => {
    return pickingInProgress && pickingTeamId === teamId;
  };

  // Get team name by ID
  const getTeamName = (userId) => {
    if (!userId) return "Unknown Team";
    
    // First check our team names mapping
    if (teamNames[userId]) {
      return teamNames[userId];
    }
    
    // Check league users
    if (league && league.users) {
      const user = league.users.find(u => u.id === parseInt(userId));
      if (user) {
        return user.teamName || `Team ${user.name}`;
      }
    }
    
    // Check draft state
    const teamInDraftOrder = draftState.draftOrder.find(item => {
      // Handle both formats: object with userId or plain userId
      if (typeof item === 'object') {
        return item.userId === userId;
      }
      return item === userId;
    });
    
    if (teamInDraftOrder && typeof teamInDraftOrder === 'object' && teamInDraftOrder.teamName) {
      return teamInDraftOrder.teamName;
    }
    
    return `Team ${userId}`;
  };
  
  // Check if user is a bot
  const isBot = (userId) => {
    if (!league || !league.users) return false;
    
    const userObj = league.users.find(u => u.id === parseInt(userId));
    return userObj && userObj.email && userObj.email.endsWith('@bot.com');
  };
  
  // Render draft pick boxes (round displays)
  const renderDraftOrderBoxes = () => {
    if (!draftState.draftOrder || draftState.draftOrder.length === 0) {
      return <div className="DB_no-draft-order">Draft order not yet established</div>;
    }
    
    // For a typical league, get the next batch of picks to show
    const teamsCount = draftState.draftOrder.length;
    const currentPickNumber = getCurrentPickNumber();
    let startPickNum = Math.floor((currentPickNumber - 1) / teamsCount) * teamsCount + 1;
    
    // Create array of pick numbers to display
    const pickNumbers = Array.from({length: teamsCount}, (_, i) => startPickNum + i);
    
    return (
      <div className="DB_draft-order-boxes">
        {pickNumbers.map(pickNum => {
          // Calculate round and pick in round
          const round = Math.ceil(pickNum / teamsCount);
          const pickInRound = ((pickNum - 1) % teamsCount) + 1;
          
          // For even rounds (snake draft), reverse the order
          let teamIndex;
          if (round % 2 === 1) {
            // Odd round - normal order
            teamIndex = pickInRound - 1;
          } else {
            // Even round - reverse order
            teamIndex = teamsCount - pickInRound;
          }
          
          if (teamIndex < 0 || teamIndex >= draftState.draftOrder.length) {
            console.error(`Invalid team index: ${teamIndex}, draftOrder length: ${draftState.draftOrder.length}`);
            return null;
          }
          
          const draftItem = draftState.draftOrder[teamIndex];
          
          // Handle both formats: object with userId or plain userId
          let teamId, teamName;
          
          if (typeof draftItem === 'object' && draftItem.userId) {
            teamId = draftItem.userId;
            teamName = draftItem.teamName || teamNames[teamId] || `Team ${teamId}`;
          } else {
            teamId = draftItem;
            teamName = teamNames[teamId] || `Team ${teamId}`;
          }
          
          const isCurrent = pickNum === currentPickNumber;
          const isPicking = isTeamPicking(teamId);
          const isUserTeam = user && teamId === user.id.toString();
          const isTeamBot = isBot(teamId);
          
          // Find if this pick has been made
          const pick = draftState.picks.find(p => p.pickNumber === pickNum);
          
          return (
            <div 
              key={pickNum} 
              className={`DB_draft-pick-box ${isCurrent ? 'DB_current-pick-box' : ''} 
                          ${isPicking ? 'DB_picking-box' : ''} 
                          ${isUserTeam ? 'DB_user-team-box' : ''}
                          ${pick ? 'DB_picked-box' : ''}
                          ${isTeamBot ? 'DB_bot-team-box' : ''}`}
            >
              <div className="DB_pick-box-header">
                <span className="DB_pick-number">PICK {pickNum}</span>
                {isTeamBot && <span className="DB_bot-indicator">BOT</span>}
              </div>
              <div className="DB_pick-box-team">
                {teamName}
              </div>
              {pick && (
                <div className="DB_pick-box-player">
                  {getPlayerById(pick.playerId)?.name || 'Unknown Player'}
                </div>
              )}
              {isCurrent && !pick && (
                <div className="DB_pick-box-on-clock">
                  {isPicking ? 'PICKING...' : 'ON THE CLOCK'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  // Render the team roster view
  const renderTeamRoster = () => {
    // Get available teams for dropdown
    const teamOptions = [];
    if (league && league.users) {
      league.users.forEach(user => {
        teamOptions.push({
          id: user.id,
          name: user.teamName || `Team ${user.name}`,
          isBot: user.email && user.email.endsWith('@bot.com')
        });
      });
    }
    
    // Get selected team data
    const selectedTeamData = selectedRosterTeam ? 
      teamData[selectedRosterTeam] || { teamName: getTeamName(selectedRosterTeam), players: [], positions: {} } : 
      null;
    
    return (
      <div className="DB_team-roster">
        <div className="DB_roster-header">
        <select 
          value={selectedRosterTeam || ''} 
          onChange={(e) => {
            setSelectedRosterTeam(e.target.value);
            setUserChangedTeam(true); // Flag that user has manually selected a team
          }}
          className="DB_roster-team-selector"
        >
            <option value="" disabled>Select Team</option>
            {teamOptions.map(team => (
              <option key={team.id} value={team.id}>
                {team.name} {team.isBot ? '(BOT)' : ''}
              </option>
            ))}
          </select>
        </div>
        
        {selectedTeamData && (
          <div className="DB_roster-content">
            <div className="DB_roster-positions">
              <div className="DB_roster-position-row">
                <div className="DB_roster-position DB_position-pg">
                  <div className="DB_position-label">PG</div>
                  {selectedTeamData.positions?.PG ? (
                    <div className="DB_position-player">
                      <img
                        src={`/headshots/${selectedTeamData.positions.PG.name.split(' ').join('_')}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={selectedTeamData.positions.PG.name}
                        className="DB_position-player-img"
                      />
                      <div className="DB_position-player-name">{selectedTeamData.positions.PG.name}</div>
                    </div>
                  ) : (
                    <div className="DB_position-empty">Empty</div>
                  )}
                </div>
                
                <div className="DB_roster-position DB_position-sg">
                  <div className="DB_position-label">SG</div>
                  {selectedTeamData.positions?.SG ? (
                    <div className="DB_position-player">
                      <img
                        src={`/headshots/${selectedTeamData.positions.SG.name.split(' ').join('_')}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={selectedTeamData.positions.SG.name}
                        className="DB_position-player-img"
                      />
                      <div className="DB_position-player-name">{selectedTeamData.positions.SG.name}</div>
                    </div>
                  ) : (
                    <div className="DB_position-empty">Empty</div>
                  )}
                </div>
              </div>
              
              <div className="DB_roster-position-row">
                <div className="DB_roster-position DB_position-sf">
                  <div className="DB_position-label">SF</div>
                  {selectedTeamData.positions?.SF ? (
                    <div className="DB_position-player">
                      <img
                        src={`/headshots/${selectedTeamData.positions.SF.name.split(' ').join('_')}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={selectedTeamData.positions.SF.name}
                        className="DB_position-player-img"
                      />
                      <div className="DB_position-player-name">{selectedTeamData.positions.SF.name}</div>
                    </div>
                  ) : (
                    <div className="DB_position-empty">Empty</div>
                  )}
                </div>
                
                <div className="DB_roster-position DB_position-pf">
                  <div className="DB_position-label">PF</div>
                  {selectedTeamData.positions?.PF ? (
                    <div className="DB_position-player">
                      <img
                        src={`/headshots/${selectedTeamData.positions.PF.name.split(' ').join('_')}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={selectedTeamData.positions.PF.name}
                        className="DB_position-player-img"
                      />
                      <div className="DB_position-player-name">{selectedTeamData.positions.PF.name}</div>
                    </div>
                  ) : (
                    <div className="DB_position-empty">Empty</div>
                  )}
                </div>
                
                <div className="DB_roster-position DB_position-c">
                  <div className="DB_position-label">C</div>
                  {selectedTeamData.positions?.C ? (
                    <div className="DB_position-player">
                      <img
                        src={`/headshots/${selectedTeamData.positions.C.name.split(' ').join('_')}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={selectedTeamData.positions.C.name}
                        className="DB_position-player-img"
                      />
                      <div className="DB_position-player-name">{selectedTeamData.positions.C.name}</div>
                    </div>
                  ) : (
                    <div className="DB_position-empty">Empty</div>
                  )}
                </div>
              </div>
              
              <div className="DB_roster-position-row">
                <div className="DB_roster-position DB_position-g">
                  <div className="DB_position-label">G</div>
                  {selectedTeamData.positions?.G ? (
                    <div className="DB_position-player">
                      <img
                        src={`/headshots/${selectedTeamData.positions.G.name.split(' ').join('_')}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={selectedTeamData.positions.G.name}
                        className="DB_position-player-img"
                      />
                      <div className="DB_position-player-name">{selectedTeamData.positions.G.name}</div>
                    </div>
                  ) : (
                    <div className="DB_position-empty">Empty</div>
                  )}
                </div>
                
                <div className="DB_roster-position DB_position-f">
                  <div className="DB_position-label">F</div>
                  {selectedTeamData.positions?.F ? (
                    <div className="DB_position-player">
                      <img
                        src={`/headshots/${selectedTeamData.positions.F.name.split(' ').join('_')}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={selectedTeamData.positions.F.name}
                        className="DB_position-player-img"
                      />
                      <div className="DB_position-player-name">{selectedTeamData.positions.F.name}</div>
                    </div>
                  ) : (
                    <div className="DB_position-empty">Empty</div>
                  )}
                </div>
                
                <div className="DB_roster-position DB_position-util">
                  <div className="DB_position-label">UTIL</div>
                  {selectedTeamData.positions?.UTIL ? (
                    <div className="DB_position-player">
                      <img
                        src={`/headshots/${selectedTeamData.positions.UTIL.name.split(' ').join('_')}_headshot.jpg`}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                        alt={selectedTeamData.positions.UTIL.name}
                        className="DB_position-player-img"
                      />
                      <div className="DB_position-player-name">{selectedTeamData.positions.UTIL.name}</div>
                    </div>
                  ) : (
                    <div className="DB_position-empty">Empty</div>
                  )}
                </div>
              </div>
              
              {/* Bench Section */}
              <div className="DB_roster-bench">
                <div className="DB_bench-label">Bench</div>
                <div className="DB_bench-players">
                  {selectedTeamData.positions?.bench && selectedTeamData.positions.bench.length > 0 ? (
                    selectedTeamData.positions.bench.map((player, index) => (
                      <div key={`bench-${player.id}-${index}`} className="DB_bench-player">
                        <img
                          src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
                          onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                          alt={player.name}
                          className="DB_bench-player-img"
                        />
                        <div className="DB_bench-player-name">{player.name}</div>
                      </div>
                    ))
                  ) : (
                    <div className="DB_bench-empty">No bench players</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <MenuBar />
        <div className="DB_container">
          <h2>Loading draft board...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <MenuBar />
        <div className="DB_container">
          <h2>Error: {error}</h2>
          <button onClick={() => navigate(`/leagues/${leagueId}`)} className="DB_button">Back to League</button>
        </div>
      </div>
    );
  }

  // Only show draft setup if draft hasn't started and user is commissioner
  if (draftState.status === 'not_started') {
    const isCommissioner = league && league.commissionerId === (user?.id?.toString());
    
    return (
      <div>
        <MenuBar />
        <div className="DB_container DB_draft-not-started">
          <h1>Draft Not Started</h1>
          <p>The draft for {league.name} has not started yet.</p>
          
          {league.draftDate && (
            <div className="DB_draft-info">
              <h2>Scheduled Draft Time</h2>
              <p>{new Date(league.draftDate).toLocaleString()}</p>
            </div>
          )}
          
          {isCommissioner && (
            <div className="DB_commissioner-actions">
              <h2>Commissioner Actions</h2>
              <button
                onClick={() => navigate(`/leagues/${leagueId}/draft/setup`)}
                className="DB_button DB_edit-button"
                disabled={pickingInProgress}
              >
                Edit Draft Settings
              </button>
              <button
                onClick={handleStartDraft}
                className="DB_button DB_start-button"
                disabled={pickingInProgress}
              >
                {pickingInProgress ? 'Starting Draft...' : 'Start Draft Now'}
              </button>
            </div>
          )}
          
          <button onClick={() => navigate(`/leagues/${leagueId}`)} className="DB_button">
            Back to League
          </button>
        </div>
      </div>
    );
  }

  // Render the draft board
  return (
    <div>
      <MenuBar />
      <div className="DB_draft-board">
        <div className="DB_header">
          <h1>{league.name} - Fantasy Draft</h1>
          
          {!socketConnected && showReconnectMessage && (
            <div className="DB_connection-warning" style={{ 
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              zIndex: 5,
              opacity: 0.8
            }}>
              Reconnecting... <span className="DB_spinner"></span>
            </div>
          )}
          
          {draftState.status === 'in_progress' && (
            <div className="DB_draft-status">
              <div className="DB_round-pick">
                Round {draftState.currentRound}, Pick {draftState.currentPick}
              </div>
              <div className="DB_current-team">
                {getTeamName(draftState.currentTeam?.userId)}
                {isTeamPicking(draftState.currentTeam?.userId) ? (
                  <span className="DB_picking-now"> is picking...</span>
                ) : (
                  <span className="DB_on-clock"> is on the clock</span>
                )}
              </div>
              <div className="DB_timer" style={{ 
                color: draftState.pickTimeRemaining < 10 ? 'red' : '#ffc107', 
                fontWeight: 'bold'
              }}>
                {formatTimeRemaining(draftState.pickTimeRemaining)}
              </div>
            </div>
          )}
          
          {draftState.status === 'completed' && (
            <div className="DB_draft-status">
              <div className="DB_completed-message">Draft Completed</div>
              <button onClick={() => navigate(`/leagues/${leagueId}`)} className="DB_button">
                Back to League
              </button>
            </div>
          )}
        </div>

        {/* Draft order boxes (ESPN style) */}
        <div className="DB_draft-order-container">
          {renderDraftOrderBoxes()}
        </div>
        
        <div className="DB_main-content">
          {/* Team Roster Section (new) */}
          <div className="DB_left-sidebar">
            {renderTeamRoster()}
          </div>

          <div className="DB_center-panel">
            <div className="DB_filter-section">
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="DB_search-input"
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
              />
              <div className="DB_filters" style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={selectedTeam}
                  onChange={e => setSelectedTeam(e.target.value)}
                  className="DB_filter-select"
                  style={{ flex: 1 }}
                >
                  <option value="">All Teams</option>
                  {/* NBA teams options */}
                  <option value="Hawks">Atlanta Hawks</option>
                  <option value="Celtics">Boston Celtics</option>
                  <option value="Nets">Brooklyn Nets</option>
                  <option value="Hornets">Charlotte Hornets</option>
                  <option value="Bulls">Chicago Bulls</option>
                  <option value="Cavaliers">Cleveland Cavaliers</option>
                  <option value="Mavericks">Dallas Mavericks</option>
                  <option value="Nuggets">Denver Nuggets</option>
                  <option value="Pistons">Detroit Pistons</option>
                  <option value="Warriors">Golden State Warriors</option>
                  <option value="Rockets">Houston Rockets</option>
                  <option value="Pacers">Indiana Pacers</option>
                  <option value="Clippers">Los Angeles Clippers</option>
                  <option value="Lakers">Los Angeles Lakers</option>
                  <option value="Grizzlies">Memphis Grizzlies</option>
                  <option value="Heat">Miami Heat</option>
                  <option value="Bucks">Milwaukee Bucks</option>
                  <option value="Timberwolves">Minnesota Timberwolves</option>
                  <option value="Pelicans">New Orleans Pelicans</option>
                  <option value="Knicks">New York Knicks</option>
                  <option value="Thunder">Oklahoma City Thunder</option>
                  <option value="Magic">Orlando Magic</option>
                  <option value="76ers">Philadelphia 76ers</option>
                  <option value="Suns">Phoenix Suns</option>
                  <option value="Trail Blazers">Portland Trail Blazers</option>
                  <option value="Kings">Sacramento Kings</option>
                  <option value="Spurs">San Antonio Spurs</option>
                  <option value="Raptors">Toronto Raptors</option>
                  <option value="Jazz">Utah Jazz</option>
                  <option value="Wizards">Washington Wizards</option>
                </select>
                <select
                  value={selectedPosition}
                  onChange={e => setSelectedPosition(e.target.value)}
                  className="DB_filter-select"
                  style={{ flex: 1 }}
                >
                  <option value="">All Positions</option>
                  <option value="PG">Point Guard</option>
                  <option value="SG">Shooting Guard</option>
                  <option value="SF">Small Forward</option>
                  <option value="PF">Power Forward</option>
                  <option value="C">Center</option>
                </select>
              </div>
            </div>
            
            <div className="DB_players-section">
              <table className="DB_players-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: '#36454F', color: 'white' }}>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Pos</th>
                    <th>Team</th>
                    <th>Avg</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.length > 0 ? (
                    filteredPlayers.map(player => (
                      <tr
                        key={player.id}
                        className={highlightedPlayer === player.id ? 'DB_highlighted-player' : ''}
                        onMouseEnter={() => setHighlightedPlayer(player.id)}
                        onMouseLeave={() => setHighlightedPlayer(null)}
                        style={{ 
                          background: highlightedPlayer === player.id ? '#e6f7ff' : 'white',
                          // Strike through if already drafted
                          textDecoration: draftState.picks.some(p => p.playerId === player.id) 
                            ? 'line-through' 
                            : 'none',
                          opacity: draftState.picks.some(p => p.playerId === player.id) ? 0.6 : 1
                        }}
                      >
                        <td>{player.rank || '-'}</td>
                        <td>
                          <div className="DB_player-name" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
                              onError={(e) => { e.target.onerror = null; e.target.src = '/headshots/default.jpg'; }}
                              alt={player.name}
                              style={{ width: '30px', height: '30px', borderRadius: '50%' }}
                            />
                            {player.name}
                          </div>
                        </td>
                        <td>{player.positions ? player.positions.join(', ') : '-'}</td>
                        <td>{player.team || '-'}</td>
                        <td>{player.avgFanPts?.toFixed(1) || '-'}</td>
                        {renderActionButtons(player)}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                        No players found. Try adjusting your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="DB_right-panel">
            <div className="DB_queue-section">
              <h2>Your Queue</h2>
              {queue.length === 0 ? (
                <div className="DB_empty-queue">
                  <p>Your queue is empty. Add players to your queue to prepare for your pick.</p>
                </div>
              ) : (
                <div className="DB_queue-list">
                  {queue.map((player, index) => (
                    <div key={player.id} className="DB_queue-item">
                      <div className="DB_queue-rank">{index + 1}</div>
                      <div className="DB_queue-player">
                        <img
                          src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/headshots/default.jpg';
                          }}
                          alt={player.name}
                          className="DB_queue-player-image"
                        />
                        <div className="DB_queue-player-info">
                          <div className="DB_queue-player-name">{player.name}</div>
                          <div className="DB_queue-player-details">
                            {player.positions?.join(', ') || '-'} | {player.team || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="DB_queue-actions">
                        <button
                          onClick={() => handleMoveInQueue(player.id, 'up')}
                          disabled={index === 0}
                          className="DB_queue-action-button"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveInQueue(player.id, 'down')}
                          disabled={index === queue.length - 1}
                          className="DB_queue-action-button"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleRemoveFromQueue(player.id)}
                          className="DB_queue-action-button DB_remove-button"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {currentUserTurn && queue.length > 0 && !pickingInProgress && (
                <button
                  onClick={() => handleMakePick(queue[0].id)}
                  className="DB_draft-queue-button"
                >
                  Draft {queue[0].name}
                </button>
              )}
              
              {currentUserTurn && !pickingInProgress && (
                <button
                  onClick={handleAutoPick}
                  className="DB_auto-pick-button"
                >
                  Auto Pick
                </button>
              )}
              
              {currentUserTurn && pickingInProgress && (
                <button
                  disabled={true}
                  className="DB_draft-queue-button DB_processing"
                >
                  Processing...
                </button>
              )}
            </div>
            
            <div className="DB_picks-section">
              <h2>Draft Picks</h2>
              <div className="DB_picks-list">
                {draftState.picks.map((pick, index) => {
                  const player = getPlayerById(pick.playerId);
                  const pickNumber = index + 1;
                  const roundNumber = Math.ceil(pickNumber / draftState.draftOrder.length);
                  const pickInRound = ((pickNumber - 1) % draftState.draftOrder.length) + 1;
                  const isRecent = isRecentPick(pick);
                  
                  return (
                    <div
                      key={`pick-${pick.pickNumber}-${pick.playerId}`}
                      className={`DB_pick-item ${getPickColorClass(pick)} ${isRecent ? 'DB_recent-pick' : ''}`}
                      style={isRecent ? { animation: 'highlightPick 2s' } : {}}
                    >
                      <div className="DB_pick-number">
                        {roundNumber}.{pickInRound}
                      </div>
                      <div className="DB_pick-team">
                        {pick.teamName || getTeamName(pick.teamId)}
                        {isBot(pick.teamId) && <span className="DB_pick-bot-tag">BOT</span>}
                      </div>
                      <div className="DB_pick-player">
                        {player ? (
                          <>
                            <img
                              src={`/headshots/${player.name.split(' ').join('_')}_headshot.jpg`}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/headshots/default.jpg';
                              }}
                              alt={player.name}
                              className="DB_pick-player-image"
                            />
                            <div className="DB_pick-player-info">
                              <div className="DB_pick-player-name">{player.name}</div>
                              <div className="DB_pick-player-details">
                                {player.positions?.join(', ') || '-'} | {player.team || '-'}
                              </div>
                            </div>
                          </>
                        ) : (
                          'Unknown Player'
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {draftState.status === 'in_progress' && (
                  <div className="DB_current-pick">
                    <div className="DB_pick-number">
                      {draftState.currentRound}.{draftState.currentPick}
                    </div>
                    <div className="DB_pick-team">
                      {getTeamName(draftState.currentTeam?.userId)}
                      {isBot(draftState.currentTeam?.userId) && <span className="DB_pick-bot-tag">BOT</span>}
                    </div>
                    <div className={`DB_pick-player ${pickingInProgress ? 'DB_picking' : 'DB_on-clock'}`}>
                      {pickingInProgress ? (
                        <span>Picking... <div className="DB_spinner"></div></span>
                      ) : (
                        <span>On the clock: {formatTimeRemaining(draftState.pickTimeRemaining)}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Invisible element for scrolling to the most recent pick */}
                <div ref={picksEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftBoard;
