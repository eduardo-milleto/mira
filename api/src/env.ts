import { z } from "zod";

// valida as variaveis de ambiente logo no boot — se faltar algo, o processo morre cedo
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa de pelo menos 16 caracteres"),
  CORS_ORIGIN: z.string().url(),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // opcional: sem ela a rota /insights responde 503, mas o resto da api sobe normal
  GEMINI_API_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variaveis de ambiente invalidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
