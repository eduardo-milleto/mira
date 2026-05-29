-- CreateTable
CREATE TABLE "insights_cache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insights_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insights_cache_userId_idx" ON "insights_cache"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "insights_cache_userId_inputHash_key" ON "insights_cache"("userId", "inputHash");

-- AddForeignKey
ALTER TABLE "insights_cache" ADD CONSTRAINT "insights_cache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
