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
import { data } from 'react-router-dom';
import { create } from 'domain';

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = 5001;

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
  // Get origin port for cookie name
  const origin = req.headers.origin || '';
  const portMatch = origin.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : '';
  
  // Try port-specific cookie first, then fall back to default
  const cookieName = port ? `jwt_${port}` : 'jwt';
  const token = req.cookies[cookieName] || req.cookies.jwt;

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

      // Get the origin port from request headers
      const origin = req.headers.origin || '';
      const portMatch = origin.match(/:(\d+)$/);
      const port = portMatch ? portMatch[1] : '';
      
      // Set token as cookie with port-specific name
      const cookieName = port ? `jwt_${port}` : 'jwt';
      
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
          select: { id: true, name: true, email: true, createdAt: true}
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
  // Get origin port for cookie name
  const origin = req.headers.origin || '';
  const portMatch = origin.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : '';
  
  // Clear the port-specific cookie
  const cookieName = port ? `jwt_${port}` : 'jwt';
  
  res.clearCookie(cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
  });
  
  // Also clear the default cookie for compatibility
  res.clearCookie('jwt', {
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
// Endpoint to get players for a given league.
app.get('/api/leagues/:leagueId/players', async (req, res) => {
    try {
      const leagueId = Number(req.params.leagueId);
      // Fetch LeaguePlayer records and include the related Player data.
      const leaguePlayers = await prisma.leaguePlayer.findMany({
        where: { leagueId },
        include: { player: true },
      });
      // Map to extract the Player object (which now includes computed fields).
      const players = leaguePlayers.map(lp => lp.player);
      res.json(players);
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



