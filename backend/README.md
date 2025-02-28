# Fantasy-Sports-League Backend

Dependencies to install:
npm install express dotenv cors pg child_process

Running the server:
First change into backend directory and run:
node server.js

Then, open a second terminal instance

To run requests from player_collection.py:
curl -X POST http://localhost:5001/api/players/getLivePlayerStats \
     -H "Content-Type: application/json" \
     -d '{"playerName": "Josh Giddey"}'  
as an example to get Josh Giddeys live stats

To run requests from player_stats.py:

Use curl -X POST http://localhost:5001/api/players/getPlayerGameLog \
     -H "Content-Type: application/json" \
     -d '{"playerName": "Josh Giddey", "season": "2023-24"}'
as an example to get Josh Giddey game logs

or use curl -X POST http://localhost:5001/api/players/getPlayerCareerStats \
     -H "Content-Type: application/json" \
     -d '{"playerName": "Josh Giddey"}'
as an example to get Josh Giddey career stats

Script will return basic player stats for specified player

To test without running the server, change into scripts directory and run:
python3 scripts/player_stats.py game_log "Josh Giddey"

to print Josh Giddeys game logs for the season 
