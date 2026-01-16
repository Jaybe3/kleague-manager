-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "is_commissioner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "permanent_id" INTEGER NOT NULL,
    "team_name" TEXT NOT NULL,
    "season_year" INTEGER NOT NULL,
    "draft_position" INTEGER NOT NULL,
    "manager_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "teams_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "player_match_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "draft_date" DATETIME NOT NULL,
    "keeper_deadline" DATETIME NOT NULL,
    "total_rounds" INTEGER NOT NULL DEFAULT 28,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "player_acquisitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "player_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "season_year" INTEGER NOT NULL,
    "acquisition_type" TEXT NOT NULL,
    "draft_round" INTEGER,
    "draft_pick" INTEGER,
    "acquisition_date" DATETIME NOT NULL,
    "traded_from_team_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "player_acquisitions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "player_acquisitions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "keeper_selections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "season_year" INTEGER NOT NULL,
    "keeper_round" INTEGER NOT NULL,
    "years_kept" INTEGER NOT NULL DEFAULT 1,
    "original_acquisition_id" TEXT NOT NULL,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "keeper_selections_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "keeper_selections_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "keeper_selections_original_acquisition_id_fkey" FOREIGN KEY ("original_acquisition_id") REFERENCES "player_acquisitions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teams_permanent_id_key" ON "teams"("permanent_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_permanent_id_season_year_key" ON "teams"("permanent_id", "season_year");

-- CreateIndex
CREATE UNIQUE INDEX "players_player_match_key_key" ON "players"("player_match_key");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_year_key" ON "seasons"("year");

-- CreateIndex
CREATE UNIQUE INDEX "keeper_selections_team_id_season_year_keeper_round_key" ON "keeper_selections"("team_id", "season_year", "keeper_round");

-- CreateIndex
CREATE UNIQUE INDEX "keeper_selections_team_id_player_id_season_year_key" ON "keeper_selections"("team_id", "player_id", "season_year");
