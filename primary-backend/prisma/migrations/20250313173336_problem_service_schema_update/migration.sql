/*
  Warnings:

  - You are about to drop the column `testCaseId` on the `Output` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[outputId]` on the table `TestCase` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Editorial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputId` to the `TestCase` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Output" DROP CONSTRAINT "Output_testCaseId_fkey";

-- AlterTable
ALTER TABLE "Editorial" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Output" DROP COLUMN "testCaseId";

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "outputId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_outputId_key" ON "TestCase"("outputId");

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "Output"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
