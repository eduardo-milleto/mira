import type { FastifyReply, FastifyRequest } from "fastify";

// payload que vai dentro do JWT e o shape de request.user depois de verificado
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

// preHandler que exige sessao valida — le o JWT do cookie httpOnly
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Nao autenticado" });
  }
}
