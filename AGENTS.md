<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The Memory Jar — Antigravity UI/UX-Only Rules

## Scope

Antigravity is being used only for:

- visual design
- UI layout
- responsive design
- accessibility
- interaction design
- animation and motion
- component styling
- design-system consistency
- loading, empty, error and success states
- touch and gesture polish
- visual performance improvements

## Mandatory Skills

For visual implementation, use:

- tmj-ui-only
- emil-design-eng

Use when relevant:

- apple-design for mobile gestures, sheets, spring motion and touch interactions
- animation-vocabulary to identify the correct animation terminology
- review-animations after implementing animation changes
- improve-animations for audit and planning only

## Strictly Forbidden Without Explicit User Approval

Do not modify:

- Supabase schema
- SQL migrations
- Row Level Security
- database functions or triggers
- authentication
- session behavior
- relationship membership logic
- storage buckets or storage policies
- signed URL logic
- memory CRUD business logic
- comments or reactions business logic
- Time Capsule state transitions
- Realtime subscriptions or presence logic
- push notification server logic
- VAPID configuration
- Service Worker caching rules
- API routes
- Server Actions
- middleware or proxy authentication
- environment variables
- deployment configuration
- Vercel configuration
- GitHub workflows

## Forbidden Paths

Do not edit these paths unless the user explicitly approves the exact file:

- supabase/**
- src/app/api/**
- src/app/actions/**
- src/lib/supabase/**
- src/lib/push/**
- src/services/**
- src/middleware.ts
- src/proxy.ts
- src/app/sw.ts
- .env*
- vercel.json
- next.config.*
- package.json
- package-lock.json

## Allowed Areas

UI work may normally modify:

- src/components/**
- src/styles/**
- src/app/globals.css
- route-level loading and error UI
- public decorative assets
- existing presentational hooks
- design tokens
- accessibility attributes
- responsive CSS
- animation configuration

A file in an allowed area must still not have its data or business logic changed.

## Working Rules

Before editing:

1. State the visual problem.
2. List the exact files proposed for modification.
3. Confirm that no backend or business-logic file is required.
4. Reuse the existing design system and dependencies.
5. Avoid installing packages unless the user explicitly approves.

During implementation:

- preserve props, API contracts and database shapes
- preserve Supabase queries
- preserve Server Actions
- preserve route behavior
- do not rename business fields
- do not change event payloads
- do not alter caching or security behavior
- do not introduce placeholder assets into production
- do not use external assets when existing local assets are available

After implementation:

1. Use review-animations for motion changes.
2. Run npm run lint.
3. Run npx tsc --noEmit.
4. Run npm run build.
5. Report every changed file.
6. Explicitly confirm that backend, database and security logic were untouched.

## Stop Condition

If a UI request appears to require a backend, schema, API, Auth, Storage,
Realtime, PWA or deployment change:

STOP.

Explain the dependency and request explicit approval before modifying it.

For this workspace, perform UI/UX work only.

Always use the tmj-ui-only and emil-design-eng skills for visual implementation.

Do not modify Supabase, database migrations, RLS, Auth, Storage, API routes,
Server Actions, Realtime, push notifications, Service Worker, PWA caching,
environment variables or deployment configuration.

Before editing, list the exact proposed files.

If the requested UI change requires backend work, stop and ask for explicit
approval.

After animation changes, use review-animations and fix all blocking findings.

Run lint, TypeScript and production build after implementation.