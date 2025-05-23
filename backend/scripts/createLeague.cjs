const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createLeague() {
  try {
    // Check if league already exists
    const existingLeague = await prisma.league.findUnique({
      where: { id: 1 }
    });

    if (!existingLeague) {
      // Create a new league with ID 1
      await prisma.league.create({
        data: {
          id: 1,
          name: "NBA Fantasy League 2025",
          commissionerId: "1", // This is still a String in your schema
          createdAt: new Date(),
          updatedAt: new Date(),
          scoringFormat: "Standard",
          maxTeams: 10,
          draftType: "Snake",
          waiverType: "FAAB",
          isPrivate: true
        }
      });
      console.log("Created league with ID 1");
    } else {
      console.log("League with ID 1 already exists");
    }
  } catch (error) {
    console.error("Error creating league:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createLeague();