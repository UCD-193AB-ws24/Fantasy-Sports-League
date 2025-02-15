# Fantasy-Sports-League Backend

Run server:
node server.mjs

Use Postman for requests:
1. Set request type to HTTP Post
2. Set Address: http://localhost:3000/getPlayerStats
3. Set request body to "raw" and enter in the following format:
{"playerName": "First Last"}

Script will return basic player stats for specified player.
