import express from 'express';
import { exec } from 'child_process';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/getPlayerStats', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) {
    return res.status(400).json({ error: "Player name is required" });
  }
  // Use 'python' (or full path to python.exe) so Windows finds it
  const command = `python player_collection.py "${playerName}"`;
  console.log("Executing command:", command);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("exec error:", error);
      console.error("stderr:", stderr);
      return res.status(500).send("Error executing Python script");
    }
    const cleanedOutput = stdout.trim();
    try {
      const stats = JSON.parse(cleanedOutput);
      return res.json(stats);
    } catch (e) {
      console.error("JSON parse error:", e);
      console.error("Raw output:", cleanedOutput);
      return res.status(500).send("Invalid JSON from Python script");
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
