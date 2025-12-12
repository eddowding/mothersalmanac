# Mother's Almanac

> A living encyclopedia powered by AI that grows with your questions

Mother's Almanac is an AI-powered wiki system that dynamically generates and maintains interconnected knowledge pages. Built with Next.js 15, Supabase, and Claude AI.

![Mother's Almanac](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-2.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### Core Features
- **AI-Powered Wiki Generation**: Automatically generates comprehensive wiki pages using Claude 3.5 Sonnet
- **Intelligent Caching**: Smart caching system with confidence scoring and automatic regeneration
- **RAG Pipeline**: Upload documents and query them with AI-powered retrieval
- **Semantic Search**: Find related content across the knowledge base
- **Link Injection**: Automatic internal linking between related pages
- **Real-time Analytics**: Track views, searches, generations, and costs

### Admin Features
- **Dashboard**: Real-time stats, cost monitoring, and system health
- **Document Management**: Upload and process documents (PDF, DOCX, TXT)
- **Cache Management**: View, regenerate, and invalidate wiki pages
- **User Management**: Admin role-based access control
- **Cost Tracking**: Monitor API usage and costs

### Performance
- **ISR (Incremental Static Regeneration)**: Popular pages cached at the edge
- **Edge Functions**: Fast response times with Vercel Edge
- **Optimized Caching**: Multi-level caching strategy
- **Bundle Optimization**: Code splitting and lazy loading

### SEO & Metadata
- **Dynamic Metadata**: Generated for each page
- **Open Graph Images**: Auto-generated social sharing images
- **Structured Data**: JSON-LD for search engines
- **Sitemap**: Dynamic sitemap generation
- **Robots.txt**: Optimized for search engines

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude 3.5 Sonnet
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Anthropic API key
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mothersalmanac.git
   cd mothersalmanac
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Site
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Anthropic
   ANTHROPIC_API_KEY=your-anthropic-api-key

   # Cron Security
   CRON_SECRET=$(openssl rand -base64 32)
   ```

4. **Set up Supabase**

   Run the migrations:
   ```bash
   # Using Supabase MCP (recommended)
   # Migrations are in /supabase/migrations/

   # Or use Supabase CLI
   supabase db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### First Steps

1. **Create an admin user**
   - Sign up at `/auth/signup`
   - Manually set role to 'admin' in `user_profiles` table

2. **Upload documents (optional)**
   - Go to `/admin/documents`
   - Upload PDF, DOCX, or TXT files
   - Documents will be processed for RAG

3. **Generate your first wiki page**
   - Enter a topic on the homepage
   - Wait for generation (15-30 seconds)
   - Page is cached for future visitors

## Architecture

### Directory Structure

```
mothersalmanac/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin panel
│   ├── api/               # API routes
│   │   ├── cron/         # Cron jobs
│   │   ├── health/       # Health check
│   │   ├── og/           # OG image generation
│   │   └── wiki/         # Wiki API
│   ├── auth/             # Authentication pages
│   ├── wiki/             # Wiki pages
│   ├── error.tsx         # Error boundary
│   ├── global-error.tsx  # Global error handler
│   ├── layout.tsx        # Root layout
│   ├── not-found.tsx     # 404 page
│   ├── page.tsx          # Homepage
│   ├── robots.ts         # Robots.txt
│   └── sitemap.ts        # Dynamic sitemap
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── providers/        # Context providers
├── lib/                   # Library code
│   ├── analytics/        # Analytics & tracking
│   ├── anthropic/        # Claude integration
│   ├── auth/             # Auth utilities
│   ├── errors/           # Error handling
│   ├── performance/      # Performance utilities
│   ├── rag/              # RAG pipeline
│   ├── seo/              # SEO utilities
│   ├── supabase/         # Supabase client
│   └── wiki/             # Wiki system
├── supabase/             # Supabase configuration
│   └── migrations/       # Database migrations
├── types/                # TypeScript types
├── .env.local.example    # Environment template
├── next.config.js        # Next.js config
├── package.json          # Dependencies
├── tailwind.config.js    # Tailwind config
├── tsconfig.json         # TypeScript config
└── vercel.json           # Vercel config
```

### Key Systems

#### Wiki Generation
1. User requests topic
2. System checks cache
3. If not cached, generates with Claude
4. Post-processes (links, formatting)
5. Stores in cache with confidence score
6. Returns to user

#### RAG Pipeline
1. Document upload
2. Text extraction
3. Chunking (1500 chars, 200 overlap)
4. Embedding generation
5. Storage in Supabase
6. Query matching with similarity search

#### Caching Strategy
- **L1**: Supabase wiki_cache table
- **L2**: Vercel Edge cache (ISR)
- **L3**: CDN cache (popular pages)
- **Invalidation**: Automatic based on confidence and age

## Deployment

### Vercel (Recommended)

1. **Connect repository to Vercel**
   ```bash
   vercel link
   ```

2. **Add environment variables**
   - Go to Vercel dashboard
   - Add all variables from `.env.local`
   - Include production values

3. **Configure Supabase**
   - Add production URL to Supabase redirect URLs
   - Format: `https://yourdomain.com/auth/callback`

4. **Deploy**
   ```bash
   vercel --prod
   ```

5. **Set up cron jobs**
   - Cron jobs are configured in `vercel.json`
   - Add `CRON_SECRET` to Vercel environment variables
   - Vercel automatically runs on schedule

### Post-Deployment

1. **Verify health**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Test authentication**
   - Sign up a user
   - Verify email redirect works
   - Set admin role in database

3. **Generate test pages**
   - Create a few wiki pages
   - Verify caching works
   - Check analytics

## Configuration

### Environment Variables

See `.env.local.example` for all options. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key (safe for client)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (server-only)
- `ANTHROPIC_API_KEY`: Claude API key
- `NEXT_PUBLIC_SITE_URL`: Your site URL
- `CRON_SECRET`: Secret for protecting cron endpoints

### Cron Jobs

Configured in `vercel.json`:

- **Regenerate Stale**: Every 6 hours (`0 */6 * * *`)
- **Cleanup**: Daily at 2 AM (`0 2 * * *`)
- **Stats**: Daily at midnight (`0 0 * * *`)

### Performance Tuning

Edit `lib/wiki/config.ts`:

```typescript
export const WIKI_CONFIG = {
  cacheTTL: 48 * 60 * 60 * 1000, // 48 hours
  maxCachedPages: 1000,
  regenBatchSize: 10,
  popularThreshold: 10,
  minConfidence: 0.3,
}
```

## Analytics

### Tracked Metrics

- **Page Views**: All page views with referrer
- **Searches**: User search queries and results
- **Generations**: Wiki page generations with timing
- **Costs**: API usage and estimated costs

### Dashboard

Access at `/admin/dashboard`:

- Real-time stats
- Cost monitoring
- Performance metrics
- Top pages and searches
- System health

## API Reference

### Public Endpoints

- `GET /api/wiki/generate` - Generate wiki page
- `GET /api/wiki/search` - Search wiki pages
- `GET /api/health` - System health check

### Admin Endpoints

- `POST /api/admin/documents/upload` - Upload document
- `GET /api/admin/analytics` - Get analytics
- `POST /api/wiki/invalidate` - Invalidate cache

### Cron Endpoints

Protected with `CRON_SECRET`:

- `GET /api/cron/regenerate-stale` - Regenerate stale pages
- `GET /api/cron/cleanup` - Clean old data
- `GET /api/cron/stats` - Generate daily stats

## Development

### Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run verify       # Verify setup
npm run test:wiki    # Test wiki system
```

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Tailwind CSS
- shadcn/ui components

### Testing

```bash
# Test wiki generation
npm run test:wiki

# Test document processing
npm run test:docs

# Verify full setup
npm run verify
```

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
- Run `npm install` to ensure all types are installed
- Check `tsconfig.json` for strict mode issues

**Authentication not working**
- Verify Supabase redirect URLs include `/auth/callback`
- Check environment variables are set correctly
- Ensure `NEXT_PUBLIC_SITE_URL` matches your domain

**Cron jobs not running**
- Verify `CRON_SECRET` is set in Vercel
- Check Vercel logs for cron execution
- Ensure endpoints return 200 status

**Wiki generation slow**
- Check Anthropic API status
- Verify database connection
- Monitor Vercel function duration

## Security

### Best Practices

- Never commit `.env.local`
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Rotate `CRON_SECRET` regularly
- Use RLS policies in Supabase
- Implement rate limiting for public endpoints

### RLS Policies

All Supabase tables use Row-Level Security:
- Public read access to wiki_cache
- Admin-only write access
- User-scoped analytics data

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

MIT License - see LICENSE file

## Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@mothersalmanac.com

## Roadmap

- [ ] Multi-language support
- [ ] Voice input for queries
- [ ] Real-time collaboration
- [ ] Advanced visualizations
- [ ] Mobile app
- [ ] Plugin system

## Credits

Built with:
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Anthropic Claude](https://anthropic.com)
- [Vercel](https://vercel.com)
- [shadcn/ui](https://ui.shadcn.com)

---

Made with care for Mother's Almanac
