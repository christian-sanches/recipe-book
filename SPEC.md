# Recipe Book — Cooklang Recipe Web App

## Overview

A self-hosted web application for managing cooking recipes using the [Cooklang](https://cooklang.org) markup language. Recipes are written in Cooklang syntax, parsed with the official WASM build of `cooklang-rs`, and stored in a PostgreSQL database. The app provides a clean CRUD interface, search, tags, and Google OAuth authentication for multi-user access.

**Live at:** `recipes.fleflis.dev`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14+ (App Router) |
| **API Layer** | tRPC v11 — end-to-end type safety |
| **ORM** | Prisma |
| **Database** | PostgreSQL 16 (Docker container) |
| **Authentication** | Auth.js v5 (NextAuth) — Google OAuth |
| **UI Library** | Ant Design 5 |
| **Recipe Parser** | `@cooklang/cooklang` (official WASM build) |
| **Deployment** | Docker Compose (self-hosted on Hermes VM) |
| **Reverse Proxy** | Caddy (auto SSL via Let's Encrypt) |

---

## Data Model

```prisma
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String?  @unique
  image     String?
  role      Role     @default(VIEWER)
  recipes   Recipe[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  ADMIN
  VIEWER
}

model Recipe {
  id              String   @id @default(cuid())
  title           String
  slug            String   @unique
  cooklangContent String   @map("cooklang_content") // raw .cook source
  description     String?
  servings        Int?
  prepTime        Int?     @map("prep_time") // minutes
  cookTime        Int?     @map("cook_time") // minutes
  totalTime       Int?     @map("total_time") // minutes
  source          String?  // URL or book reference
  image           String?  // image URL
  visibility      Visibility @default(PUBLIC)
  authorId        String   @map("author_id")
  author          User     @relation(fields: [authorId], references: [id])
  tags            Tag[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([authorId])
  @@index([slug])
  @@index([title])
}

enum Visibility {
  PUBLIC
  HIDDEN
}

model Tag {
  id      String          @id @default(cuid())
  name    String
  slug    String          @unique
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
3. On the client side, `@cooklang/cooklang` (WASM) parses the content for live preview
4. On the server side, the parser extracts ingredients, cookware, timers, and metadata for indexing and search
5. Recipes can be exported as standalone `.cook` files

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

Using `@cooklang/cooklang` (WASM) with **all extensions enabled**:

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
| **Component aliases** | `@white wine|wine{}` |
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
│   └── workflows/
│       └── ci.yml              # CI pipeline
├── prisma/
│   └── schema.prisma            # Database schema
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Ant Design provider)
│   │   ├── page.tsx             # Home — recipe grid
│   │   ├── recipes/
│   │   │   ├── page.tsx         # Recipe list with search
│   │   │   ├── new/
│   │   │   │   └── page.tsx     # Create recipe
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx     # Recipe detail (parsed view)
│   │   │   └── [slug]/edit/
│   │   │       └── page.tsx     # Edit recipe
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
│   │   ├── RecipeCard.tsx       # Recipe card for grid
│   │   ├── RecipeForm.tsx       # Create/edit recipe form
│   │   ├── CooklangEditor.tsx   # Code editor with live preview
│   │   ├── RecipeViewer.tsx     # Parsed recipe display
│   │   ├── SearchBar.tsx        # Full-text search
│   │   ├── TagSelector.tsx      # Tag picker
│   │   └── Layout.tsx           # App shell (navbar, auth)
│   ├── server/
│   │   ├── api/
│   │   │   └── routers/
│   │   │       ├── recipe.ts    # Recipe CRUD routes
│   │   │       └── tag.ts       # Tag routes
│   │   ├── db.ts                # Prisma client
│   │   └── auth.ts              # Auth.js config
│   ├── trpc/
│   │   ├── server.ts            # tRPC context & router
│   │   └── client.ts            # tRPC client helpers
│   └── lib/
│       ├── cooklang.ts          # WASM parser wrapper
│       └── utils.ts             # Shared utilities
├── public/
│   └── images/                  # Uploaded recipe images
├── docker-compose.yml           # PostgreSQL + app
├── Dockerfile                   # Multi-stage Next.js build
├── Caddyfile                    # Reverse proxy with auto SSL
├── next.config.ts
├── package.json
├── tsconfig.json
├── .env.example
└── SPEC.md                      # This document
```

---

## Pages & Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Home page — featured/grid of recipes |
| `/recipes` | Public | Full recipe list with search & tag filters |
| `/recipes/[slug]` | Public | Single recipe detail (parsed & formatted) |
| `/recipes/new` | Admin | Create a new recipe |
| `/recipes/[slug]/edit` | Admin | Edit existing recipe |
| `/login` | Public | Google OAuth login page |
| `/api/auth/*` | — | Auth.js API routes |
| `/api/trpc/*` | — | tRPC API routes |

---

## API (tRPC Routers)

### Recipe Router

- `recipe.list(filters?)` → `Recipe[]` — list/search recipes
- `recipe.bySlug(slug)` → `Recipe` — get single recipe
- `recipe.create(input)` → `Recipe` — create recipe (admin only)
- `recipe.update(id, input)` → `Recipe` — update recipe (admin only)
- `recipe.delete(id)` → `void` — delete recipe (admin only)
- `recipe.export(id)` → `string` — export as .cook file

### Tag Router

- `tag.list()` → `Tag[]` — all tags
- `tag.create(name)` → `Tag` — create tag

---

## Search

- Full-text search over recipe titles, descriptions, and Cooklang content
- Filter by tags
- Filter by visibility (admin sees hidden, public only sees public)
- Uses PostgreSQL full-text search (`tsvector`/`tsquery`) or simple `ILIKE` for MVP

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

## Future (Post-MVP)

- [ ] **Scaling** — adjust ingredient quantities for desired servings
- [ ] **Shopping list** — aggregate ingredients across selected recipes
- [ ] **Image upload** — attach photos to recipes
- [ ] **MCP Server** — expose recipes to AI agents (ChatGPT, Claude) via Model Context Protocol
- [ ] **Import/Export** — bulk import from `.cook` files, export collection
- [ ] **Sub-recipes** — proper support for `@@` recipe references
- [ ] **Nutritional info** — optional metadata
- [ ] **Print-friendly view** — clean printable recipe cards
