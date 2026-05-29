-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "expectedReturnPct" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investments_userId_idx" ON "investments"("userId");

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
