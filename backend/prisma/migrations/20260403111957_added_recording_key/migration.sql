-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "recordingKey" TEXT;

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "skills" DROP DEFAULT;
