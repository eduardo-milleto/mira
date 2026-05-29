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

O cookie de sessao e httpOnly e setado pela API. Pro Safari nao bloquear (cookie de
terceiro), a **API precisa ser same-site com o front** — ou seja, num subdominio do mesmo
dominio. Config de prod:

- Front em `mirafinance.app`, API em `api.mirafinance.app` (dominio custom no Railway + CNAME)
- Railway:
  - `NODE_ENV=production` (sem isso o cookie vira `Lax`/sem `Secure` e quebra)
  - `CORS_ORIGIN=https://mirafinance.app`
  - `COOKIE_DOMAIN=.mirafinance.app` (sem isso o front nao le o cookie CSRF e as requests mutantes caem em 403)
- Vercel: `VITE_API_URL=https://api.mirafinance.app`
