-- adiciona a bandeira do cartao (nullable; cartoes existentes ficam NULL)
ALTER TABLE "credit_cards" ADD COLUMN "brand" TEXT;
