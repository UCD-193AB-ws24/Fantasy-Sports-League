import express from "express";
import { exec } from "child_process";

const router = express.Router();

/**
 * 🏀 Get **Live NBA Player Stats** (Current Game)
 */
router.post("/getLivePlayerStats", (req, res) => {
    const { playerName } = req.body;

    if (!playerName) {
        return res.status(400).json({ error: "Player name is required" });
    }

    exec(`python3 scripts/player_collection.py "${playerName}"`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: "Error executing Python script" });
        if (stderr) return res.status(500).json({ error: "Python script error" });

        res.json(JSON.parse(stdout));
    });
});

/**
 * 🏀 Get **Player Game Logs** (All Games in a Season)
 */
router.post("/getPlayerGameLog", (req, res) => {
    const { playerName, season } = req.body;

    if (!playerName) {
        return res.status(400).json({ error: "Player name is required" });
    }

    exec(`python3 scripts/player_stats.py game_log "${playerName}" "${season || '2023-24'}"`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: "Error executing Python script" });
        if (stderr) return res.status(500).json({ error: "Python script error" });

        res.json(JSON.parse(stdout));
    });
});

/**
 * 🏀 Get **Player Career Stats** (All-Time Performance)
 */
router.post("/getPlayerCareerStats", (req, res) => {
    const { playerName } = req.body;

    if (!playerName) {
        return res.status(400).json({ error: "Player name is required" });
    }

    exec(`python3 scripts/player_stats.py career_stats "${playerName}"`, (error, stdout, stderr) => {
        if (error) return res.status(500).json({ error: "Error executing Python script" });
        if (stderr) return res.status(500).json({ error: "Python script error" });

        res.json(JSON.parse(stdout));
    });
});

export default router;

