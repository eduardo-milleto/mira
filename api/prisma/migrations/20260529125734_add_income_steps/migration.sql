-- CreateTable
CREATE TABLE "income_steps" (
    "id" TEXT NOT NULL,
    "incomeSourceId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "monthlyAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "income_steps_incomeSourceId_idx" ON "income_steps"("incomeSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "income_steps_incomeSourceId_year_key" ON "income_steps"("incomeSourceId", "year");

-- AddForeignKey
ALTER TABLE "income_steps" ADD CONSTRAINT "income_steps_incomeSourceId_fkey" FOREIGN KEY ("incomeSourceId") REFERENCES "income_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
