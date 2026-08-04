/*
  Warnings:

  - You are about to drop the column `cost` on the `Take` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Take" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shotId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "fileUrl" TEXT,
    "seed" TEXT,
    "model" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Take_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Take" ("createdAt", "fileUrl", "id", "model", "notes", "seed", "shotId", "status", "versionNumber") SELECT "createdAt", "fileUrl", "id", "model", "notes", "seed", "shotId", "status", "versionNumber" FROM "Take";
DROP TABLE "Take";
ALTER TABLE "new_Take" RENAME TO "Take";
CREATE INDEX "Take_shotId_idx" ON "Take"("shotId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
