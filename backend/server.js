import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { exec } from 'child_process';
import playerRoutes from './routes/players.js';
import authRoutes from './routes/auth.js';
import leagueRoutes from './routes/leagues.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/players', playerRoutes);

// Live Player Stats Route (Updated to Handle "Not Playing" Case)
app.post('/api/players/getLivePlayerStats', (req, res) => {
    const { playerName } = req.body;
    
    if (!playerName) {
        return res.status(400).json({ error: 'Player name is required' });
    }
    
    exec(`python3 scripts/player_collection.py "${playerName}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: `${playerName} is not playing right now.` });
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({ error: `${playerName} is not playing right now.` });
        }

        const data = JSON.parse(stdout);
        if (data.error) {
            return res.status(200).json({ message: `${playerName} is not playing right now.` });
        }

        res.json(data);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
