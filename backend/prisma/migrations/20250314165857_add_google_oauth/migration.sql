/*
  Warnings:

  - A unique constraint covering the columns `[googleID]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "googleID" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_googleID_key" ON "user"("googleID");
