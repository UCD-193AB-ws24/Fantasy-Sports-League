-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_leagueId_fkey";

-- AlterTable
ALTER TABLE "roster" ALTER COLUMN "leagueId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "leagueId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
