# Mother's Almanac - Project Setup Documentation

## Project Overview

A Next.js 15 application built with TypeScript, featuring a wiki system with AI-powered chat capabilities using Claude API and Supabase backend.

## Technology Stack

### Core Framework
- **Next.js**: 16.0.8 (App Router with Turbopack)
- **React**: 19.2.1
- **TypeScript**: 5.x
- **Node.js**: 20.x

### Styling
- **Tailwind CSS**: 4.x
- **Tailwind Typography**: 0.5.19
- **Class Variance Authority**: 0.7.1
- **clsx** + **tailwind-merge**: For conditional class management

### Backend & Database
- **Supabase Client**: 2.87.1
- **Supabase SSR**: 0.8.0

### AI & Streaming
- **Anthropic SDK**: 0.71.2 (Claude API)
- **Vercel AI SDK**: 5.0.111 (Streaming support)

### Utilities
- **Zod**: 4.1.13 (Schema validation)
- **date-fns**: 4.1.0 (Date utilities)

### UI Components
- **Radix UI**: Various components for accessible UI primitives
  - Dialog: 1.1.15
  - Dropdown Menu: 2.1.16
  - Scroll Area: 1.2.10
  - Separator: 1.1.8
  - Slot: 1.2.4
  - Tabs: 1.1.13
  - Tooltip: 1.2.8
- **Lucide React**: 0.560.0 (Icons)

## Directory Structure

```
mothersalmanac/
├── app/                          # Next.js App Router
│   ├── wiki/                     # Wiki pages and routes
│   ├── admin/                    # Admin interface
│   ├── chat/                     # Chat interface
│   ├── api/                      # API routes
│   └── auth/                     # Authentication routes
├── components/                   # React components
│   ├── wiki/                     # Wiki-specific components
│   ├── chat/                     # Chat UI components
│   ├── ui/                       # Reusable UI components
│   └── admin/                    # Admin UI components
├── lib/                          # Utility libraries
│   ├── supabase/                 # Supabase client configuration
│   └── rag/                      # RAG implementation
├── types/                        # TypeScript type definitions
│   ├── database.ts               # Supabase database types
│   └── wiki.ts                   # Wiki-related types
├── supabase/                     # Supabase configuration
│   └── migrations/               # Database migrations
├── openspec/                     # Project specifications
└── public/                       # Static assets
```

## Environment Variables

Create a `.env.local` file based on `.env.local.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## TypeScript Configuration

Path aliases configured in `tsconfig.json`:
- `@/*` - Root directory
- `@/components/*` - Components directory
- `@/lib/*` - Library utilities
- `@/types/*` - Type definitions

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Build Verification

The project builds successfully with Next.js 16.0.8:
- Compilation time: ~1.4s
- Static routes generated: 2 (/, /_not-found)
- TypeScript compilation: ✓ Passed
- Static page generation: ✓ Completed

## Next Steps

1. Set up Supabase project and configure environment variables
2. Create database schema and run migrations
3. Implement authentication flow with `/auth/callback` route
4. Build wiki page components
5. Implement RAG system for content search
6. Create chat interface with Claude API streaming
7. Set up admin interface for content management

## Important Notes

- All Supabase operations use remote database (no local setup)
- Auth requires `/auth/callback` route with proper redirect URL configuration
- Use Supabase MCP for all migrations and queries
- Project uses Turbopack for faster builds and hot reload
- React 19 with Server Components enabled
