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

import { exec } from 'child_process';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { data } from 'react-router-dom';
import { create } from 'domain';

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = 5001;

app.use(cors());
app.use(express.json());

console.log("Available Prisma models:", Object.keys(prisma));


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
    const command = `python3 player_collection.py live_stats "${playerName}"`;

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
    const command = `python3 player_stats.py game_log "${playerName}" "${seasonArg}"`;


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

// tart server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

