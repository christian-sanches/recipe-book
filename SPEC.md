# Recipe Book — Cooklang Recipe Web App

## Overview

A self-hosted web application for managing cooking recipes using the [Cooklang](https://cooklang.org) markup language. Recipes are written in Cooklang syntax, parsed with the official WASM build of `cooklang-rs`, and stored in a PostgreSQL database. The app provides a clean CRUD interface, search, tags, and Google OAuth authentication for multi-user access.

**Live at:** `recipes.fleflis.dev`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Runtime** | React 19 |
| **API Layer** | tRPC v11 — end-to-end type safety |
| **ORM** | Prisma 6 |
| **Database** | PostgreSQL 16 (Docker container) |
| **Authentication** | Auth.js v5 (NextAuth) — Google OAuth with Prisma adapter |
| **UI Library** | Ant Design 6 |
| **Validation** | Zod 4 |
| **Recipe Parser** | `@cooklang/cooklang` v0.18 (official WASM build) |
| **Dev Server** | Next.js Turbopack (`next dev --turbo`) |
| **Deployment** | Docker Compose (self-hosted on Hermes VM) |
| **Reverse Proxy** | Caddy (auto SSL via Let's Encrypt) |
| **Testing** | Jest + @swc/jest |

---

## Data Model

```prisma
enum Role {
  ADMIN
  VIEWER
}

enum Visibility {
  PUBLIC
  HIDDEN
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(VIEWER)
  recipes       Recipe[]
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  refresh_token_expires_in Int?

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Recipe {
  id              String     @id @default(cuid())
  title           String
  slug            String     @unique
  cooklangContent String     @map("cooklang_content")
  description     String?
  servings        Int?
  prepTime        Int?       @map("prep_time")
  cookTime        Int?       @map("cook_time")
  totalTime       Int?       @map("total_time")
  source          String?
  image           String?
  visibility      Visibility @default(PUBLIC)
  authorId        String     @map("author_id")
  author          User       @relation(fields: [authorId], references: [id])
  tags            RecipeTag[]
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([authorId])
  @@index([slug])
  @@index([title])
}

model Tag {
  id      String      @id @default(cuid())
  name    String
  slug    String      @unique
  recipes RecipeTag[]

  @@index([slug])
}

model RecipeTag {
  recipeId String @map("recipe_id")
  tagId    String @map("tag_id")
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([recipeId, tagId])
}
```

### Data Flow

1. User writes/edits a recipe in Cooklang syntax inside the web editor
2. The raw `.cook` content is stored in PostgreSQL as the source of truth
3. On the client side, `@cooklang/cooklang` parses the content for live preview and HTML rendering
4. On the server side, the raw content is stored for retrieval; parsing/rendering happens client-side
5. Recipes can be exported as standalone `.cook` content via tRPC

---

## Authentication & Authorization

- **Provider:** Google OAuth via Auth.js v5
- **Access model:**
  - **Anyone** can view public recipes (no login required)
  - **Authenticated users** can view hidden recipes
  - **Admin users** (email allowlist) can create, edit, and delete recipes
- **Allowlist:** Configured via `ADMIN_EMAILS` environment variable (comma-separated)
- The first user to log in via Google gets ADMIN role automatically if allowlist is empty

---

## Cooklang Features

Using `@cooklang/cooklang` with **all extensions enabled**:

| Feature | Syntax |
|---------|--------|
| **Ingredients** | `@flour{2%cups}` |
| **Cookware** | `#pan` |
| **Timers** | `~{30%minutes}` |
| **Recipe references** | `@@tomato sauce{200%ml}` |
| **Ingredient references** | `@&flour{300%g}` |
| **Hidden ingredients** | `@-salt` |
| **Optional ingredients** | `@?thyme` |
| **Force new ingredient** | `@+flour` |
| **Component aliases** | `@white wine\|wine{}` |
| **Intermediate preparations** | `@&(~1)dough{}` |
| **Range values** | `@eggs{2-4}` |
| **Temperature detection** | `180 ºC` |
| **Advanced units** | `@water{1 L}` |
| **Modes** | `>> [mode]: ingredients` |
| **Metadata** | `>> servings: 4` |

---

## Project Structure

```
recipe-book/
├── .github/
│   ├── workflows/
│   │   └── ci.yml              # CI pipeline (test, lint, typecheck, build)
│   └── CODEOWNERS
├── prisma/
│   └── schema.prisma            # Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Ant Design provider)
│   │   ├── page.tsx             # Home — recipe grid with search
│   │   ├── providers.tsx        # Session & tRPC providers
│   │   ├── recipes/
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx     # Recipe detail (parsed view)
│   │   │   └── [slug]/edit/
│   │   │       └── page.tsx     # Edit recipe
│   │   ├── recipes/new/
│   │   │   └── page.tsx         # Create recipe
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts # Auth.js handler
│   │   │   └── trpc/
│   │   │       └── [trpc]/
│   │   │           └── route.ts # tRPC HTTP handler
│   │   └── login/
│   │       └── page.tsx         # Login page
│   ├── components/
│   │   ├── CooklangEditor.tsx   # Cooklang code editor
│   │   ├── Layout.tsx           # App shell (navbar, auth buttons)
│   │   ├── RecipeCard.tsx       # Recipe card for grid
│   │   ├── RecipeForm.tsx       # Create/edit recipe form
│   │   ├── RecipeViewer.tsx     # Parsed recipe display (official Cooklang renderer)
│   │   ├── SearchBar.tsx        # Text search with tag filters
│   │   └── TagSelector.tsx      # Tag picker
│   ├── lib/
│   │   └── utils.ts             # Shared utilities (slugify, etc.)
│   ├── models/
│   │   ├── recipe.ts            # Zod schemas for recipe CRUD
│   │   └── tag.ts               # Zod schemas for tags
│   ├── server/
│   │   ├── auth/
│   │   │   ├── config.ts        # Auth.js configuration
│   │   │   └── index.ts         # Auth.js helpers
│   │   └── db.ts                # Prisma client singleton
│   ├── styles/
│   │   └── globals.css          # Global styles + Cooklang step styles
│   ├── trpc/
│   │   ├── init.ts              # tRPC context & procedure builders
│   │   ├── react.tsx            # tRPC React provider
│   │   ├── root.ts              # App router (recipe + tag)
│   │   └── routers/
│   │       ├── recipe.ts        # Recipe CRUD routes
│   │       └── tag.ts           # Tag routes
│   ├── __tests__/
│   │   ├── utils.test.ts        # Tests for slugify/generateSlug
│   │   └── models.test.ts       # Tests for Zod schemas
│   └── env.ts                   # Environment validation (Zod)
├── public/
├── docker-compose.yml           # PostgreSQL + app
├── docker-compose.dev.yml       # Dev overrides
├── Dockerfile                   # Multi-stage Next.js build
├── docker-entrypoint.sh         # Container entrypoint
├── Caddyfile                    # Reverse proxy with auto SSL
├── jest.config.ts               # Jest configuration
├── next.config.ts
├── package.json
├── tsconfig.json
├── .env.example
├── .env
├── .dockerignore
├── .gitignore
├── README.md
└── SPEC.md                      # This document
```

---

## Pages & Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Home page — recipe grid with search & tag filters |
| `/recipes/[slug]` | Public | Single recipe detail (parsed & formatted) |
| `/recipes/[slug]/edit` | Admin | Edit existing recipe |
| `/recipes/new` | Admin | Create a new recipe |
| `/login` | Public | Google OAuth login page |
| `/api/auth/*` | — | Auth.js API routes |
| `/api/trpc/*` | — | tRPC API routes |

---

## API (tRPC Routers)

### Recipe Router

| Procedure | Auth | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `recipe.list` | Public | `{ query?, tagSlugs?, visibility?, limit?, offset? }` | `{ items: Recipe[], total: number }` | List/search recipes with tag filter, visibility-aware |
| `recipe.bySlug` | Public | `{ slug: string }` | `Recipe` | Get single recipe (404 if hidden + unauthenticated) |
| `recipe.create` | Admin | `createRecipeSchema` | `Recipe` | Create new recipe with auto-generated slug |
| `recipe.update` | Admin | `updateRecipeSchema` | `Recipe` | Update recipe, reconnect tags |
| `recipe.delete` | Admin | `{ id: string }` | `{ success: true }` | Delete recipe |
| `recipe.export` | Public | `{ slug: string }` | `string` | Export raw Cooklang content |

### Tag Router

| Procedure | Auth | Input | Output | Description |
|-----------|------|-------|--------|-------------|
| `tag.list` | Public | — | `Tag[]` | All tags with recipe counts |
| `tag.create` | Admin | `{ name: string }` | `Tag` | Create tag (dedup by slug) |

---

## Search

- Full-text search over recipe titles, descriptions, and Cooklang content
- Filter by tags
- Filter by visibility (admin sees hidden, public only sees public)
- Uses PostgreSQL `ILIKE` for MVP

---

## Deployment

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: recipe_book
      POSTGRES_USER: recipe_book
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://recipe_book:${DB_PASSWORD}@postgres:5432/recipe_book
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: https://recipes.fleflis.dev
      AUTH_GOOGLE_ID: ${AUTH_GOOGLE_ID}
      AUTH_GOOGLE_SECRET: ${AUTH_GOOGLE_SECRET}
      ADMIN_EMAILS: ${ADMIN_EMAILS}
    depends_on:
      - postgres

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - app

volumes:
  pgdata:
  caddy_data:
```

### DNS

A record for `recipes.fleflis.dev` points to this VM's IP address. Caddy handles automatic SSL certificate provisioning via Let's Encrypt.

---

## CI Pipeline

On every PR to `main`, GitHub Actions runs:

| Step | Command | Description |
|------|---------|-------------|
| **Test** | `npm test` | Unit tests (Jest) |
| **Typecheck** | `npm run typecheck` | TypeScript type checking |
| **Lint** | `npm run lint` | ESLint |
| **Build** | `npm run build` | Next.js production build |

---

## Future (Post-MVP)

- [ ] **Scaling** — adjust ingredient quantities for desired servings
- [ ] **Shopping list** — aggregate ingredients across selected recipes
- [ ] **Image upload** — attach photos to recipes
- [ ] **MCP Server** — expose recipes to AI agents (ChatGPT, Claude) via Model Context Protocol
- [ ] **Import/Export** — bulk import from `.cook` files, export collection
- [ ] **Sub-recipes** — proper support for `@@` recipe references
- [ ] **Nutritional info** — optional metadata
- [ ] **Print-friendly view** — clean printable recipe cards
