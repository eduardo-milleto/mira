-- CreateTable
CREATE TABLE "bank_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'pluggy',
    "pluggyItemId" TEXT NOT NULL,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "status" TEXT NOT NULL,
    "currentBalance" DECIMAL(12,2) NOT NULL,
    "currentBalanceAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_balance_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "openingBalance" DECIMAL(12,2) NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_connections_userId_key" ON "bank_connections"("userId");

-- CreateIndex
CREATE INDEX "bank_balance_snapshots_userId_idx" ON "bank_balance_snapshots"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_balance_snapshots_userId_month_key" ON "bank_balance_snapshots"("userId", "month");

-- AddForeignKey
ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_balance_snapshots" ADD CONSTRAINT "bank_balance_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_balance_snapshots" ADD CONSTRAINT "bank_balance_snapshots_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
