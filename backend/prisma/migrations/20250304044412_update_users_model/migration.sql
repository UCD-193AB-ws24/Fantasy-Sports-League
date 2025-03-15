-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "picture" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "rostersIds" VARCHAR(255)[],
    "password" VARCHAR(255) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playerStats" (
    "id" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL,
    "rebounds" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "steals" INTEGER NOT NULL,
    "blocks" INTEGER NOT NULL,
    "turnovers" INTEGER NOT NULL,
    "fg" INTEGER NOT NULL,
    "threePoint" INTEGER NOT NULL,
    "ft" INTEGER NOT NULL,
    "matchup" VARCHAR(255) NOT NULL,
    "game_in_progress" BOOLEAN NOT NULL,
    "game_date" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "playerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster" (
    "id" VARCHAR(255) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "teamName" VARCHAR(255) NOT NULL,
    "leagueId" VARCHAR(255) NOT NULL,
    "players" VARCHAR(255)[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "commissionerId" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "scoringFormat" VARCHAR(255) NOT NULL,
    "maxTeams" INTEGER NOT NULL,
    "usersIds" VARCHAR(255)[],
    "draftType" VARCHAR(255) NOT NULL,
    "draftDate" TIMESTAMPTZ(6),
    "tradeDeadline" TIMESTAMPTZ(6),
    "waiverType" VARCHAR(255) NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "league_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
