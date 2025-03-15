/*
  Warnings:

  - You are about to drop the column `rostersIds` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "rostersIds",
ADD COLUMN     "rosterIds" VARCHAR(255)[];
