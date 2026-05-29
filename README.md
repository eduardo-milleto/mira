# Mira

App de finanças pessoais. Clareza, controle e automação pra decidir melhor todo dia.

Monorepo:

- `web/` — frontend (Vite + React + TypeScript), deploy na **Vercel**
- `api/` — backend (Fastify + Prisma + Postgres), deploy na **Railway**

## Rodando local

Pré-requisitos: Node 20+, Docker.

```bash
# 1. sobe o postgres local
npm run db:up

# 2. instala dependencias (raiz instala os workspaces)
npm install

# 3. configura o env do backend
cp api/.env.example api/.env   # ajuste se precisar

# 4. roda a migration inicial
npm run db:migrate --workspace=api

# 5. sobe api + web
npm run dev
```

- API: http://localhost:3333
- Web: http://localhost:5173

## Stack

- **Frontend**: React, TanStack Query, TanStack Router, React Aria, TailwindCSS, lucide-react
- **Backend**: Fastify, Prisma, Postgres, argon2 (hash de senha), JWT em cookie httpOnly
- **Tema**: dark, preto + verde

## Deploy

- **Vercel** → root `web`, build `vite build`, output `dist`
- **Railway** → root `api`, Postgres addon, release roda `prisma migrate deploy`

### Sessao (cookies) em producao

Front (Vercel) e API (Railway) sao sites diferentes, entao o cookie de sessao e
cross-site. Pro Safari/Chrome aceitarem sem precisar de subdominio, o cookie usa
`SameSite=None; Secure; Partitioned` (CHIPS). O CSRF e por **validacao de Origin**
(o header `Origin` da request mutante precisa bater com `CORS_ORIGIN`), entao nao ha
cookie de CSRF legivel pelo front. Config de prod:

- Railway:
  - `NODE_ENV=production` (sem isso o cookie vira `Lax`/sem `Secure`/sem `Partitioned` e quebra)
  - `CORS_ORIGIN=https://mirafinance.app` (origem exata do front, sem barra no final)
- Vercel: `VITE_API_URL=<url-da-api-no-railway>`
