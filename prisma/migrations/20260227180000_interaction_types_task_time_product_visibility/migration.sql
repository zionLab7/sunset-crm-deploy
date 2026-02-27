-- Migration: interaction_types_task_time_product_visibility
-- IMPORTANT: this project uses camelCase column names in PostgreSQL (matching Prisma defaults)

-- 1. Add dueTime and completedAt to tasks (camelCase to match Prisma conventions)
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dueTime" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- 2. Add highlightColor to custom_fields
ALTER TABLE "custom_fields" ADD COLUMN IF NOT EXISTS "highlightColor" TEXT;

-- 3. Create interaction_type_configs table (camelCase columns)
CREATE TABLE IF NOT EXISTS "interaction_type_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📝',
    "isSaleType" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interaction_type_configs_pkey" PRIMARY KEY ("id")
);

-- 4. Seed default interaction types (only if table is empty)
INSERT INTO "interaction_type_configs" ("id", "name", "emoji", "isSaleType", "isSystem", "color", "order", "createdAt")
SELECT 'itc_call', 'Ligação', '📞', false, true, 'blue', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "interaction_type_configs" WHERE "id" = 'itc_call');

INSERT INTO "interaction_type_configs" ("id", "name", "emoji", "isSaleType", "isSystem", "color", "order", "createdAt")
SELECT 'itc_visit', 'Visita', '🏢', false, true, 'purple', 2, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "interaction_type_configs" WHERE "id" = 'itc_visit');

INSERT INTO "interaction_type_configs" ("id", "name", "emoji", "isSaleType", "isSystem", "color", "order", "createdAt")
SELECT 'itc_email', 'Email', '📧', false, true, 'green', 3, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "interaction_type_configs" WHERE "id" = 'itc_email');

INSERT INTO "interaction_type_configs" ("id", "name", "emoji", "isSaleType", "isSystem", "color", "order", "createdAt")
SELECT 'itc_note', 'Nota', '📝', false, true, 'gray', 4, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "interaction_type_configs" WHERE "id" = 'itc_note');

INSERT INTO "interaction_type_configs" ("id", "name", "emoji", "isSaleType", "isSystem", "color", "order", "createdAt")
SELECT 'itc_sale', 'Venda', '💰', true, true, 'amber', 5, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "interaction_type_configs" WHERE "id" = 'itc_sale');

-- 5. Create product_field_visibility table (camelCase columns)
CREATE TABLE IF NOT EXISTS "product_field_visibility" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "hiddenForRole" TEXT NOT NULL DEFAULT 'VENDEDOR',
    "customFieldId" TEXT,
    CONSTRAINT "product_field_visibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_field_visibility_productId_fieldKey_hiddenForRole_key"
ON "product_field_visibility"("productId", "fieldKey", "hiddenForRole");

ALTER TABLE "product_field_visibility"
    DROP CONSTRAINT IF EXISTS "product_field_visibility_productId_fkey";
ALTER TABLE "product_field_visibility"
    ADD CONSTRAINT "product_field_visibility_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_field_visibility"
    DROP CONSTRAINT IF EXISTS "product_field_visibility_customFieldId_fkey";
ALTER TABLE "product_field_visibility"
    ADD CONSTRAINT "product_field_visibility_customFieldId_fkey"
    FOREIGN KEY ("customFieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
