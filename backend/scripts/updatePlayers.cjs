require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LOCAL_API_URL = "http://localhost:5001/api/players/getPlayerGameLog";
const COMMON_INFO_URL = "http://localhost:5001/api/players/getCommonPlayerInfo";
const BATCH_SIZE = 5; // Adjust as needed

async function axiosPostWithRetry(url, data, config, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios.post(url, data, config);
    } catch (err) {
      if ((err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') && attempt < retries) {
        console.warn(`Request for ${data.playerName} timed out, retrying (${attempt + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw err;
      }
    }
  }
}

// Only update common info if missing.
async function updateCommonInfoForPlayer(player) {
  if (player.team && player.positions && player.positions.length > 0 && player.jersey) {
    return;
  }
  try {
    const res = await axiosPostWithRetry(
      COMMON_INFO_URL,
      { playerName: player.name },
      { headers: { 'Content-Type': 'application/json' }, timeout: 60000 },
      3
    );
    if (res.data.error) {
      console.error(`Error fetching common info for ${player.name}: ${res.data.error}`);
      return;
    }
    const { team, position, jersey } = res.data;
    if (team && position) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          team,
          positions: [position],
          jersey: jersey ? parseInt(jersey) : null,
        },
      });
      console.log(`Updated common info for ${player.name}: team=${team}, positions=[${position}], jersey=${jersey}`);
    } else {
      console.warn(`Incomplete info for ${player.name}: team=${team}, position=${position}, jersey=${jersey}`);
    }
  } catch (err) {
    console.error(`Failed to update common info for ${player.name}: ${err.message}`);
  }
}

async function updatePlayerData(leaguePlayer) {
  try {
    // Fetch the player record.
    let player = await prisma.player.findUnique({
      where: { id: leaguePlayer.playerId },
    });
    if (!player) return;

    // Update common info only if missing.
    await updateCommonInfoForPlayer(player);
    // Re-fetch player for updated info.
    player = await prisma.player.findUnique({ where: { id: player.id } });

    // Fetch the player's game logs.
    let gameLogs = [];
    try {
      const response = await axiosPostWithRetry(
        LOCAL_API_URL,
        { playerName: player.name, season: "2024-25" },
        { headers: { 'Content-Type': 'application/json' }, timeout: 60000 },
        3
      );
      if (!Array.isArray(response.data.games)) {
        console.warn(`No valid 'games' array for player ${player.name}. Full response:`, response.data);
      } else {
        gameLogs = response.data.games;
      }
    } catch (err) {
      console.warn(`Error fetching logs for ${player.name}: ${err.message}`);
    }

    // Pre-fetch existing stats for this player.
    const existingStats = await prisma.playerStats.findMany({
      where: { playerId: player.id },
    });
    // Build a lookup map keyed by composite key: ISO-date + "_" + matchup.
    const statsMap = new Map();
    existingStats.forEach(stat => {
      const key = stat.game_date.toISOString() + "_" + stat.matchup.trim();
      statsMap.set(key, stat);
    });

    // Process each game log.
    for (const gameStats of gameLogs) {
      if (!gameStats.date || !gameStats.matchup) {
        console.error(`Invalid game stats data for player ${player.name}:`, gameStats);
        continue;
      }
      const matchup = gameStats.matchup.trim();
      const gameDate = new Date(gameStats.date);
      const key = gameDate.toISOString() + "_" + matchup;

      // Upsert the Game record (finalScore stored in Game).
      const game = await prisma.game.upsert({
        where: {
          date_matchup: {
            date: gameDate,
            matchup: matchup,
          },
        },
        update: { finalScore: gameStats.finalScore || null },
        create: {
          date: gameDate,
          matchup: matchup,
          finalScore: gameStats.finalScore || null,
        },
      });

      // Calculate fantasy points.
      const fantasyPoints =
        (gameStats.points || 0) +
        (gameStats.rebounds || 0) * 1.2 +
        (gameStats.assists || 0) * 1.5 +
        (gameStats.blocks || 0) * 3 +
        (gameStats.steals || 0) * 3 +
        ((gameStats.turnovers || 0) * -1);

      // Build the new stats object for change detection.
      const newData = {
        points: gameStats.points || 0,
        rebounds: gameStats.rebounds || 0,
        assists: gameStats.assists || 0,
        steals: gameStats.steals || 0,
        blocks: gameStats.blocks || 0,
        turnovers: gameStats.turnovers || 0,
        fg: gameStats.fg || "0/0",
        threePoint: gameStats["3pt"] || "0/0",
        ft: gameStats.ft || "0/0",
        minutes: gameStats.minutes ? parseInt(gameStats.minutes) : 0,
        fantasyPoints: fantasyPoints,
      };

      // If a record exists, compare fields to avoid unnecessary updates.
      if (statsMap.has(key)) {
        const existing = statsMap.get(key);
        const fieldsToCheck = ["points", "rebounds", "assists", "steals", "blocks", "turnovers", "fg", "threePoint", "ft", "minutes", "fantasyPoints"];
        let needsUpdate = false;
        for (let field of fieldsToCheck) {
          if (existing[field] !== newData[field]) {
            needsUpdate = true;
            break;
          }
        }
        if (!needsUpdate) {
          continue; // Skip update if nothing has changed.
        }
        await prisma.playerStats.update({
          where: { id: existing.id },
          data: {
            ...newData,
            matchup: matchup,
            game_in_progress: gameStats.game_in_progress === "Yes",
            game_date: gameDate,
          },
        });
        console.log(`Updated stats for ${player.name} on ${gameStats.date}`);
      } else {
        // Create a new record.
        await prisma.playerStats.create({
          data: {
            playerId: player.id,
            gameId: game.id,
            ...newData,
            matchup: matchup,
            game_in_progress: gameStats.game_in_progress === "Yes",
            game_date: gameDate,
          },
        });
        console.log(`Created stats for ${player.name} on ${gameStats.date}`);
      }
    }

    // Recalculate aggregates from all stats.
    const allStats = await prisma.playerStats.findMany({
      where: { playerId: player.id },
    });
    const gp = allStats.length;
    const totalFanPts = allStats.reduce((sum, s) => sum + (s.fantasyPoints ?? 0), 0);

    // Update only the aggregate fields that exist in your schema.
    await prisma.player.update({
      where: { id: player.id },
      data: {
        gamesPlayed: gp,
        totalFanPts: totalFanPts,
      },
    });
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.error(`Error updating player data for leaguePlayer ID ${leaguePlayer.id}: 403 Forbidden`);
    } else if (error.code === 'ECONNRESET') {
      console.error(`Error updating player data for leaguePlayer ID ${leaguePlayer.id}: Connection reset`);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`Error updating player data for leaguePlayer ID ${leaguePlayer.id}: Request timed out`);
    } else {
      console.error(`Error updating player data for leaguePlayer ID ${leaguePlayer.id}:`, error.message);
    }
  }
}

async function updateRanks() {
  try {
    // Set null totalFanPts to 0.
    await prisma.player.updateMany({
      where: { totalFanPts: null },
      data: { totalFanPts: 0 },
    });
    const players = await prisma.player.findMany({
      orderBy: { totalFanPts: 'desc' },
    });
    let rank = 1;
    for (const p of players) {
      await prisma.player.update({
        where: { id: p.id },
        data: { rank: rank },
      });
      rank++;
    }
    console.log("Ranks updated based on totalFanPts.");
  } catch (err) {
    console.error("Error updating ranks:", err.message);
  }
}

async function updateAllPlayers() {
  try {
    const leaguePlayers = await prisma.leaguePlayer.findMany();
    console.log(`Found ${leaguePlayers.length} league players to update.`);
    for (let i = 0; i < leaguePlayers.length; i += BATCH_SIZE) {
      const batch = leaguePlayers.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(lp => updatePlayerData(lp)));
      console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    }
    await updateRanks();
    console.log("All players updated and ranked.");
  } catch (error) {
    console.error("Error updating players:", error.message);
  }
}

// Schedule the update to run every 5 hours.
cron.schedule('0 */5 * * *', async () => {
  console.log("Starting scheduled update of player data...");
  await updateAllPlayers();
});

// Run it once immediately on startup.
updateAllPlayers();
