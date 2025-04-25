import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from "ws";
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import crypto from 'crypto';
import { Server } from "socket.io";
import { data } from 'react-router-dom';
import { create } from 'domain';

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = 5001;
const draftTimers = {};

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true,  
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "DELETE", "PUT"]
}));
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Passport and session support
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// WebSocket setup
const wss = new WebSocketServer({ port: 5002 }); 
let activeUsers = 0;

wss.on("connection", (ws) => {
    console.log("New WebSocket connection!");
    activeUsers++;
    broadcastActiveUsers();

    ws.on("close", () => {
        activeUsers--;
        broadcastActiveUsers();
    });
});

const broadcastActiveUsers = () => {
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify({ activeUsers }));
        }
    });
};

passport.use(
  new GoogleStrategy(
      {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "http://localhost:5001/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
          try {
              // First check if user exists by Google ID
              let user = await prisma.user.findUnique({
                  where: { googleID: profile.id },
              });

              if (user) {
                  return done(null, user);
              }
              
              // If not found by Google ID, try to find by email
              const email = profile.emails[0].value;
              user = await prisma.user.findUnique({
                  where: { email: email },
              });
              
              // If user exists with this email, update with Google ID
              if (user) {
                  user = await prisma.user.update({
                      where: { id: user.id },
                      data: { googleID: profile.id }
                  });
                  return done(null, user);
              }
              
              // Generate a random password for Google users
              const dummyPassword = crypto.randomBytes(16).toString("hex");

              // Create new user if not found
              user = await prisma.user.create({
                  data: {
                      googleID: profile.id,
                      name: profile.displayName,
                      email: email,
                      password: dummyPassword,
                      createdAt: new Date(),
                  },
              });

              return done(null, user);
          } catch (error) {
              console.error("Google auth error:", error);
              done(error, null);
          }
      }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  // Get the session ID from query parameters
  const sessionId = req.query.sessionId || 'default';
  
  // Use sessionId in the cookie name
  const cookieName = `jwt_${sessionId}`;
  const token = req.cookies[cookieName];

  if (token) {
      try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await prisma.user.findUnique({ where: { id: decoded.id } });

          if (!user) {
              return res.status(401).json({ error: "Invalid user" });
          }

          req.user = user;
          next();
      } catch (err) {
          res.status(401).json({ error: "Invalid token" });
      }
  } else if (req.user) {
      // If using Passport.js and the user is authenticated via Google
      next();
  } else {
      return res.status(401).json({ error: "Unauthorized" });
  }
};

console.log("Available Prisma models:", Object.keys(prisma));

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
      const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      // On successful login, redirect to frontend main page instead of dashboard
      res.redirect('http://localhost:5173/');
  }
);

app.post('/login', async (req, res) => {
  const { name, password } = req.body;
  const sessionId = req.query.sessionId || 'default';

  if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
  }

  try {
      const user = await prisma.user.findFirst({
          where: { name }
      });

      if (!user) {
          return res.status(400).json({ error: "Invalid name or password" });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ error: "Invalid name or password" });
      }

      // Remove sensitive data
      const { password: _, ...safeUser } = user;

      // Create JWT token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

      // Use the sessionId as part of the cookie name for isolation
      const cookieName = `jwt_${sessionId}`;
      
      res.cookie(cookieName, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600000 // 1 hour
      });

      res.json({ message: "Login successful", user: safeUser });

  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// Profile endpoint - protected
app.get('/profile', authenticate, async (req, res) => {
  try {
      const userData = await prisma.user.findFirst({
          where: { id: req.user.id },
          select: { id: true, name: true, email: true, createdAt: true, teamName: true, leagueId: true, league:true}
      });
      
      if (!userData) {
          return res.status(404).json({ error: "User not found" });
      }        
      
      res.json(userData);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

app.post('/logout', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  
  // Clear the session-specific cookie
  const cookieName = `jwt_${sessionId}`;
  
  res.clearCookie(cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
  });
  
  // Add this line to clear passport session
  if (req.logout) {
    req.logout(function(err) {
      if (err) {
        console.error("Error during logout:", err);
      }
    });
  }
  
  res.json({ message: "Logged out successfully" });
});

// User registration route
app.post('/register', async (req, res) => {
    const { name, email, phone, username, password } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: "Email already in use" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // console.log("Prisma client models:", prisma);

        // Create the user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                createdAt: new Date(), // Set createdAt to current date/time
                rosterIds: [],
                password: hashedPassword
            }
        });
        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.post('/api/players/getLivePlayerStats', (req, res) => {
    const { playerName } = req.body;
    
    if (!playerName) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    // Correct execution path for `player_collection.py`
    const command = `python player_collection.py live_stats "${playerName}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ EXECUTION ERROR: ${error.message}`);
            return res.status(500).json({ error: `Error executing Python script: ${error.message}` });
        }
        if (stderr) {
            console.error(`⚠️ STDERR: ${stderr}`);
        }

        try {
            const data = JSON.parse(stdout);

            if (data.error) {
                return res.status(200).json({ message: `${playerName} is not playing right now.` });
            }

            res.json(data);
        } catch (parseError) {
            console.error(`❌ ERROR: Failed to parse JSON response from Python script.`);
            console.error(`⚠️ RAW OUTPUT: ${stdout}`);
            return res.status(500).json({ error: "Failed to parse Python script response" });
        }
    });
});

app.post('/api/players/getPlayerGameLog', (req, res) => {
    const { playerName, season } = req.body;

    if (!playerName) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    const seasonArg = season ? season : "2023-24"; // Default to current season

    // ✅ Execute `player_stats.py` with `game_log` command
    const command = `python player_stats.py game_log "${playerName}" "${seasonArg}"`;


    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ EXECUTION ERROR: ${error.message}`);
            return res.status(500).json({ error: `Error executing Python script: ${error.message}` });
        }
        if (stderr) {
            console.error(`⚠️ STDERR: ${stderr}`);
        }

        try {
            const data = JSON.parse(stdout);

            if (data.error) {
                return res.status(200).json(data);
            }

            res.json(data);
        } catch (parseError) {
            console.error(`❌ ERROR: Failed to parse JSON response from Python script.`);
            return res.status(500).json({ error: "Failed to parse Python script response" });
        }
    });
});
app.post('/api/players/getCommonPlayerInfo', (req, res) => {
    const { playerName } = req.body;
    if (!playerName) {
        return res.status(400).json({ error: 'Player name is required' });
    }
    // Execute player_collection.py with the command "common_info" and the player's name.
    const command = `python player_collection.py common_info "${playerName}"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error.message}`);
            return res.status(500).json({ error: `Error executing Python script: ${error.message}` });
        }
        if (stderr) {
            console.error(`STDERR: ${stderr}`);
        }
        try {
            const data = JSON.parse(stdout);
            res.json(data);
        } catch (parseError) {
            console.error('Failed to parse JSON response from Python script.', stdout);
            return res.status(500).json({ error: "Failed to parse Python script response" });
        }
    });
});

app.get('/api/leagues/:leagueId/players', async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    const limit = parseInt(req.query.limit, 10) || 25;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    // Retrieve filtering parameters from the query string.
    const teamFilter = req.query.team || "";          // e.g. "Boston Celtics"
    const positionFilter = req.query.position || "";    // e.g. "PG"
    const search = req.query.search || "";

    // Retrieve sorting parameters.
    const sortKey = req.query.sortKey || null; // e.g. "avgFanPts", "rank", etc.
    const sortDirection = req.query.sortDirection || 'default'; // "asc" or "desc" (if not default)
    let orderBy = {};
    if (sortKey && sortDirection !== 'default') {
      // Order by the field on the related player record.
      orderBy = { player: { [sortKey]: sortDirection } };
    }

    // Build the where clause. Start with leagueId.
    let whereClause = { leagueId };

    // If filtering by team, add that constraint.
    if (teamFilter && teamFilter !== "All Teams") {
      whereClause = {
        ...whereClause,
        player: { 
          ...whereClause.player,
          team: teamFilter,
        },
      };
    }

    // If filtering by position, use the "has" operator (assuming positions is an array field).
    if (positionFilter) {
      whereClause = {
        ...whereClause,
        player: {
          ...whereClause.player,
          positions: { has: positionFilter },
        },
      };
    }

    // If a search term is provided, filter by player name (case-insensitive).
    if (search) {
      whereClause = {
        ...whereClause,
        player: {
          ...whereClause.player,
          name: { contains: search, mode: "insensitive" },
        },
      };
    }

    // Count total players matching the filters.
    const totalPlayers = await prisma.leaguePlayer.count({
      where: whereClause,
    });

    // Fetch players applying filtering, sorting and pagination.
    const leaguePlayers = await prisma.leaguePlayer.findMany({
      where: whereClause,
      orderBy: Object.keys(orderBy).length ? orderBy : undefined,
      skip: skip,
      take: limit,
      include: { player: true },
    });

    const players = leaguePlayers.map(lp => lp.player);
    const totalPages = Math.ceil(totalPlayers / limit);

    res.json({
      players,
      page,
      totalPages,
      totalPlayers,
    });
  } catch (error) {
    console.error("Error fetching league players:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
  
  // Endpoint to get gamelogs for a given player.
  app.get('/api/players/:playerId/gamelogs', async (req, res) => {
    try {
      const playerId = Number(req.params.playerId);
      // Fetch PlayerStats records and join with Game (to get finalScore).
      const stats = await prisma.playerStats.findMany({
        where: { playerId },
        include: { game: true },
        orderBy: { game_date: 'desc' }
      });
      // Map into a simplified format for the front end.
      const gameLogs = stats.map(s => ({
        date: s.game_date.toISOString().split('T')[0],
        opp: s.matchup,
        // Show the finalScore from the related Game record; if missing, default to "Final"
        finalScore: s.game?.finalScore || "Final",
        fanPts: s.fantasyPoints,
        min: s.minutes,
        pts: s.points,
        reb: s.rebounds,
        ast: s.assists,
        st: s.steals,
        blk: s.blocks,
        to: s.turnovers,
        // You might also include a "status" field if needed; here we use finalScore.
        status: s.game?.finalScore || "Final"
      }));
      res.json(gameLogs);
    } catch (error) {
      console.error("Error fetching game logs:", error);
      res.status(500).json({ error: "Failed to retrieve game logs" });
    }
  });

// tart server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Update the roster endpoint in server.js
app.get('/api/roster/:userId', authenticate, async (req, res) => {
  try {
    // Add user validation - users can only access their own roster
    const requestedUserId = parseInt(req.params.userId);
    const authenticatedUserId = req.user.id;
    
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: "You can only access your own roster" });
    }
    
    // Use the authenticated user ID for the rest of the function
    const userId = authenticatedUserId;
    
    // Get user roster or create empty roster if none exists
    let roster = await prisma.roster.findFirst({
      where: { userId },
      include: { 
          players: {
            include: { 
              player: {
                include: {
                  stats: {
                    orderBy: { game_date: 'desc' },
                    take: 10 // Get most recent games for avg calculation
                  }
                }
              }
            }
          }
        }
      });
      
      if (!roster) {
        // Create a new roster for the user (unchanged code)
        roster = await prisma.roster.create({
          data: {
            userId,
            teamName: "My Team",
            createdAt: new Date(),
            updatedAt: new Date()
          },
          include: { 
            players: {
              include: { 
                player: {
                  include: {
                    stats: {
                      orderBy: { game_date: 'desc' },
                      take: 10
                    }
                  }
                }
              }
            }
          }
        });
      }
      
      // Process each player to calculate avgFanPts
      if (roster.players) {
        roster.players = roster.players.map(rosterPlayer => {
          const player = rosterPlayer.player;
          
          // Calculate average fantasy points from recent games
          let avgFanPts = 0;
          if (player.stats && player.stats.length > 0) {
            const totalPoints = player.stats.reduce((sum, stat) => sum + (stat.fantasyPoints || 0), 0);
            avgFanPts = totalPoints / player.stats.length;
          }
          
          // Check if player has a live game in progress
          const liveStats = player.stats.find(stat => stat.game_in_progress);
          
          return {
            ...rosterPlayer,
            player: {
              ...player,
              avgFanPts,
              // If there's a live game, use its fantasy points
              liveFanPts: liveStats?.fantasyPoints || null,
              isLive: !!liveStats
            }
          };
        });
      }
      
      res.json(roster);
    } catch (error) {
      console.error("Error fetching roster:", error);
      res.status(500).json({ error: "Failed to get roster" });
    }
  });
  
  app.post('/api/roster/add', authenticate, async (req, res) => {
    try {
      // Use authenticated user ID if available, fallback to request body
      const userId = req.user?.id || parseInt(req.body.userId);
      const { playerId, position, isBench } = req.body;
      
      // If position and isBench are explicitly provided, use those values
      const useProvidedPosition = position !== undefined && isBench !== undefined;
      
      // Get current roster with all players
      const roster = await prisma.roster.findFirst({
        where: { userId: parseInt(userId) },
        include: { 
          players: {
            include: { player: true }
          }
        }
      });
      
      if (!roster) {
        return res.status(404).json({ error: "Roster not found" });
      }
      
      // Check if player is already on roster (checking by ID to be safe)
      const existingRosterPlayer = roster.players.find(rp => rp.playerId === parseInt(playerId));
      if (existingRosterPlayer) {
        return res.status(400).json({ error: "Player already on roster" });
      }
      
      // Get player details to check position eligibility
      const player = await prisma.player.findUnique({
        where: { id: parseInt(playerId) }
      });
      
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      // Count starters and bench players
      const starters = roster.players.filter(p => !p.isBench);
      const bench = roster.players.filter(p => p.isBench);
      
      // Check total roster size (15 player maximum)
      if (starters.length + bench.length >= 15) {
        return res.status(400).json({ error: "Roster is full (maximum 15 players)" });
      }
      
      // If position is explicitly provided, use it
      if (useProvidedPosition) {
        // Add player with the specified position
        const rosterPlayer = await prisma.rosterPlayer.create({
          data: {
            rosterId: roster.id,
            playerId: parseInt(playerId),
            position: position,
            isBench: isBench
          },
          include: { player: true }
        });
        
        return res.json({ 
          success: true, 
          message: `Added ${player.name} to ${isBench ? 'bench' : position}`,
          rosterPlayer 
        });
      }
      
      // If no position specified, use smart assignment logic
      
      // Count players by position in starting lineup
      const positionCounts = {
        "PG": starters.filter(p => p.position === "PG").length,
        "SG": starters.filter(p => p.position === "SG").length,
        "SF": starters.filter(p => p.position === "SF").length,
        "PF": starters.filter(p => p.position === "PF").length,
        "C-1": starters.filter(p => p.position === "C-1").length,
        "C-2": starters.filter(p => p.position === "C-2").length,
        "G": starters.filter(p => p.position === "G").length,
        "F": starters.filter(p => p.position === "F").length,
        "Util-1": starters.filter(p => p.position === "Util-1").length,
        "Util-2": starters.filter(p => p.position === "Util-2").length,
      };
  
      // Get the player's positions and positionGroup from database
      const playerPositions = player.positions || [];
      const playerPositionGroups = player.positionGroup || [];
      
      console.log(`Player ${player.name} has positions: ${playerPositions.join(', ')}`);
      console.log(`Player ${player.name} has position groups: ${playerPositionGroups.join(', ')}`);
      
      // Smart position assignment logic with priority order
      let assignedPosition = "";
      let isBenchAssigned = false;
      
      // Check if starting lineup is full (10 players maximum)
      if (starters.length >= 10) {
        // If starting lineup is full, try to add to bench
        if (bench.length >= 5) {
          return res.status(400).json({ error: "Both starting lineup and bench are full" });
        }
        assignedPosition = "Bench";
        isBenchAssigned = true;
      } else {
        // Priority 1: Traditional positions first using specific positions
        
        // For Point Guard (PG)
        if (playerPositions.includes("PG") && positionCounts["PG"] === 0) {
          assignedPosition = "PG";
        } 
        // For Shooting Guard (SG)
        else if (playerPositions.includes("SG") && positionCounts["SG"] === 0) {
          assignedPosition = "SG";
        } 
        // For Small Forward (SF)
        else if (playerPositions.includes("SF") && positionCounts["SF"] === 0) {
          assignedPosition = "SF";
        } 
        // For Power Forward (PF)
        else if (playerPositions.includes("PF") && positionCounts["PF"] === 0) {
          assignedPosition = "PF";
        } 
        // For Center (C) - we have two center slots
        else if (playerPositions.includes("C") && positionCounts["C-1"] === 0) {
          assignedPosition = "C-1";
        } 
        else if (playerPositions.includes("C") && positionCounts["C-2"] === 0) {
          assignedPosition = "C-2";
        } 
        
        // Priority 2: Generic position slots (G/F) using positionGroup
        else if (playerPositionGroups.includes("G") && positionCounts["G"] === 0) {
          assignedPosition = "G";
        } 
        else if (playerPositionGroups.includes("F") && positionCounts["F"] === 0) {
          assignedPosition = "F";
        }
        // Handle hybrid positions for G/F slots
        else if (playerPositionGroups.includes("G-F") && positionCounts["G"] === 0) {
          assignedPosition = "G";
        }
        else if (playerPositionGroups.includes("G-F") && positionCounts["F"] === 0) {
          assignedPosition = "F";
        }
        else if (playerPositionGroups.includes("F-C") && positionCounts["F"] === 0) {
          assignedPosition = "F";
        }
        
        // Priority 3: Utility slots
        else if (positionCounts["Util-1"] === 0) {
          assignedPosition = "Util-1";
        } 
        else if (positionCounts["Util-2"] === 0) {
          assignedPosition = "Util-2";
        } 
        
        // If no slots available, try bench
        else {
          if (bench.length >= 5) {
            return res.status(400).json({ error: "No available roster slots for this player" });
          }
          assignedPosition = "Bench";
          isBenchAssigned = true;
        }
      }
      
      console.log(`Assigning ${player.name} to position: ${assignedPosition}, isBench: ${isBenchAssigned}`);
      
      // Create exactly ONE roster player entry
      const rosterPlayer = await prisma.rosterPlayer.create({
        data: {
          rosterId: roster.id,
          playerId: parseInt(playerId),
          position: assignedPosition,
          isBench: isBenchAssigned
        },
        include: { player: true }
      });
      
      res.json({ 
        success: true, 
        message: `Added ${player.name} to ${isBenchAssigned ? 'bench' : assignedPosition}`,
        rosterPlayer 
      });
    } catch (error) {
      console.error("Error adding player to roster:", error);
      res.status(500).json({ error: "Failed to add player to roster" });
    }
  });
  
  // Helper function to check if a position is valid for a player
  function isPositionValidForPlayer(player, position) {
    const playerPositions = player.positions || [];
    
    // Map roster positions to player positions
    if (position === "PG" && playerPositions.includes("PG")) return true;
    if (position === "SG" && playerPositions.includes("SG")) return true;
    if (position === "SF" && playerPositions.includes("SF")) return true;
    if (position === "PF" && playerPositions.includes("PF")) return true;
    if (position === "C-1" && playerPositions.includes("C")) return true;
    if (position === "C-2" && playerPositions.includes("C")) return true;
    
    // Generic positions
    if (position === "G" && (playerPositions.includes("PG") || playerPositions.includes("SG"))) return true;
    if (position === "F" && (playerPositions.includes("SF") || playerPositions.includes("PF"))) return true;
    
    // Utility spots can be played by anyone
    if (position === "Util-1" || position === "Util-2") return true;
    
    // Bench can be anyone
    if (position === "Bench") return true;
    
    return false;
  }
   

  app.post('/api/roster/moveToBench', async (req, res) => {
    try {
      const { userId, playerId } = req.body;
  
      // Find the roster
      const roster = await prisma.roster.findFirst({
        where: { userId: parseInt(userId) },
        include: { players: true }
      });
  
      if (!roster) {
        return res.status(404).json({ error: "Roster not found" });
      }
  
      // Find the player in the roster
      const rosterPlayer = roster.players.find(rp => rp.playerId === parseInt(playerId) && !rp.isBench);
  
      if (!rosterPlayer) {
        return res.status(404).json({ error: "Player not found in starting lineup" });
      }
  
      // Check if the bench is full
      const benchPlayers = roster.players.filter(p => p.isBench);
      if (benchPlayers.length >= 5) {
        return res.status(400).json({ error: "Bench is full" });
      }
  
      // Update the player's position to bench
      const updatedPlayer = await prisma.rosterPlayer.update({
        where: { id: rosterPlayer.id },
        data: {
          position: "Bench",
          isBench: true
        }
      });
  
      res.json({ success: true, message: "Player moved to bench", updatedPlayer });
    } catch (error) {
      console.error("Error moving player to bench:", error);
      res.status(500).json({ error: "Failed to move player to bench" });
    }
  });

  app.delete('/api/roster/removePlayer', authenticate, async (req, res) => {
    try {
      // Use authenticated user ID if available, fallback to request body
      const userId = req.user?.id || parseInt(req.body.userId);
      const { playerId } = req.body;
      
      // Replace all req.body.userId with userId in the function
      
      // Find the roster
      const roster = await prisma.roster.findFirst({
        where: { userId: parseInt(userId) }
      });
      
      if (!roster) {
        return res.status(404).json({ error: "Roster not found" });
      }
      
      // Find all roster player entries for this player
      const rosterPlayers = await prisma.rosterPlayer.findMany({
        where: {
          rosterId: roster.id,
          playerId: parseInt(playerId)
        },
        include: { player: true }
      });
      
      if (rosterPlayers.length === 0) {
        return res.status(404).json({ error: "Player not on roster" });
      }
      
      // Get player name before deleting
      const playerName = rosterPlayers[0].player.name;
      
      // Delete ALL roster player entries for this player
      // This ensures we remove them from both starting lineup and bench if they appear in both
      for (const rp of rosterPlayers) {
        await prisma.rosterPlayer.delete({
          where: { id: rp.id }
        });
      }
      
      res.json({ 
        success: true,
        message: `${playerName} has been dropped from your roster`,
        playerId: parseInt(playerId)
      });
    } catch (error) {
      console.error("Error removing player from roster:", error);
      res.status(500).json({ error: "Failed to remove player from roster" });
    }
  });

app.post('/api/roster/movePlayer', authenticate, async (req, res) => {
  try {
    const { userId, playerId, newPosition } = req.body;

    // Find the roster
    const roster = await prisma.roster.findFirst({
      where: { userId: parseInt(userId) },
      include: { players: true },
    });

    if (!roster) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    // Find the player in the roster
    const rosterPlayer = roster.players.find((rp) => rp.playerId === parseInt(playerId));

    if (!rosterPlayer) {
      return res.status(404).json({ error: 'Player not found on roster' });
    }

    // Check if the new position is already occupied
    const positionOccupied = roster.players.some(
      (rp) => rp.position === newPosition && !rp.isBench
    );

    if (positionOccupied) {
      return res.status(400).json({ error: 'Position already occupied' });
    }

    // Update the player's position
    const updatedPlayer = await prisma.rosterPlayer.update({
      where: { id: rosterPlayer.id },
      data: {
        position: newPosition,
        isBench: false, // Ensure the player is marked as not on the bench
      },
    });

    res.json({ success: true, message: `Player moved to ${newPosition}`, updatedPlayer });
  } catch (error) {
    console.error('Error moving player:', error);
    res.status(500).json({ error: 'Failed to move player' });
  }
});

  app.get('/api/roster/:userId/livePoints', authenticate, async (req, res) => {
    try {
      // Use authenticated user ID if available, fallback to path parameter
      const userId = req.user?.id || parseInt(req.params.userId);
      
      // Replace parseInt(req.params.userId) with userId throughout the function
      
      // Get all players on the roster
      const roster = await prisma.roster.findFirst({
        where: { userId },
        include: { 
          players: {
            include: { player: true }
          }
        }
      });
      
      if (!roster) {
        return res.status(404).json({ error: "Roster not found" });
      }
      
      // Array to hold live fantasy points updates
      const liveUpdates = [];
      
      // Check for live games for each player
      for (const rosterPlayer of roster.players) {
        const player = rosterPlayer.player;
        
        // Call Python script to get live data
        const playerName = player.name;
        try {
          const command = `python player_collection.py live_stats "${playerName}"`;
          const { stdout } = await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
              if (error) reject(error);
              else resolve({ stdout, stderr });
            });
          });
          
          const liveData = JSON.parse(stdout);
          
          // Calculate fantasy points based on live stats
          if (liveData && !liveData.error && liveData.stats) {
            const stats = liveData.stats;
            // Fantasy points calculation (adjust formula if needed)
            const fantasyPoints = 
              (stats.points || 0) + 
              (stats.rebounds || 0) * 1.2 + 
              (stats.assists || 0) * 1.5 + 
              (stats.steals || 0) * 2 + 
              (stats.blocks || 0) * 2 - 
              (stats.turnovers || 0) * 0.5;
            
            // Add to updates array
            liveUpdates.push({
              playerId: player.id,
              liveFanPts: fantasyPoints.toFixed(1),
              isLive: stats.game_in_progress === "Yes"
            });
            
            // Optionally, store this in the database
            if (stats.game_in_progress === "Yes") {
              await prisma.playerStats.updateMany({
                where: { 
                  playerId: player.id,
                  game_in_progress: true
                },
                data: {
                  fantasyPoints: fantasyPoints
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching live stats for ${playerName}:`, error);
        }
      }
      
      res.json({ liveUpdates });
    } catch (error) {
      console.error("Error fetching live points:", error);
      res.status(500).json({ error: "Failed to get live fantasy points" });
    }
  });

// Get user's team name
app.get('/api/user/teamName', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    res.json({ teamName: user.teamName || "" });
  } catch (error) {
    console.error("Error fetching team name:", error);
    res.status(500).json({ error: "Failed to fetch team name" });
  }
});

// Update user's team name
app.post('/api/user/updateTeamName', authenticate, async (req, res) => {
  const { teamName } = req.body;
  
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { teamName }
    });
    
    res.json({ message: "Team name updated successfully" });
  } catch (error) {
    console.error("Error updating team name:", error);
    res.status(500).json({ error: "Failed to update team name" });
  }
});
// Create a new league
app.post('/api/leagues/create', authenticate, async (req, res) => {
  try {
    const { name, maxTeams, scoringFormat, draftType, isPrivate } = req.body;
    const userId = req.user.id;
    
    // Create league with current user as commissioner
    const league = await prisma.league.create({
      data: {
        name,
        commissionerId: userId.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        scoringFormat: scoringFormat || 'Standard',
        maxTeams: maxTeams || 10,
        draftType: draftType || 'Snake',
        isPrivate: isPrivate !== undefined ? isPrivate : true,
        waiverType: 'Standard',
        // Add the commissioner as the first user
        users: {
          connect: { id: userId }
        }
      }
    });
    
    // Create initial league players pool - this would normally populate with NBA players
    // You already have code that fetches players, so we'd use that
    
    res.status(201).json({ 
      success: true, 
      message: 'League created successfully', 
      league 
    });
  } catch (error) {
    console.error("Error creating league:", error);
    res.status(500).json({ error: "Failed to create league" });
  }
});

// Join a league
app.post('/api/leagues/join', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.body;
    const userId = req.user.id;
    
    // Find the league
    const league = await prisma.league.findUnique({
      where: { id: parseInt(leagueId) },
      include: { users: true }
    });
    
    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }
    
    // Check if league is full
    if (league.users.length >= league.maxTeams) {
      return res.status(400).json({ error: "League is full" });
    }
    
    // Check if user is already in the league
    if (league.users.some(user => user.id === userId)) {
      return res.status(400).json({ error: "You are already in this league" });
    }
    
    // Add user to league
    await prisma.league.update({
      where: { id: parseInt(leagueId) },
      data: {
        users: {
          connect: { id: userId }
        }
      }
    });
    
    res.json({ success: true, message: 'Successfully joined league' });
  } catch (error) {
    console.error("Error joining league:", error);
    res.status(500).json({ error: "Failed to join league" });
  }
});

// Get all leagues
app.get('/api/leagues', async (req, res) => {
  try {
    const leagues = await prisma.league.findMany({
      include: {
        users: true
      }
    });
    
    res.json(leagues);
  } catch (error) {
    console.error("Error fetching leagues:", error);
    res.status(500).json({ error: "Failed to fetch leagues" });
  }
});

// Get leagues for current user - FIXED
app.get('/api/leagues/user', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Use a more direct query to get all leagues where the user is a member
    const leagues = await prisma.league.findMany({
      where: {
        users: {
          some: {
            id: userId
          }
        }
      },
      include: {
        users: true
      }
    });
    
    res.json(leagues);
  } catch (error) {
    console.error("Error fetching user leagues:", error);
    res.status(500).json({ error: "Failed to fetch user leagues" });
  }
});

// Get a specific league
app.get('/api/leagues/:leagueId', async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            teamName: true
          }
        }
      }
    });
    
    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }
    
    res.json(league);
  } catch (error) {
    console.error("Error fetching league:", error);
    res.status(500).json({ error: "Failed to fetch league" });
  }
});

// Update league settings (commissioner only)
app.put('/api/leagues/:leagueId', authenticate, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    const userId = req.user.id;
    const { name, maxTeams, scoringFormat, draftType, isPrivate, draftDate } = req.body;
    
    // Check if user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });
    
    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }
    
    if (league.commissionerId !== userId.toString()) {
      return res.status(403).json({ error: "Only commissioner can update league settings" });
    }
    
    // Update league
    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: {
        name: name || league.name,
        maxTeams: maxTeams || league.maxTeams,
        scoringFormat: scoringFormat || league.scoringFormat,
        draftType: draftType || league.draftType,
        isPrivate: isPrivate !== undefined ? isPrivate : league.isPrivate,
        draftDate: draftDate ? new Date(draftDate) : league.draftDate,
        updatedAt: new Date()
      }
    });
    
    res.json({ success: true, message: 'League updated successfully', league: updatedLeague });
  } catch (error) {
    console.error("Error updating league:", error);
    res.status(500).json({ error: "Failed to update league" });
  }
});

// Leave a league
app.post('/api/leagues/leave', authenticate, async (req, res) => {
  try {
    const { leagueId } = req.body;
    const userId = req.user.id;
    
    // Find the league
    const league = await prisma.league.findUnique({
      where: { id: parseInt(leagueId) },
      include: { users: true }
    });
    
    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }
    
    // Check if user is in the league
    if (!league.users.some(user => user.id === userId)) {
      return res.status(400).json({ error: "You are not a member of this league" });
    }
    
    // Prevent commissioner from leaving (they must transfer ownership first)
    if (league.commissionerId === userId.toString()) {
      return res.status(400).json({ 
        error: "As the commissioner, you cannot leave the league. Please transfer commissioner rights to another user first." 
      });
    }
    
    // Remove user from league
    await prisma.league.update({
      where: { id: parseInt(leagueId) },
      data: {
        users: {
          disconnect: { id: userId }
        }
      }
    });
    
    res.json({ success: true, message: 'Successfully left league' });
  } catch (error) {
    console.error("Error leaving league:", error);
    res.status(500).json({ error: "Failed to leave league" });
  }
});


//Update player name
app.post('/api/user/updateUserName', authenticate, async (req, res) => {
  const { name } = req.body;
  
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { name }
    });
    
    res.json({ message: "Username updated successfully" });
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({ error: "Failed to update username" });
  }
});

app.get('/api/user/getUserName', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    res.json({ name: user.name || "" });
  } catch (error) {
    console.error("Error fetching name:", error);
    res.status(500).json({ error: "Failed to fetch name" });
  }
});

app.get('/api/roster/:userId/playerNames', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || parseInt(req.params.userId);

    const roster = await prisma.roster.findFirst({
      where: { userId },
      include: {
        players: {
          include: {
            player: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!roster) {
      return res.status(404).json({ error: "Roster not found" });
    }

    // Extract player names
    const playerNames = roster.players.map((rosterPlayer) => ({
      id: rosterPlayer.player.id,
      name: rosterPlayer.player.name
    }));

    const playerTeams = roster.players.map((rosterPlayer) => ({
      id: rosterPlayer.player.id,
      team: rosterPlayer.player.team
    }));

    res.json({ playerNames });
  } catch (error) {
    console.error("Error fetching player names:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get('/api/roster/:userId/playerTeams', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || parseInt(req.params.userId);

    const roster = await prisma.roster.findFirst({
      where: { userId },
      include: {
        players: {
          include: {
            player: {
              select: {
                id: true,
                team: true
              }
            }
          }
        }
      }
    });

    if (!roster) {
      return res.status(404).json({ error: "Roster not found" });
    }

    // Extract player teams

    const playerTeams = roster.players.map((rosterPlayer) => ({
      id: rosterPlayer.player.id,
      team: rosterPlayer.player.team
    }));

    res.json({ playerTeams });
  } catch (error) {
    console.error("Error fetching player teams:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Set up or update draft settings
app.post('/api/leagues/:leagueId/draft/setup', authenticate, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    const userId = req.user.id;
    const { draftDate, timePerPick, draftOrder, draftOrderList, allowDraftPickTrading } = req.body;
    
    // Check if user is commissioner
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });
    
    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }
    
    if (league.commissionerId !== userId.toString()) {
      return res.status(403).json({ error: "Only the commissioner can set up the draft" });
    }
    
    // Validate draft date
    if (draftDate) {
      const draftDateObj = new Date(draftDate);
      const now = new Date();
      
      if (draftDateObj < now) {
        return res.status(400).json({ error: "Draft date cannot be in the past" });
      }
    }
    
    // Create or update draft settings
    let draft = await prisma.draft.findUnique({
      where: { leagueId }
    });
    
    const draftData = {
      draftDate: draftDate ? new Date(draftDate) : null,
      timePerPick: parseInt(timePerPick) || 90,
      allowDraftPickTrading: allowDraftPickTrading === true,
    };
    
    // If draft order is manual and we have an order list, save it
    if (draftOrder === 'manual' && draftOrderList && draftOrderList.length > 0) {
      draftData.draftOrderType = 'MANUAL';
      draftData.manualDraftOrder = draftOrderList;
    } else {
      draftData.draftOrderType = 'RANDOM';
      draftData.manualDraftOrder = [];
    }
    
    if (draft) {
      // Update existing draft
      draft = await prisma.draft.update({
        where: { id: draft.id },
        data: draftData
      });
    } else {
      // Create new draft
      draft = await prisma.draft.create({
        data: {
          ...draftData,
          leagueId,
          status: 'NOT_STARTED'
        }
      });
    }
    
    // Update league with draft date
    await prisma.league.update({
      where: { id: leagueId },
      data: {
        draftDate: draftDate ? new Date(draftDate) : null
      }
    });
    
    res.json({ success: true, draft });
  } catch (error) {
    console.error("Error setting up draft:", error);
    res.status(500).json({ error: "Failed to set up draft" });
  }
});

// Get draft status and info
app.get('/api/leagues/:leagueId/draft', authenticate, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    
    // Get draft info
    let draft = await prisma.draft.findUnique({
      where: { leagueId },
      include: {
        picks: {
          orderBy: { pickNumber: 'asc' },
          include: { player: true }
        }
      }
    });
    
    // If no draft exists yet, return default state
    if (!draft) {
      return res.json({
        status: 'not_started',
        currentRound: 0,
        currentPick: 0,
        currentTeam: null,
        pickTimeRemaining: 0,
        draftOrder: [],
        picks: []
      });
    }
    
    // Get league teams
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { users: true }
    });
    
    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }
    
    // Format draft data for frontend
    const formattedDraft = {
      status: draft.status === 'IN_PROGRESS' ? 'in_progress' : 
              draft.status === 'COMPLETED' ? 'completed' : 'not_started',
      currentRound: draft.currentRound || 0,
      currentPick: draft.currentPickInRound || 0,
      pickTimeRemaining: draft.pickTimeRemaining || draft.timePerPick || 90,
      picks: draft.picks.map(pick => ({
        pickNumber: pick.pickNumber,
        round: pick.round,
        pickInRound: pick.pickInRound,
        teamId: pick.userId,
        teamName: league.users.find(u => u.id === pick.userId)?.teamName || 
                 `Team ${league.users.find(u => u.id === pick.userId)?.name || 'Unknown'}`,
        playerId: pick.playerId,
        playerName: pick.player.name,
        timestamp: pick.timestamp
      }))
    };
    
    // Calculate draft order if in progress or completed
    if (draft.status !== 'NOT_STARTED') {
      // Get the draft order
      let draftOrder = [];
      
      if (draft.draftOrderType === 'MANUAL' && draft.manualDraftOrder && draft.manualDraftOrder.length > 0) {
        // Use manual draft order
        draftOrder = draft.manualDraftOrder.map(userId => {
          const user = league.users.find(u => u.id === userId);
          return {
            userId,
            teamName: user?.teamName || `Team ${user?.name || 'Unknown'}`
          };
        });
      } else {
        // For random order, get the order from the first round picks
        const firstRoundPicks = draft.picks.filter(pick => pick.round === 1);
        draftOrder = firstRoundPicks.map(pick => {
          const user = league.users.find(u => u.id === pick.userId);
          return {
            userId: pick.userId,
            teamName: user?.teamName || `Team ${user?.name || 'Unknown'}`
          };
        });
      }
      
      formattedDraft.draftOrder = draftOrder;
      
      // Set current team if draft is in progress
      if (draft.status === 'IN_PROGRESS') {
        // In a snake draft, odd-numbered rounds go in order, even-numbered rounds go in reverse
        let currentIndex;
        if (draft.currentRound % 2 === 1) {
          // Odd round - normal order
          currentIndex = draft.currentPickInRound - 1;
        } else {
          // Even round - reverse order
          currentIndex = draftOrder.length - draft.currentPickInRound;
        }
        
        formattedDraft.currentTeam = draftOrder[currentIndex];
      }
    } else {
      formattedDraft.draftOrder = [];
    }
    
    res.json(formattedDraft);
  } catch (error) {
    console.error("Error getting draft info:", error);
    res.status(500).json({ error: "Failed to get draft info" });
  }
});

// Start the draft
app.post('/api/leagues/:leagueId/draft/start', authenticate, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    const userId = req.user.id;
    
    console.log(`Starting draft for league ${leagueId} by user ${userId}`);
    
    // Check if user is commissioner
    let league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { users: true }
    });
    
    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }
    
    if (league.commissionerId !== userId.toString()) {
      return res.status(403).json({ error: "Only the commissioner can start the draft" });
    }
    
    // Get draft record
    let draft = await prisma.draft.findUnique({ 
      where: { leagueId },
      include: { picks: true }
    });
    
    if (!draft) {
      return res.status(400).json({ error: "Draft has not been set up yet" });
    }
    
    if (draft.status === 'IN_PROGRESS') {
      return res.status(400).json({ error: "Draft is already in progress" });
    }
    
    if (draft.status === 'COMPLETED') {
      return res.status(400).json({ error: "Draft is already completed" });
    }
    
    // Reset any existing picks that might have been created accidentally
    if (draft.picks && draft.picks.length > 0) {
      console.log(`Clearing ${draft.picks.length} existing picks before starting draft`);
      await prisma.draftPick.deleteMany({
        where: { draftId: draft.id }
      });
    }
    
    // Make sure the league has the correct number of teams by adding bots if needed
    if (league.users.length < league.maxTeams) {
      console.log(`Adding ${league.maxTeams - league.users.length} bots to league ${leagueId}`);
      const botsNeeded = league.maxTeams - league.users.length;
      
      for (let i = 1; i <= botsNeeded; i++) {
        const botName = `Bot${i}`;
        const botEmail = `bot${i}_league${leagueId}@bot.com`;
        
        // First check if this bot already exists
        let botUser = await prisma.user.findFirst({
          where: { email: botEmail }
        });
        
        if (!botUser) {
          // Create new bot user with hashed password
          const dummyPassword = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);
          
          botUser = await prisma.user.create({
            data: {
              name: botName,
              email: botEmail,
              password: dummyPassword,
              teamName: `Bot Team ${i}`,
              createdAt: new Date()
            }
          });
          
          console.log(`Created bot user ${botName} with ID ${botUser.id}`);
        } else {
          console.log(`Bot user ${botName} already exists with ID ${botUser.id}`);
        }
        
        // Check if this bot is already connected to the league
        const botInLeague = await prisma.league.findFirst({
          where: { 
            id: leagueId,
            users: {
              some: { id: botUser.id }
            }
          }
        });
        
        if (!botInLeague) {
          // Connect the bot to the league
          await prisma.league.update({
            where: { id: leagueId },
            data: {
              users: {
                connect: { id: botUser.id }
              }
            }
          });
          
          console.log(`Connected bot ${botName} (ID: ${botUser.id}) to league ${leagueId}`);
        }
      }
      
      // Reload league with newly added bots
      league = await prisma.league.findUnique({
        where: { id: leagueId },
        include: { users: true }
      });
      
      console.log(`League now has ${league.users.length} users`);
    }
    
    // Generate draft order based on settings
    let draftOrder = [];
    
    if (draft.draftOrderType === 'MANUAL' && draft.manualDraftOrder && draft.manualDraftOrder.length > 0) {
      // Use provided manual draft order
      draftOrder = draft.manualDraftOrder;
    } else {
      // Randomize order for all teams (including bots)
      const userIds = league.users.map(u => u.id);
      
      // Shuffle user IDs
      for (let i = userIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [userIds[i], userIds[j]] = [userIds[j], userIds[i]];
      }
      
      draftOrder = userIds;
    }
    
    console.log(`Draft order: ${JSON.stringify(draftOrder)}`);
    
    // Update draft
    draft = await prisma.draft.update({
      where: { id: draft.id },
      data: {
        status: 'IN_PROGRESS',
        currentRound: 1,
        currentPickInRound: 1,
        pickTimeRemaining: draft.timePerPick || 90,
        draftOrder: draftOrder
      }
    });
    
    // Broadcast draft started
    io.to(`draft-${leagueId}`).emit('draft-started', {
      draftId: draft.id,
      status: 'in_progress',
      draftOrder: draftOrder.map(userId => {
        const user = league.users.find(u => u.id === userId);
        return {
          userId,
          teamName: user?.teamName || `Team ${user?.name || 'Unknown'}`
        };
      })
    });
    
    // Start the timer for the first pick
    startDraftTimer(leagueId, draft.id);
    
    // IMPORTANT: Don't trigger auto-pick right away for the first user, even if it's a bot
    // We'll let the timer handle triggering auto-pick for bots
    
    return res.json({ 
      success: true, 
      draft,
      message: "Draft started successfully" 
    });
  } catch (error) {
    console.error("Error starting draft:", error);
    return res.status(500).json({ error: `Failed to start draft: ${error.message}` });
  }
});

// Make a draft pick
app.post('/api/leagues/:leagueId/draft/pick', authenticate, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    const userId = req.user.id;
    const { playerId } = req.body;
    
    console.log(`User ${userId} attempting to draft player ${playerId} for league ${leagueId}`);
    
    if (!playerId) {
      return res.status(400).json({ error: "Player ID is required" });
    }
    
    // Get current draft state
    const draft = await prisma.draft.findUnique({ 
      where: { leagueId },
      include: { picks: true }
    });
    
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    if (draft.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: "Draft is not in progress" });
    }
    
    // Determine whose turn it is
    const draftOrder = draft.draftOrder;
    
    if (!draftOrder || draftOrder.length === 0) {
      return res.status(400).json({ error: "Draft order not established" });
    }
    
    let currentTeamIndex;
    if (draft.currentRound % 2 === 1) {
      // Odd round: normal order
      currentTeamIndex = draft.currentPickInRound - 1;
    } else {
      // Even round: reverse order
      currentTeamIndex = draftOrder.length - draft.currentPickInRound;
    }
    
    if (currentTeamIndex < 0 || currentTeamIndex >= draftOrder.length) {
      return res.status(400).json({ error: "Invalid draft position" });
    }
    
    const currentTeamId = draftOrder[currentTeamIndex];
    
    console.log(`Current team to pick: ${currentTeamId}, requesting user: ${userId}`);
    
    // Check if it's this user's turn
    if (currentTeamId !== userId) {
      return res.status(403).json({ error: "It's not your turn to pick" });
    }
    
    // Check if player is already drafted
    const existingPick = draft.picks.find(pick => pick.playerId === parseInt(playerId));
    
    if (existingPick) {
      return res.status(400).json({ error: "This player has already been drafted" });
    }
    
    // Fetch the player
    const player = await prisma.player.findUnique({
      where: { id: parseInt(playerId) }
    });
    
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    
    // Create the pick - NOTE: Check for existing pick with same pickNumber first
    const totalPicks = (draft.currentRound - 1) * draftOrder.length + draft.currentPickInRound;
    
    // Check if a pick with this pick number already exists
    const existingPickNumber = await prisma.draftPick.findUnique({
      where: {
        draftId_pickNumber: {
          draftId: draft.id,
          pickNumber: totalPicks
        }
      }
    });
    
    if (existingPickNumber) {
      return res.status(409).json({ error: "This pick number has already been used" });
    }
    
    const pick = await prisma.draftPick.create({
      data: {
        draftId: draft.id,
        userId,
        playerId: parseInt(playerId),
        round: draft.currentRound,
        pickInRound: draft.currentPickInRound,
        pickNumber: totalPicks,
        timestamp: new Date()
      }
    });
    
    // Find or create team roster for this league
    let teamRoster = await prisma.roster.findFirst({
      where: { 
        userId,
        leagueId: parseInt(leagueId) // Make sure we get the league-specific roster
      }
    });
    
    if (!teamRoster) {
      // Create a new roster for this user in this league
      teamRoster = await prisma.roster.create({
        data: {
          userId,
          leagueId: parseInt(leagueId),
          teamName: `Team ${userId}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Add player to roster
    await prisma.rosterPlayer.create({
      data: {
        rosterId: teamRoster.id,
        playerId: parseInt(playerId),
        position: player.positions?.[0] || "Bench",
        isBench: true,
        createdAt: new Date()
      }
    });
    
    // Move to next pick
    let nextRound = draft.currentRound;
    let nextPickInRound = draft.currentPickInRound + 1;
    let nextStatus = 'IN_PROGRESS';
    
    // Check if we've reached the end of the round
    if (nextPickInRound > draftOrder.length) {
      nextRound += 1;
      nextPickInRound = 1;
      
      // Check if we've completed all rounds
      if (nextRound > 15) {
        nextStatus = 'COMPLETED';
      }
    }
    
    // Update draft state
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        currentRound: nextRound,
        currentPickInRound: nextPickInRound,
        pickTimeRemaining: draft.timePerPick,
        status: nextStatus
      }
    });
    
    // Get team info
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { users: true }
    });
    
    const pickingUser = league.users.find(u => u.id === userId);
    
    // Broadcast pick
    io.to(`draft-${leagueId}`).emit('pick-made', {
      pickNumber: totalPicks,
      round: draft.currentRound,
      pickInRound: draft.currentPickInRound,
      teamId: userId,
      teamName: pickingUser?.teamName || `Team ${pickingUser?.name || 'Unknown'}`,
      playerId: parseInt(playerId),
      playerName: player.name,
      timestamp: new Date()
    });
    
    // Check if next team is a bot
    if (nextStatus === 'IN_PROGRESS') {
      let nextTeamIndex;
      if (nextRound % 2 === 1) {
        nextTeamIndex = nextPickInRound - 1;
      } else {
        nextTeamIndex = draftOrder.length - nextPickInRound;
      }
      
      const nextTeamId = draftOrder[nextTeamIndex];
      const nextTeamUser = league.users.find(u => u.id === nextTeamId);
      
      if (nextTeamUser && nextTeamUser.email?.endsWith('@bot.com')) {
        // Auto-pick for bot after small delay
        setTimeout(() => {
          handleAutoPick(leagueId, draft.id);
        }, 2000);
      } else {
        // Start timer for next pick
        startDraftTimer(leagueId, draft.id);
      }
    } else if (nextStatus === 'COMPLETED') {
      // Update league status
      await prisma.league.update({
        where: { id: leagueId },
        data: { draftCompleted: true }
      });
      
      // Broadcast completion
      io.to(`draft-${leagueId}`).emit('draft-completed');
    }
    
    return res.json({ 
      success: true,
      pick,
      message: `Successfully drafted ${player.name}`
    });
  } catch (error) {
    console.error("Error making draft pick:", error);
    return res.status(500).json({ error: `Failed to make draft pick: ${error.message}` });
  }
});

// Auto pick for a team
app.post('/api/leagues/:leagueId/draft/autopick', authenticate, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    const userId = req.user.id;
    
    // Get draft
    const draft = await prisma.draft.findUnique({
      where: { leagueId }
    });
    
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    if (draft.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: "Draft is not in progress" });
    }
    
    // Check if it's the user's turn
    const draftOrder = draft.draftOrder;
    
    let currentTeamIndex;
    if (draft.currentRound % 2 === 1) {
      // Odd round - normal order
      currentTeamIndex = draft.currentPickInRound - 1;
    } else {
      // Even round - reverse order
      currentTeamIndex = draftOrder.length - draft.currentPickInRound;
    }
    
    if (draftOrder[currentTeamIndex] !== userId) {
      return res.status(403).json({ error: "It's not your turn to pick" });
    }
    
    // Get already drafted players
    const draftedPlayers = await prisma.draftPick.findMany({
      where: { draftId: draft.id },
      select: { playerId: true }
    });
    
    const draftedPlayerIds = draftedPlayers.map(p => p.playerId);
    
    // Get best available player by rank
    const bestPlayer = await prisma.player.findFirst({
      where: {
        id: { notIn: draftedPlayerIds }
      },
      orderBy: { rank: 'asc' }
    });
    
    if (!bestPlayer) {
      return res.status(404).json({ error: "No available players found" });
    }
    
    // Make the pick using the existing endpoint
    req.body.playerId = bestPlayer.id;
    return await handleDraftPick(req, res);
  } catch (error) {
    console.error("Error making auto pick:", error);
    res.status(500).json({ error: "Failed to make auto pick" });
  }
});

// Get team rosters with drafted players
app.get('/api/leagues/:leagueId/teams', authenticate, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    
    // Get league with users
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { users: true }
    });
    
    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }
    
    // Get draft
    const draft = await prisma.draft.findUnique({
      where: { leagueId },
      include: {
        picks: {
          include: { player: true }
        }
      }
    });
    
    // Build team roster data
    const teams = [];
    
    for (const user of league.users) {
      // Get all picks by this user
      const userPicks = draft ? draft.picks.filter(pick => pick.userId === user.id) : [];
      
      // Map picks to players
      const players = userPicks.map(pick => ({
        id: pick.player.id,
        name: pick.player.name,
        team: pick.player.team,
        positions: pick.player.positions,
        pickRound: pick.round,
        pickNumber: pick.pickNumber
      }));
      
      teams.push({
        userId: user.id,
        name: user.name,
        teamName: user.teamName || `Team ${user.name}`,
        players
      });
    }
    
    res.json(teams);
  } catch (error) {
    console.error("Error getting team rosters:", error);
    res.status(500).json({ error: "Failed to get team rosters" });
  }
});

// ================= SOCKET.IO HANDLERS =================

// Initialize Socket.IO after the WebSocket server is set up
const io = new Server(wss.server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Set up Socket.IO event handlers
io.on("connection", (socket) => {
  console.log("New Socket.IO connection:", socket.id);
  
  // Join draft room
  socket.on('join-draft', ({ leagueId }) => {
    socket.join(`draft-${leagueId}`);
    console.log(`Socket ${socket.id} joined draft room for league ${leagueId}`);
  });
  
  // Leave draft room
  socket.on('leave-draft', ({ leagueId }) => {
    socket.leave(`draft-${leagueId}`);
    console.log(`Socket ${socket.id} left draft room for league ${leagueId}`);
  });
  
  socket.on('disconnect', () => {
    console.log("Socket disconnected:", socket.id);
  });
});



// Draft timer function
// Draft timer function
async function startDraftTimer(leagueId, draftId) {
  try {
    // Get current draft state
    const draft = await prisma.draft.findUnique({
      where: { id: draftId }
    });
    
    if (!draft || draft.status !== 'IN_PROGRESS') {
      console.log(`Timer not started: draft ${draftId} is not in progress`);
      return;
    }
    
    // Reset the timer to the full time
    await prisma.draft.update({
      where: { id: draftId },
      data: { pickTimeRemaining: draft.timePerPick || 90 }
    });
    
    // Broadcast draft update
    await broadcastDraftUpdate(leagueId);
    
    // Clear any existing timer for this league
    if (draftTimers[leagueId]) {
      clearInterval(draftTimers[leagueId]);
      delete draftTimers[leagueId];
    }
    
    // Check if it's a bot's turn
    const draftOrder = draft.draftOrder;
    
    if (!draftOrder || draftOrder.length === 0) return;
    
    let currentTeamIndex;
    if (draft.currentRound % 2 === 1) {
      // Odd round: normal order
      currentTeamIndex = draft.currentPickInRound - 1;
    } else {
      // Even round: reverse order
      currentTeamIndex = draftOrder.length - draft.currentPickInRound;
    }
    
    if (currentTeamIndex < 0 || currentTeamIndex >= draftOrder.length) return;
    
    const currentTeamId = draftOrder[currentTeamIndex];
    
    // Get league and user details
    const league = await prisma.league.findUnique({
      where: { id: parseInt(leagueId) },
      include: { users: true }
    });
    
    if (!league) return;
    
    const currentUser = league.users.find(u => u.id === currentTeamId);
    
    if (currentUser && currentUser.email?.endsWith('@bot.com')) {
      // It's a bot's turn, trigger auto-pick after a delay
      console.log(`Bot ${currentUser.name} is up. Triggering auto-pick...`);
      setTimeout(() => {
        handleAutoPick(leagueId, draftId);
      }, 3000);
      return;
    }
    
    // Start countdown timer for human player
    console.log(`Starting timer for league ${leagueId}, draft ${draftId}`);
    draftTimers[leagueId] = setInterval(async () => {
      try {
        // Get latest draft state
        const currentDraft = await prisma.draft.findUnique({
          where: { id: draftId }
        });
        
        if (!currentDraft || currentDraft.status !== 'IN_PROGRESS') {
          clearInterval(draftTimers[leagueId]);
          delete draftTimers[leagueId];
          return;
        }
        
        // Decrease remaining time
        const newTimeRemaining = Math.max(0, currentDraft.pickTimeRemaining - 1);
        
        // Update draft state
        await prisma.draft.update({
          where: { id: draftId },
          data: { pickTimeRemaining: newTimeRemaining }
        });
        
        // Broadcast updated timer
        await broadcastDraftUpdate(leagueId);
        
        // Auto-pick when timer reaches 0
        if (newTimeRemaining === 0) {
          clearInterval(draftTimers[leagueId]);
          delete draftTimers[leagueId];
          
          // Handle auto-pick after a short delay
          setTimeout(() => {
            handleAutoPick(leagueId, draftId);
          }, 1000);
        }
      } catch (error) {
        console.error("Error in draft timer interval:", error);
        clearInterval(draftTimers[leagueId]);
        delete draftTimers[leagueId];
      }
    }, 1000);
  } catch (error) {
    console.error("Error starting draft timer:", error);
  }
}

// Broadcast draft update
async function broadcastDraftUpdate(leagueId) {
  try {
    // Get latest draft state
    const draft = await prisma.draft.findUnique({
      where: { leagueId },
      include: {
        picks: {
          orderBy: { pickNumber: 'asc' },
          include: { player: true }
        }
      }
    });
    
    if (!draft) return;
    
    // Get league users
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { users: true }
    });
    
    if (!league) return;
    
    // Format draft data (similar to the GET endpoint)
    const formattedDraft = {
      status: draft.status === 'IN_PROGRESS' ? 'in_progress' : 
              draft.status === 'COMPLETED' ? 'completed' : 'not_started',
      currentRound: draft.currentRound || 0,
      currentPick: draft.currentPickInRound || 0,
      pickTimeRemaining: draft.pickTimeRemaining || draft.timePerPick || 90,
      picks: draft.picks.map(pick => ({
        pickNumber: pick.pickNumber,
        round: pick.round,
        pickInRound: pick.pickInRound,
        teamId: pick.userId,
        teamName: league.users.find(u => u.id === pick.userId)?.teamName || 
                 `Team ${league.users.find(u => u.id === pick.userId)?.name || 'Unknown'}`,
        playerId: pick.playerId,
        playerName: pick.player.name,
        timestamp: pick.timestamp
      }))
    };
    
    // Calculate draft order
    if (draft.status !== 'NOT_STARTED') {
      // Get the draft order
      let draftOrder = [];
      
      if (draft.draftOrderType === 'MANUAL' && draft.manualDraftOrder && draft.manualDraftOrder.length > 0) {
        // Use manual draft order
        draftOrder = draft.manualDraftOrder.map(userId => {
          const user = league.users.find(u => u.id === userId);
          return {
            userId,
            teamName: user?.teamName || `Team ${user?.name || 'Unknown'}`
          };
        });
      } else {
        // For random order, use the stored draft order
        draftOrder = draft.draftOrder.map(userId => {
          const user = league.users.find(u => u.id === userId);
          return {
            userId,
            teamName: user?.teamName || `Team ${user?.name || 'Unknown'}`
          };
        });
      }
      
      formattedDraft.draftOrder = draftOrder;
      
      // Set current team if draft is in progress
      if (draft.status === 'IN_PROGRESS') {
        // In a snake draft, odd-numbered rounds go in order, even-numbered rounds go in reverse
        let currentIndex;
        if (draft.currentRound % 2 === 1) {
          // Odd round - normal order
          currentIndex = draft.currentPickInRound - 1;
        } else {
          // Even round - reverse order
          currentIndex = draftOrder.length - draft.currentPickInRound;
        }
        
        formattedDraft.currentTeam = draftOrder[currentIndex];
      }
    } else {
      formattedDraft.draftOrder = [];
    }
    
    // Broadcast update
    io.to(`draft-${leagueId}`).emit('draft-update', formattedDraft);
  } catch (error) {
    console.error("Error broadcasting draft update:", error);
  }
}

// Handle auto pick when timer reaches 0
async function handleAutoPick(leagueId, draftId) {
  try {
    console.log(`Auto-picking for league ${leagueId}, draft ${draftId}`);
    
    // Get current draft state
    const draft = await prisma.draft.findUnique({
      where: { id: draftId },
      include: { picks: true }
    });
    
    if (!draft || draft.status !== 'IN_PROGRESS') {
      console.log("Cannot auto-pick: draft not in progress");
      return;
    }
    
    // Determine which team (userId) is up
    const draftOrder = draft.draftOrder;
    
    if (!draftOrder || draftOrder.length === 0) {
      console.log("Cannot auto-pick: draft order not established");
      return;
    }
    
    let currentTeamIndex;
    if (draft.currentRound % 2 === 1) {
      // Odd round - normal order
      currentTeamIndex = draft.currentPickInRound - 1;
    } else {
      // Even round - reverse order
      currentTeamIndex = draftOrder.length - draft.currentPickInRound;
    }
    
    if (currentTeamIndex < 0 || currentTeamIndex >= draftOrder.length) {
      console.log("Cannot auto-pick: invalid draft position");
      return;
    }
    
    const currentTeamId = draftOrder[currentTeamIndex];
    console.log(`Auto-picking for team ${currentTeamId} (index ${currentTeamIndex})`);
    
    // Find already drafted players
    const draftedPlayerIds = draft.picks.map(p => p.playerId);
    console.log(`${draftedPlayerIds.length} players already drafted`);
    
    // Get best available player by rank
    const bestPlayer = await prisma.player.findFirst({
      where: {
        id: { notIn: draftedPlayerIds.length > 0 ? draftedPlayerIds : [-1] }
      },
      orderBy: { rank: 'asc' }
    });
    
    if (!bestPlayer) {
      console.error("No available players found for auto-pick");
      return;
    }
    
    // Check for existing pick with same pickNumber
    const totalPicks = (draft.currentRound - 1) * draftOrder.length + draft.currentPickInRound;
    
    const existingPickNumber = await prisma.draftPick.findUnique({
      where: {
        draftId_pickNumber: {
          draftId: draft.id,
          pickNumber: totalPicks
        }
      }
    });
    
    if (existingPickNumber) {
      console.error(`Pick number ${totalPicks} already exists. Skipping duplicate pick.`);
      
      // Move to next pick
      let nextRound = draft.currentRound;
      let nextPickInRound = draft.currentPickInRound + 1;
      let nextStatus = 'IN_PROGRESS';
      
      // Check if we've reached the end of the round
      if (nextPickInRound > draftOrder.length) {
        nextRound += 1;
        nextPickInRound = 1;
        
        if (nextRound > 15) {
          nextStatus = 'COMPLETED';
        }
      }
      
      // Update draft state
      await prisma.draft.update({
        where: { id: draft.id },
        data: {
          currentRound: nextRound,
          currentPickInRound: nextPickInRound,
          pickTimeRemaining: draft.timePerPick,
          status: nextStatus
        }
      });
      
      // Start timer for next pick
      startDraftTimer(leagueId, draft.id);
      return;
    }
    
    // Create the pick
    const pick = await prisma.draftPick.create({
      data: {
        draftId: draft.id,
        userId: currentTeamId,
        playerId: bestPlayer.id,
        round: draft.currentRound,
        pickInRound: draft.currentPickInRound,
        pickNumber: totalPicks,
        timestamp: new Date()
      }
    });
    
    // Find or create roster for this team in this league
    let teamRoster = await prisma.roster.findFirst({
      where: { 
        userId: currentTeamId,
        leagueId: parseInt(leagueId)
      }
    });
    
    if (!teamRoster) {
      // Create a new roster for this team in this league
      teamRoster = await prisma.roster.create({
        data: {
          userId: currentTeamId,
          leagueId: parseInt(leagueId),
          teamName: `Team ${currentTeamId}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Add player to roster
    await prisma.rosterPlayer.create({
      data: {
        rosterId: teamRoster.id,
        playerId: bestPlayer.id,
        position: bestPlayer.positions?.[0] || "Bench",
        isBench: true,
        createdAt: new Date()
      }
    });
    
    // Move to next pick
    let nextRound = draft.currentRound;
    let nextPickInRound = draft.currentPickInRound + 1;
    let nextStatus = 'IN_PROGRESS';
    
    // Check if we've reached the end of the round
    if (nextPickInRound > draftOrder.length) {
      nextRound += 1;
      nextPickInRound = 1;
      
      if (nextRound > 15) {
        nextStatus = 'COMPLETED';
      }
    }
    
    // Update draft state
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        currentRound: nextRound,
        currentPickInRound: nextPickInRound,
        pickTimeRemaining: draft.timePerPick,
        status: nextStatus
      }
    });
    
    // Get league teams
    const league = await prisma.league.findUnique({
      where: { id: parseInt(leagueId) },
      include: { users: true }
    });
    
    const botUser = league.users.find(u => u.id === currentTeamId);
    
    // Broadcast pick
    io.to(`draft-${leagueId}`).emit('pick-made', {
      pickNumber: totalPicks,
      round: draft.currentRound,
      pickInRound: draft.currentPickInRound,
      teamId: currentTeamId,
      teamName: botUser?.teamName || `Team ${botUser?.name || 'Unknown'}`,
      playerId: bestPlayer.id,
      playerName: bestPlayer.name,
      timestamp: new Date()
    });
    
    // Check if draft completed
    if (nextStatus === 'COMPLETED') {
      // Update league status
      await prisma.league.update({
        where: { id: parseInt(leagueId) },
        data: { draftCompleted: true }
      });
      
      // Broadcast completion
      io.to(`draft-${leagueId}`).emit('draft-completed');
    } else {
      // Check if next team is a bot
      let nextTeamIndex;
      if (nextRound % 2 === 1) {
        nextTeamIndex = nextPickInRound - 1;
      } else {
        nextTeamIndex = draftOrder.length - nextPickInRound;
      }
      
      const nextTeamId = draftOrder[nextTeamIndex];
      const nextTeamUser = league.users.find(u => u.id === nextTeamId);
      
      if (nextTeamUser && nextTeamUser.email?.endsWith('@bot.com')) {
        // Auto-pick for bot after small delay
        setTimeout(() => {
          handleAutoPick(leagueId, draft.id);
        }, 2000);
      } else {
        // Start timer for next pick
        await broadcastDraftUpdate(leagueId);
        startDraftTimer(leagueId, draft.id);
      }
    }
  } catch (error) {
    console.error("Error handling auto-pick:", error);
  }
}

app.get('/api/players', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: { rank: 'asc' },
      take: 500
    });
    
    if (!players || players.length === 0) {
      console.error("No players found in database");
      return res.status(404).json({ error: "No players found" });
    }
    
    console.log(`Returning ${players.length} players`);
    res.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/api/players', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 500;
    const sortKey = req.query.sortKey || 'rank';
    const sortDirection = req.query.sortDirection || 'asc';
    
    const players = await prisma.player.findMany({
      take: limit,
      orderBy: { [sortKey]: sortDirection }
    });
    
    console.log(`Returning ${players.length} players`);
    res.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Draft debug endpoint
app.get('/api/leagues/:leagueId/draft/debug', authenticate, async (req, res) => {
  try {
    const leagueId = parseInt(req.params.leagueId);
    
    // Get league info
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { 
        users: true
      }
    });
    
    // Get draft info
    const draft = await prisma.draft.findUnique({
      where: { leagueId },
      include: {
        picks: true
      }
    });
    
    // Get player count
    const playerCount = await prisma.player.count();
    
    // Return debug info
    res.json({
      league: {
        id: league.id,
        name: league.name,
        userCount: league.users.length,
        maxTeams: league.maxTeams,
        users: league.users.map(u => ({ id: u.id, name: u.name, teamName: u.teamName }))
      },
      draft: draft ? {
        id: draft.id,
        status: draft.status,
        currentRound: draft.currentRound,
        currentPickInRound: draft.currentPickInRound,
        draftOrderType: draft.draftOrderType,
        draftOrderLength: draft.draftOrder?.length || 0,
        picksCount: draft.picks?.length || 0
      } : null,
      playerCount
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ error: error.message });
  }
});


