-- CreateTable
CREATE TABLE "cofre_movements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "occurredAt" DATE NOT NULL,
    "investmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cofre_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "month_closes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "computedSurplus" DECIMAL(12,2) NOT NULL,
    "confirmedSurplus" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "month_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cofre_state" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cofre_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cofre_movements_userId_occurredAt_idx" ON "cofre_movements"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "month_closes_userId_idx" ON "month_closes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "month_closes_userId_month_key" ON "month_closes"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "cofre_state_userId_key" ON "cofre_state"("userId");

-- AddForeignKey
ALTER TABLE "cofre_movements" ADD CONSTRAINT "cofre_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "month_closes" ADD CONSTRAINT "month_closes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cofre_state" ADD CONSTRAINT "cofre_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
