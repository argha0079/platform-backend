/*
  Warnings:

  - The values [HEALTHCARE,WATER_RESOURCES,ACCESSIBILITY,PUBLIC_ADMINISTRATION,RURAL_LIVELIHOODS] on the enum `Domain` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Domain_new" AS ENUM ('DISASTER_MANAGEMENT', 'AGRICULTURE', 'HEALTH', 'EDUCATION', 'WATER_SANITATION', 'INFRASTRUCTURE', 'ENVIRONMENT', 'MINING', 'TRIBAL_WELFARE', 'EMPLOYMENT', 'URBAN_DEVELOPMENT', 'ENERGY', 'OTHER');
ALTER TABLE "Organization" ALTER COLUMN "domains" TYPE "Domain_new"[] USING ("domains"::text::"Domain_new"[]);
ALTER TABLE "Challenge" ALTER COLUMN "category" TYPE "Domain_new" USING ("category"::text::"Domain_new");
ALTER TYPE "Domain" RENAME TO "Domain_old";
ALTER TYPE "Domain_new" RENAME TO "Domain";
DROP TYPE "public"."Domain_old";
COMMIT;
