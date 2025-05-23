// addPlayersToLeague.cjs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LEAGUE_ID = 1; // Change this to the ID of your manually created league

async function addPlayersToLeague() {
  try {
    // Fetch all players from the Player table
    const players = await prisma.player.findMany();
    console.log(`Found ${players.length} players in the Player table.`);

    for (const player of players) {
      // Check if a LeaguePlayer record already exists for this player and league
      const existingRecord = await prisma.leaguePlayer.findFirst({
        where: {
          leagueId: LEAGUE_ID,
          playerId: player.id,
        },
      });

      if (!existingRecord) {
        // Create a new LeaguePlayer record with rosterOwnerId set to null
        await prisma.leaguePlayer.create({
          data: {
            leagueId: LEAGUE_ID,
            playerId: player.id,
            rosterOwnerId: null,
          },
        });
        console.log(`Added ${player.name} to league ${LEAGUE_ID}.`);
      } else {
        console.log(`${player.name} is already in league ${LEAGUE_ID}.`);
      }
    }
    console.log("All players have been processed.");
  } catch (error) {
    console.error("Error adding players to league:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addPlayersToLeague();
