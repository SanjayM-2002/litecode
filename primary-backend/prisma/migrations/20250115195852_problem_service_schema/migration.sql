-- CreateEnum
CREATE TYPE "Language" AS ENUM ('PYTHON', 'JAVA', 'JAVASCRIPT', 'C', 'CPP', 'RUBY', 'GO', 'SWIFT', 'KOTLIN', 'TYPESCRIPT');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expectedOutput" JSONB NOT NULL,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoilerPlate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "BoilerPlate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "ProblemImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemAnalytics" (
    "id" TEXT NOT NULL,
    "numberOfSubmissions" INTEGER NOT NULL DEFAULT 0,
    "acceptedSubmissions" INTEGER NOT NULL DEFAULT 0,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "ProblemAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Editorial" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "Editorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemDiscussion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemDiscussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemDiscussionComment" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemDiscussionComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemVote" (
    "id" TEXT NOT NULL,
    "vote" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "ProblemVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemDiscussionVote" (
    "id" TEXT NOT NULL,
    "vote" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "problemDiscussionId" TEXT NOT NULL,

    CONSTRAINT "ProblemDiscussionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemDiscussionCommentVote" (
    "id" TEXT NOT NULL,
    "vote" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "problemDiscussionCommentId" TEXT NOT NULL,

    CONSTRAINT "ProblemDiscussionCommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProblemToTopic" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProblemToTopic_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CompanyToProblem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompanyToProblem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Problem_number_key" ON "Problem"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_name_key" ON "Topic"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemAnalytics_problemId_key" ON "ProblemAnalytics"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "Editorial_problemId_key" ON "Editorial"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemVote_userId_problemId_key" ON "ProblemVote"("userId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemDiscussionVote_userId_problemDiscussionId_key" ON "ProblemDiscussionVote"("userId", "problemDiscussionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemDiscussionCommentVote_userId_problemDiscussionCommen_key" ON "ProblemDiscussionCommentVote"("userId", "problemDiscussionCommentId");

-- CreateIndex
CREATE INDEX "_ProblemToTopic_B_index" ON "_ProblemToTopic"("B");

-- CreateIndex
CREATE INDEX "_CompanyToProblem_B_index" ON "_CompanyToProblem"("B");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoilerPlate" ADD CONSTRAINT "BoilerPlate_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemImage" ADD CONSTRAINT "ProblemImage_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemAnalytics" ADD CONSTRAINT "ProblemAnalytics_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Editorial" ADD CONSTRAINT "Editorial_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemDiscussion" ADD CONSTRAINT "ProblemDiscussion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemDiscussion" ADD CONSTRAINT "ProblemDiscussion_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemDiscussionComment" ADD CONSTRAINT "ProblemDiscussionComment_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "ProblemDiscussion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemDiscussionComment" ADD CONSTRAINT "ProblemDiscussionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemVote" ADD CONSTRAINT "ProblemVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemVote" ADD CONSTRAINT "ProblemVote_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemDiscussionVote" ADD CONSTRAINT "ProblemDiscussionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemDiscussionVote" ADD CONSTRAINT "ProblemDiscussionVote_problemDiscussionId_fkey" FOREIGN KEY ("problemDiscussionId") REFERENCES "ProblemDiscussion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemDiscussionCommentVote" ADD CONSTRAINT "ProblemDiscussionCommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemDiscussionCommentVote" ADD CONSTRAINT "ProblemDiscussionCommentVote_problemDiscussionCommentId_fkey" FOREIGN KEY ("problemDiscussionCommentId") REFERENCES "ProblemDiscussionComment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProblemToTopic" ADD CONSTRAINT "_ProblemToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProblemToTopic" ADD CONSTRAINT "_ProblemToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToProblem" ADD CONSTRAINT "_CompanyToProblem_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToProblem" ADD CONSTRAINT "_CompanyToProblem_B_fkey" FOREIGN KEY ("B") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
