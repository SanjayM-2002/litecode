/*
  Warnings:

  - You are about to drop the column `language` on the `BoilerPlate` table. All the data in the column will be lost.
  - Added the required column `languageId` to the `BoilerPlate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LanguageType" AS ENUM ('PYTHON', 'JAVA', 'JAVASCRIPT', 'C', 'CPP', 'RUBY', 'GO', 'SWIFT', 'KOTLIN', 'TYPESCRIPT', 'RUST');

-- DropIndex
DROP INDEX "WorkExperience_profileId_key";

-- AlterTable
ALTER TABLE "BoilerPlate" DROP COLUMN "language",
ADD COLUMN     "languageId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Language";

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "name" "LanguageType" NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BoilerPlate" ADD CONSTRAINT "BoilerPlate_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
