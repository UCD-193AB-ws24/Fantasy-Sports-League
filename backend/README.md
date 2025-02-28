# Fantasy-Sports-League Backend

Running the server:
First change into backend directory and run:
node server.js

Then, open a second terminal instance

To run reuqests from player_stats.py:

Use curl -X POST http://localhost:5001/api/players/getPlayerGameLog \
     -H "Content-Type: application/json" \
     -d '{"playerName": "Josh Giddey", "season": "2023-24"}'
as an example to get Josh Giddey game logs

or use curl -X POST http://localhost:5001/api/players/getPlayerCareerStats \
     -H "Content-Type: application/json" \
     -d '{"playerName": "Josh Giddey"}'
as an example to get Josh Giddey career stats

Script will return basic player stats for specified player
