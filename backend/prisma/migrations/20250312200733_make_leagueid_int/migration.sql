/*
  Warnings:

  - Changed the type of `leagueId` on the `roster` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `leagueId` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_leagueId_fkey";

-- AlterTable
ALTER TABLE "roster" DROP COLUMN "leagueId",
ADD COLUMN     "leagueId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "leagueId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
