-- CreateTable
CREATE TABLE "AiProviderProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "apiBaseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AiProviderProfile_isActive_idx" ON "AiProviderProfile"("isActive");

-- DataMigration: carry over the existing single-provider row (if configured) as the first active profile
INSERT INTO "AiProviderProfile" ("id", "name", "apiBaseUrl", "apiKey", "modelName", "isActive", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'Default', "apiBaseUrl", "apiKey", "modelName", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "AppSettings"
WHERE "apiBaseUrl" IS NOT NULL AND "apiKey" IS NOT NULL AND "modelName" IS NOT NULL;

-- DropTable
PRAGMA foreign_keys=OFF;
DROP TABLE "AppSettings";
PRAGMA foreign_keys=ON;
