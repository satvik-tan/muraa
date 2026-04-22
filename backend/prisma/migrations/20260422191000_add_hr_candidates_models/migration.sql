-- CreateTable
CREATE TABLE "HRModel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HRModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatesModel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatesModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HRModel_userId_key" ON "HRModel"("userId");

-- CreateIndex
CREATE INDEX "HRModel_userId_idx" ON "HRModel"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidatesModel_userId_key" ON "CandidatesModel"("userId");

-- CreateIndex
CREATE INDEX "CandidatesModel_userId_idx" ON "CandidatesModel"("userId");

-- AddForeignKey
ALTER TABLE "HRModel" ADD CONSTRAINT "HRModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatesModel" ADD CONSTRAINT "CandidatesModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
