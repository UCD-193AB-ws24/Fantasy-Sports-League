/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `roster` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "roster_userId_key" ON "roster"("userId");
