-- banco passa a ser opcional: cartao precisa de banco OU bandeira (validado na app)
ALTER TABLE "credit_cards" ALTER COLUMN "bank" DROP NOT NULL;
