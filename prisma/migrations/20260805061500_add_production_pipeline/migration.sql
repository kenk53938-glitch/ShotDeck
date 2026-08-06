ALTER TABLE "Project" ADD COLUMN "styleGuide" TEXT;
ALTER TABLE "Project" ADD COLUMN "referenceImagePath" TEXT;
ALTER TABLE "Project" ADD COLUMN "fixedNegativePrompt" TEXT;
ALTER TABLE "Project" ADD COLUMN "defaultWidth" INTEGER NOT NULL DEFAULT 768;
ALTER TABLE "Project" ADD COLUMN "defaultHeight" INTEGER NOT NULL DEFAULT 432;
ALTER TABLE "Project" ADD COLUMN "defaultFps" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "Shot" ADD COLUMN "stillPrompt" TEXT;
ALTER TABLE "Shot" ADD COLUMN "motionPrompt" TEXT;
ALTER TABLE "Shot" ADD COLUMN "sourceImagePath" TEXT;
ALTER TABLE "Shot" ADD COLUMN "previewVideoPath" TEXT;
ALTER TABLE "Shot" ADD COLUMN "finalVideoPath" TEXT;
ALTER TABLE "Shot" ADD COLUMN "seed" TEXT;
ALTER TABLE "Shot" ADD COLUMN "width" INTEGER;
ALTER TABLE "Shot" ADD COLUMN "height" INTEGER;
ALTER TABLE "Shot" ADD COLUMN "fps" INTEGER;

CREATE TABLE "GenerationJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shotId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "comfyPromptId" TEXT,
  "workflowPreset" TEXT,
  "inputPath" TEXT,
  "outputPath" TEXT,
  "errorMessage" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  CONSTRAINT "GenerationJob_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GenerationJob_shotId_idx" ON "GenerationJob"("shotId");
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");
