/*
  Warnings:

  - Made the column `potentialValue` on table `clients` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "potentialValue" SET NOT NULL,
ALTER COLUMN "potentialValue" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "pipeline_stages" ADD COLUMN     "isClosedStage" BOOLEAN NOT NULL DEFAULT false;
