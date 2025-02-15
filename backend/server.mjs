import express from 'express';
import { exec } from 'child_process';

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

app.post('/getPlayerStats', (req, res) => {
    const playerName = req.body.playerName;

    console.log(`Received request for player: ${playerName}`);


    if (!playerName) {
        return res.status(400).send('Player name is required');
    }

    // Execute the Python script with the player name as an argument
    exec(`python3 player_collection.py "${playerName}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Error executing Python script');
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).send('Error in Python script execution');
        }

        console.log(`Player data: ${stdout}`);

        // Send the output from the Python script back to the client
        res.send(stdout);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 