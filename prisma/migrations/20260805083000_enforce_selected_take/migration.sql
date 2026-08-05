UPDATE "Take" AS current_take
SET
  "isSelected" = false,
  "status" = CASE
    WHEN "status" = 'SELECTED' THEN 'READY'
    ELSE "status"
  END
WHERE
  "isSelected" = true
  AND "id" <> (
    SELECT newest_take."id"
    FROM "Take" AS newest_take
    WHERE
      newest_take."shotId" = current_take."shotId"
      AND newest_take."isSelected" = true
    ORDER BY newest_take."createdAt" DESC, newest_take."versionNumber" DESC
    LIMIT 1
  );

CREATE UNIQUE INDEX "Take_one_selected_per_shot"
ON "Take"("shotId")
WHERE "isSelected" = true;
