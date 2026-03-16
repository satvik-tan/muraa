-- Add new columns to Job
ALTER TABLE "Job" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Job" ADD COLUMN "experienceLevel" TEXT;
ALTER TABLE "Job" ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Job" ADD COLUMN "shareId" TEXT;

-- Populate shareId for existing rows
UPDATE "Job" SET "shareId" = gen_random_uuid()::text WHERE "shareId" IS NULL;

-- Make shareId NOT NULL and add unique index
ALTER TABLE "Job" ALTER COLUMN "shareId" SET NOT NULL;
CREATE UNIQUE INDEX "Job_shareId_key" ON "Job"("shareId");

-- Drop the one-per-job unique constraint on InterviewSession.jobId
DROP INDEX IF EXISTS "InterviewSession_jobId_key";

-- Add index on InterviewSession.jobId (was uniquely indexed, now a regular index)
CREATE INDEX "InterviewSession_jobId_idx" ON "InterviewSession"("jobId");

-- Make userId nullable on InterviewSession
ALTER TABLE "InterviewSession" ALTER COLUMN "userId" DROP NOT NULL;

-- Change the userId FK to SET NULL on delete (was CASCADE)
ALTER TABLE "InterviewSession" DROP CONSTRAINT "InterviewSession_userId_fkey";
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add candidate info columns
ALTER TABLE "InterviewSession" ADD COLUMN "candidateName" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN "candidateEmail" TEXT;
