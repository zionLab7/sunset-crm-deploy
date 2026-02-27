-- Migration: convert_interaction_type_to_string
-- The interactions.type column was originally an InteractionType enum.
-- We now use dynamic string values (from interaction_type_configs table).
-- This migration converts the column to TEXT and maps old enum values to their display names.

-- 1. Add a temporary TEXT column
ALTER TABLE "interactions" ADD COLUMN IF NOT EXISTS "type_text" TEXT;

-- 2. Populate it: map old enum values to display strings
UPDATE "interactions" SET "type_text" = CASE "type"::TEXT
    WHEN 'CALL'          THEN 'Ligação'
    WHEN 'VISIT'         THEN 'Visita'
    WHEN 'EMAIL'         THEN 'Email'
    WHEN 'NOTE'          THEN 'Nota'
    WHEN 'STATUS_CHANGE' THEN 'Nota'
    WHEN 'SALE'          THEN 'Venda'
    ELSE "type"::TEXT   -- fallback: keep as-is if already a string
END
WHERE "type_text" IS NULL;

-- 3. Drop the old enum column and replace with the text column
ALTER TABLE "interactions" DROP COLUMN "type";
ALTER TABLE "interactions" RENAME COLUMN "type_text" TO "type";

-- 4. Set NOT NULL (all rows should now have a value)
ALTER TABLE "interactions" ALTER COLUMN "type" SET NOT NULL;

-- 5. Drop the old InteractionType enum (if it exists and nothing else uses it)
DROP TYPE IF EXISTS "InteractionType";
