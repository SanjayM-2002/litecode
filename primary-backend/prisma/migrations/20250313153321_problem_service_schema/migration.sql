/*
  Warnings:

  - You are about to drop the column `expectedOutput` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the column `input` on the `TestCase` table. All the data in the column will be lost.
  - You are about to drop the `BoilerPlate` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "BoilerPlate" DROP CONSTRAINT "BoilerPlate_languageId_fkey";

-- DropForeignKey
ALTER TABLE "BoilerPlate" DROP CONSTRAINT "BoilerPlate_problemId_fkey";

-- AlterTable
ALTER TABLE "TestCase" DROP COLUMN "expectedOutput",
DROP COLUMN "input";

-- DropTable
DROP TABLE "BoilerPlate";

-- CreateTable
CREATE TABLE "Input" (
    "id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "testCaseId" TEXT NOT NULL,

    CONSTRAINT "Input_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Output" (
    "id" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "testCaseId" TEXT NOT NULL,

    CONSTRAINT "Output_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionBoilerPlate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "FunctionBoilerPlate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompleteBoilerPlate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "CompleteBoilerPlate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Input" ADD CONSTRAINT "Input_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Output" ADD CONSTRAINT "Output_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionBoilerPlate" ADD CONSTRAINT "FunctionBoilerPlate_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionBoilerPlate" ADD CONSTRAINT "FunctionBoilerPlate_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompleteBoilerPlate" ADD CONSTRAINT "CompleteBoilerPlate_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompleteBoilerPlate" ADD CONSTRAINT "CompleteBoilerPlate_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
