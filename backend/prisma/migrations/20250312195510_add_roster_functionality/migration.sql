/*
  Warnings:

  - The primary key for the `playerStats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `playerStats` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `roster` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `players` on the `roster` table. All the data in the column will be lost.
  - The `id` column on the `roster` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `user` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `league` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[playerId,gameId]` on the table `playerStats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `gameId` to the `playerStats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerId` to the `playerStats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "playerStats" DROP CONSTRAINT "playerStats_pkey",
ADD COLUMN     "fantasyPoints" DOUBLE PRECISION,
ADD COLUMN     "gameId" INTEGER NOT NULL,
ADD COLUMN     "minutes" INTEGER,
ADD COLUMN     "playerId" INTEGER NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "fg" SET DATA TYPE TEXT,
ALTER COLUMN "threePoint" SET DATA TYPE TEXT,
ALTER COLUMN "ft" SET DATA TYPE TEXT,
ADD CONSTRAINT "playerStats_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "roster" DROP CONSTRAINT "roster_pkey",
DROP COLUMN "players",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "roster_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user" DROP CONSTRAINT "user_pkey",
ADD COLUMN     "leagueId" INTEGER,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "league";

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT,
    "positions" TEXT[],
    "jersey" INTEGER,
    "rank" INTEGER,
    "gamesPlayed" INTEGER,
    "totalFanPts" INTEGER,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "matchup" TEXT NOT NULL,
    "finalScore" TEXT,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaguePlayer" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "rosterOwnerId" INTEGER,

    CONSTRAINT "LeaguePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "commissionerId" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "scoringFormat" VARCHAR(255) NOT NULL,
    "maxTeams" INTEGER NOT NULL,
    "draftType" VARCHAR(255) NOT NULL,
    "draftDate" TIMESTAMPTZ(6),
    "tradeDeadline" TIMESTAMPTZ(6),
    "waiverType" VARCHAR(255) NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosterPlayer" (
    "id" SERIAL NOT NULL,
    "rosterId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "isBench" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rosterPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Game_date_matchup_key" ON "Game"("date", "matchup");

-- CreateIndex
CREATE UNIQUE INDEX "rosterPlayer_rosterId_playerId_key" ON "rosterPlayer"("rosterId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "playerStats_playerId_gameId_key" ON "playerStats"("playerId", "gameId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playerStats" ADD CONSTRAINT "playerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playerStats" ADD CONSTRAINT "playerStats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaguePlayer" ADD CONSTRAINT "LeaguePlayer_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaguePlayer" ADD CONSTRAINT "LeaguePlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaguePlayer" ADD CONSTRAINT "LeaguePlayer_rosterOwnerId_fkey" FOREIGN KEY ("rosterOwnerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosterPlayer" ADD CONSTRAINT "rosterPlayer_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "roster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosterPlayer" ADD CONSTRAINT "rosterPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
