import { z } from "zod";

// itemId que o widget do Pluggy devolve no onSuccess. so garantimos string nao vazia.
export const connectSchema = z.object({
  itemId: z.string().trim().min(1, "itemId obrigatorio").max(100),
});

export type ConnectInput = z.infer<typeof connectSchema>;
