# Recipe Book

A self-hosted web app for managing cooking recipes using the [Cooklang](https://cooklang.org) markup language. Recipes are written in Cooklang syntax, parsed with the official `@cooklang/cooklang` WASM build, and stored in PostgreSQL. The app provides a clean CRUD interface, search, tags, and Google OAuth authentication.

**Live at:** `recipes.endless-point.org`

See [SPEC.md](./SPEC.md) for the full specification.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **API Layer:** tRPC v11 — end-to-end type safety
- **ORM:** Prisma 6
- **Database:** PostgreSQL 16 (Docker container)
- **Authentication:** Auth.js v5 (NextAuth) — Google OAuth with Prisma adapter
- **UI Library:** Ant Design 6
- **Validation:** Zod 4
- **Recipe Parser:** `@cooklang/cooklang` (official WASM build)
- **Testing:** Jest + @swc/jest
- **Deployment:** Docker Compose, self-hosted

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

### Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure the environment:

   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL and run migrations:

   ```bash
   npm run db:migrate
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Docker deployment

```bash
docker compose up -d --build
```

Set `NEXTAUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `ADMIN_EMAILS` in your environment (see `docker-compose.yml` and `.env.example`).

## Features

- Recipe CRUD with a Cooklang editor and live preview
- Parsed recipe view: aggregated ingredients with quantities, cookware, timers, and instructions
- Full-text search and tag filtering
- Light/dark theme toggle
- English and Brazilian Portuguese (pt-BR) translations
- Visibility controls (public vs. hidden recipes)
- Multi-user access with Google OAuth; admins (email allowlist) manage recipes
- Export recipes as standalone `.cook` files
- REST API for external clients / AI agents
- MCP server exposing recipes to AI agents

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm test` | Run tests (Jest) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run db:generate` | Generate Prisma client / run migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema to the database |
| `npm run db:studio` | Open Prisma Studio |

## CI

On every PR to `main`, GitHub Actions runs tests, typecheck, lint, and a production build (see `.github/workflows/ci.yml`).
