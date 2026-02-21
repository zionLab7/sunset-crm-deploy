/*
  Warnings:

  - You are about to drop the column `description` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customFieldId,productId]` on the table `custom_field_values` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `entityType` to the `custom_fields` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CLIENT', 'PRODUCT');

-- AlterTable: Adicionar coluna productId em custom_field_values
ALTER TABLE "custom_field_values" ADD COLUMN "productId" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable: Adicionar entityType com valor padrão temporário
ALTER TABLE "custom_fields" ADD COLUMN "entityType" "EntityType" NOT NULL DEFAULT 'CLIENT';

-- Atualizar todos os campos customizados existentes para CLIENT
UPDATE "custom_fields" SET "entityType" = 'CLIENT';

-- Criar campos customizados para produtos (Preço e Descrição)
INSERT INTO "custom_fields" ("id", "name", "fieldType", "options", "order", "required", "entityType", "createdAt")
VALUES 
  (gen_random_uuid(), 'Preço', 'number', NULL, 1, true, 'PRODUCT', NOW()),
  (gen_random_uuid(), 'Descrição', 'text', NULL, 2, false, 'PRODUCT', NOW());

-- Migrar dados de price e description dos produtos para custom_field_values
DO $$
DECLARE
  price_field_id TEXT;
  description_field_id TEXT;
  product_record RECORD;
BEGIN
  -- Obter IDs dos novos campos
  SELECT id INTO price_field_id FROM "custom_fields" WHERE "name" = 'Preço' AND "entityType" = 'PRODUCT';
  SELECT id INTO description_field_id FROM "custom_fields" WHERE "name" = 'Descrição' AND "entityType" = 'PRODUCT';
  
  -- Para cada produto, criar custom_field_values
  FOR product_record IN SELECT id, price, description FROM "products" LOOP
    -- Inserir preço
    IF product_record.price IS NOT NULL THEN
      INSERT INTO "custom_field_values" ("id", "customFieldId", "productId", "value")
      VALUES (gen_random_uuid(), price_field_id, product_record.id, product_record.price::TEXT);
    END IF;
    
    -- Inserir descrição
    IF product_record.description IS NOT NULL THEN
      INSERT INTO "custom_field_values" ("id", "customFieldId", "productId", "value")
      VALUES (gen_random_uuid(), description_field_id, product_record.id, product_record.description);
    END IF;
  END LOOP;
END $$;

-- AlterTable: Remover colunas price e description dos produtos
ALTER TABLE "products" DROP COLUMN "description",
DROP COLUMN "price";

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_customFieldId_productId_key" ON "custom_field_values"("customFieldId", "productId");

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
