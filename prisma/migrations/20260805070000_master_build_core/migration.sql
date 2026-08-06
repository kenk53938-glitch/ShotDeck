ALTER TABLE "Project" ADD COLUMN "referenceImageUrl" TEXT;

ALTER TABLE "Shot" ADD COLUMN "positivePrompt" TEXT;

ALTER TABLE "Take" ADD COLUMN "localPath" TEXT;
ALTER TABLE "Take" ADD COLUMN "originalFileName" TEXT;
ALTER TABLE "Take" ADD COLUMN "mediaKind" TEXT;
ALTER TABLE "Take" ADD COLUMN "rating" INTEGER;
ALTER TABLE "Take" ADD COLUMN "isSelected" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "GenerationJob" ADD COLUMN "outputTakeId" TEXT;
ALTER TABLE "GenerationJob" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GenerationJob" ADD COLUMN "lastCheckedAt" DATETIME;

UPDATE "Shot"
SET "positivePrompt" = COALESCE("stillPrompt", "prompt")
WHERE "positivePrompt" IS NULL;

UPDATE "Take"
SET "isSelected" = true
WHERE "status" = 'SELECTED';

CREATE INDEX "Shot_projectId_order_idx" ON "Shot"("projectId", "order");
CREATE INDEX "Take_shotId_isSelected_idx" ON "Take"("shotId", "isSelected");
CREATE INDEX "GenerationJob_comfyPromptId_idx" ON "GenerationJob"("comfyPromptId");
