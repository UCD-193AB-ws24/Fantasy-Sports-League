-- AlterTable
ALTER TABLE "League" ADD COLUMN     "draftCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Draft" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "draftDate" TIMESTAMP(3),
    "timePerPick" INTEGER NOT NULL DEFAULT 90,
    "currentRound" INTEGER,
    "currentPickInRound" INTEGER,
    "pickTimeRemaining" INTEGER,
    "draftOrderType" TEXT NOT NULL DEFAULT 'RANDOM',
    "draftOrder" INTEGER[],
    "manualDraftOrder" INTEGER[],
    "allowDraftPickTrading" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "pickInRound" INTEGER NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Draft_leagueId_key" ON "Draft"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_draftId_pickNumber_key" ON "DraftPick"("draftId", "pickNumber");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
