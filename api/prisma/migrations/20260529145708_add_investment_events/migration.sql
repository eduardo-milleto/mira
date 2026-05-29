-- CreateTable
CREATE TABLE "investment_events" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "delta" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "occurredAt" DATE NOT NULL,
    "cofreMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_events_investmentId_occurredAt_idx" ON "investment_events"("investmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "investment_events_userId_idx" ON "investment_events"("userId");

-- AddForeignKey
ALTER TABLE "cofre_movements" ADD CONSTRAINT "cofre_movements_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_events" ADD CONSTRAINT "investment_events_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_events" ADD CONSTRAINT "investment_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada investimento existente ganha um evento "saldo inicial" com o valor atual,
-- pra a timeline e o calculo de rentabilidade (Fase 3) terem uma base. delta = valor atual.
INSERT INTO "investment_events" ("id", "investmentId", "userId", "type", "delta", "occurredAt", "createdAt")
SELECT gen_random_uuid(), "id", "userId", 'saldo_inicial', "value", "createdAt"::date, now()
FROM "investments";
