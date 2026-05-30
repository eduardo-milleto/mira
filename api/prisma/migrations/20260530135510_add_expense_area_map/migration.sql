-- CreateTable
CREATE TABLE "expense_area_map" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_area_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_area_map_userId_idx" ON "expense_area_map"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_area_map_userId_name_key" ON "expense_area_map"("userId", "name");

-- AddForeignKey
ALTER TABLE "expense_area_map" ADD CONSTRAINT "expense_area_map_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
