import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

app.post('/api/players/getLivePlayerStats', (req, res) => {
    const { playerName } = req.body;
    
    if (!playerName) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    // Correct execution path for `player_collection.py`
    const command = `python3 scripts/player_collection.py live_stats "${playerName}"`;

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

// tart server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
