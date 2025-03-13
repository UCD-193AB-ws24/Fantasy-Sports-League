// import express from 'express';
// import cors from 'cors';
// import { exec } from 'child_process';

// const app = express();
// const PORT = 5001;
// const bcrypt = require('bcrypt');
// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();


// // Middleware
// app.use(cors());
// app.use(express.json());

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import crypto from 'crypto';
import { data } from 'react-router-dom';
import { create } from 'domain';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from "ws";
import session from 'express-session';
//Google OAuth
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';


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

app.use(express.json());
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

console.log("Available Prisma models:", Object.keys(prisma));

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

console.log(`WebSocket server running on ws://localhost:5002`);


passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:5001/auth/google/callback",  // Change this to your production URL when deploying
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Find or create a user in your database based on Google profile
                const existingUser = await prisma.user.findUnique({
                    where: { googleID: profile.id },
                });

                if (existingUser) {
                    return done(null, existingUser);
                }
                const dummyPassword = crypto.randomBytes(16).toString("hex");

                const user = await prisma.user.create({
                    data: {
                        googleID: profile.id,
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        password: dummyPassword,
                        createdAt: new Date(),
                    },
                });

                return done(null, user);
            } catch (error) {
                done(error, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id); // Store user ID in the session
});

passport.deserializeUser(async (id, done) => {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user); // Retrieve user details from the database
});

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']  // Define the permissions you need (profile and email)
}));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),  // Redirect on failure
    (req, res) => {
        const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
        // On successful login, redirect to your front-end
        res.redirect('http://localhost:5173/dashboard');  // Frontend URL
    }
);




const authenticate = async (req, res, next) => {
    const token = req.cookies.jwt;

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


app.put('/updateProfile', async (req, res) => {
    const { name, email } = req.body;

    try {
        const updatedUser = await prisma.user.update({
            where: { email}, // Assuming user is authenticated
            data: { name, email },
        });
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});



// User registration route
app.post('/register', async (req, res) => {
    const { name, password, email } = req.body;

    try {
        // Check if the user already exists
        // const existingUser = await prisma.user.findUnique({
        //     where: { email }
        // });

        // if (existingUser) {
        //     return res.status(400).json({ message: "Email already in use" });
        // }

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
                password: hashedPassword,
            }
        });
        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


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

        // Compare password before accessing it
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid name or password" });
        }

        // Now we can safely exclude 'password' from the response
        const { password: _, ...safeUser } = user; // Use 'password: _' to discard 'password'

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie('jwt', token, {
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
    res.clearCookie('jwt', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    res.json({ message: "Logged out successfully" });
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


process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit();
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

