-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "allowedModels" TEXT[] DEFAULT ARRAY[]::TEXT[];
