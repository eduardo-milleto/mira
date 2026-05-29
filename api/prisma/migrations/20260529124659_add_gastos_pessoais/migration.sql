-- CreateTable
CREATE TABLE "personal_expenses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "spentAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_limits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spending_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggers" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spending_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personal_expenses_userId_spentAt_idx" ON "personal_expenses"("userId", "spentAt");

-- CreateIndex
CREATE UNIQUE INDEX "category_limits_userId_category_key" ON "category_limits"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "spending_profiles_userId_key" ON "spending_profiles"("userId");

-- CreateIndex
CREATE INDEX "advisor_messages_userId_createdAt_idx" ON "advisor_messages"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "personal_expenses" ADD CONSTRAINT "personal_expenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_limits" ADD CONSTRAINT "category_limits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spending_profiles" ADD CONSTRAINT "spending_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_messages" ADD CONSTRAINT "advisor_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
