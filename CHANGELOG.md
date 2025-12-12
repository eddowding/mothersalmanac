# Changelog

All notable changes to Mother's Almanac will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-12

### Added
- **Command Palette Search**: Comprehensive ⌘K search interface
  - Searches both wiki_pages and wiki_stubs tables
  - Grouped results (Existing Pages, Suggested Topics)
  - Recent searches with localStorage persistence
  - Confidence badges (Strong/Medium/Weak)
  - View counts and mention counts
  - "Create new page" option for any query
  - Full keyboard navigation (arrows, enter, escape)
  - React Query caching (30s stale time)
  - Components: `CommandPalette.tsx`, API: `command-search/route.ts`

- **Wiki System**: AI-powered knowledge base
  - Dynamic page generation using Claude 3.5 Sonnet
  - Streaming generation with real-time updates
  - Smart caching with confidence scoring
  - Entity extraction and automatic linking
  - Wiki stubs for suggested topics
  - Related pages and backlinks
  - Table of contents generation
  - Reading modes (standard/detailed/brief)
  - Print-optimized CSS
  - Dynamic slug handling for any URL

- **Document Processing (RAG Pipeline)**
  - Upload support for PDF, DOCX, TXT
  - Text extraction with dedicated extractors
  - Chunking strategy (1500 chars, 200 overlap)
  - Embedding generation via Anthropic
  - Vector similarity search with pgvector
  - Context retrieval for page generation
  - Document management UI
  - Chunk browser for debugging
  - Search tester tool

- **Admin Panel**
  - Real-time dashboard with stats
  - Document upload and management
  - Cache management tools
  - Analytics and tracking
  - User role management (admin/user)
  - Settings configuration
  - Cost monitoring
  - Stubs management
  - Link analyzer
  - Processing status viewer

- **Chat System**
  - Streaming chat interface
  - RAG-powered Q&A
  - Chat history and persistence
  - Source attribution
  - Feedback collection
  - Typing indicators
  - Message formatting
  - Conversation management

- **Search Features**
  - Instant search component
  - Search bar with recent searches
  - Wiki page search API
  - Stub/suggestion search
  - Multi-source command palette
  - Search analytics

- **Authentication**
  - Email/password authentication
  - OAuth integration (ready)
  - User profiles
  - Role-based access control
  - Auth callback handling
  - Protected routes

- **SEO & Metadata**
  - Dynamic metadata generation
  - Open Graph images (auto-generated)
  - Sitemap generation
  - Robots.txt configuration
  - Structured data (JSON-LD)
  - Page-specific metadata

- **Performance Optimizations**
  - Multi-level caching (DB, Edge, CDN)
  - React Query for client-side caching
  - Code splitting and lazy loading
  - Image optimization with Sharp
  - Database query optimization
  - Incremental Static Regeneration
  - Edge function deployment

- **UI Components (ShadCN)**
  - Badge, Button, Card
  - Command (for palette)
  - Dialog, Dropdown Menu
  - Input, Popover
  - Progress, Scroll Area
  - Select, Separator
  - Skeleton loaders
  - Slider, Switch
  - Table, Tabs
  - Tooltip, Sonner (toasts)

- **Database Schema**
  - user_profiles table
  - wiki_pages table (with caching)
  - wiki_stubs table (suggested topics)
  - wiki_links table (internal links)
  - documents table
  - document_chunks table (with embeddings)
  - chat_conversations table
  - chat_messages table
  - analytics_events table
  - search_queries table
  - Row-Level Security (RLS) on all tables

- **API Endpoints** (30+)
  - `/api/wiki/generate-stream` - Stream generation
  - `/api/wiki/command-search` - Command palette search
  - `/api/wiki/search` - Page search
  - `/api/wiki/popular` - Popular pages
  - `/api/wiki/suggestions` - Page suggestions
  - `/api/chat` - Chat interface
  - `/api/admin/*` - Admin panel APIs
  - `/api/cron/*` - Cron jobs
  - `/api/health` - Health check

- **Cron Jobs**
  - Regenerate stale pages (every 6 hours)
  - Cleanup old data (daily at 2 AM)
  - Generate daily stats (daily at midnight)

- **Documentation** (17 files)
  - README.md - Project overview
  - IMPLEMENTATION_STATUS.md - Status tracking
  - CHANGELOG.md - Version history
  - docs/API.md - API reference
  - docs/DEPLOYMENT.md - Deployment guide
  - docs/RAG_PIPELINE.md - RAG system
  - docs/ADMIN_GUIDE.md - Admin panel
  - docs/WIKI_UI_COMPONENTS.md - Components
  - docs/COMPONENT_ARCHITECTURE.md - Architecture
  - docs/PERFORMANCE_METRICS.md - Performance
  - docs/ACCESSIBILITY_AUDIT.md - A11y

- **Scripts**
  - verify-setup.ts - Setup verification
  - test-wiki-generator.ts - Wiki testing
  - test-wiki-system.ts - System testing
  - regenerate-stale-pages.ts - Regeneration
  - clear-wiki-cache.ts - Cache clearing
  - extract-all-entities.ts - Entity extraction
  - benchmark-search.ts - Search benchmarking

### Changed
- **Homepage**: Removed trending topics section
  - Simplified layout
  - Removed TrendingUp icon import
  - Cleaner, more focused design

- **Search Bar**: Refactored ⌘K handling
  - Moved keyboard shortcut to CommandPalette
  - Retained visual ⌘K indicator
  - Maintains form functionality

- **Wiki Navigation**: Integrated CommandPalette
  - Globally accessible from WikiNav
  - Available on all pages

- **Prompts**: Updated to UK English
  - All generation prompts use British spelling
  - colour, organise, behaviour, favourite, centre, recognise
  - Applies to wiki, chat, summaries, titles

### Fixed
- Security: Patched Next.js CVE-2025-55183, CVE-2025-55184, CVE-2025-67779
- Build: TypeScript strict mode compliance
- Caching: Confidence-based TTL regeneration
- Search: Case-insensitive ILIKE queries
- Auth: Redirect URL handling

### Deployed
- **Production**: https://mothersalmanac.com
- **Platform**: Vercel
- **GitHub**: https://github.com/eddowding/mothersalmanac
- **Domain**: Cloudflare DNS → Vercel
- **Continuous Deployment**: Enabled

## [Unreleased]

### Planned Features
- Multi-language support
- Voice input for queries
- Real-time collaboration
- Advanced visualizations (knowledge graphs)
- Mobile app
- Plugin system
- Full-text search with ranking
- Fuzzy search
- Search filters (category, confidence)
- Preview on hover in command palette

### Testing Improvements
- Unit tests (0% → 80%)
- Integration tests
- E2E tests with Playwright
- Load testing
- Accessibility testing

### Performance Enhancements
- Edge caching optimization
- Bundle size reduction
- Image lazy loading
- Query optimization
- Cost optimization

---

[1.0.0]: https://github.com/eddowding/mothersalmanac/releases/tag/v1.0.0
