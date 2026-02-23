-- AlterTable: add costPrice column to products (safe, IF NOT EXISTS)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION;
