import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWikiPage } from '@/lib/wiki/generator'
import { invalidateCache, cachePage } from '@/lib/wiki/cache'
import { revalidatePath } from 'next/cache'

/**
 * Manual page regeneration endpoint
 * Requires admin authentication
 * Forces regeneration of a specific wiki page
 *
 * POST /api/wiki/regenerate
 * Body: { slug: string }
 * Returns: { success: true, page: CachedPage }
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Step 2: Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Step 3: Parse request body
    const body = await request.json()
    const { slug } = body

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request - "slug" parameter required' },
        { status: 400 }
      )
    }

    console.log(`[Regenerate] Admin ${user.email} regenerating: ${slug}`)

    // Step 4: Get existing page to extract query
    const { data: existingPage } = await supabase
      .from('wiki_pages')
      .select('metadata')
      .eq('slug', slug)
      .single() as { data: { metadata: { query: string } } | null }

    if (!existingPage?.metadata?.query) {
      return NextResponse.json(
        { error: 'Page not found or missing query metadata' },
        { status: 404 }
      )
    }

    const query = existingPage.metadata.query

    // Step 5: Invalidate existing cache
    await invalidateCache(slug)

    // Step 6: Regenerate page using original query
    const generatedPage = await generateWikiPage(query, {
      temperature: 0.7,
      extractEntities: true,
    })

    // Step 7: Update existing page in database
    const { error: updateError } = await (supabase as any)
      .from('wiki_pages')
      .update({
        content: generatedPage.content,
        excerpt: generatedPage.excerpt,
        confidence_score: generatedPage.confidence_score,
        generated_at: generatedPage.generated_at,
        ttl_expires_at: generatedPage.ttl_expires_at,
        published: true, // Force publish on manual regeneration
        metadata: generatedPage.metadata,
      })
      .eq('slug', slug)

    if (updateError) {
      throw new Error(`Failed to update page: ${updateError.message}`)
    }

    // Step 8: Cache new page
    await cachePage({
      ...generatedPage,
      slug,
    })

    // Step 9: Revalidate Next.js cache
    revalidatePath(`/wiki/${slug}`)
    revalidatePath('/wiki')

    console.log(`[Regenerate] Successfully regenerated: ${slug}`)

    return NextResponse.json({
      success: true,
      page: {
        slug,
        title: generatedPage.title,
        confidence_score: generatedPage.confidence_score,
        generated_at: generatedPage.generated_at,
        excerpt: generatedPage.excerpt,
      },
    })
  } catch (error) {
    console.error('[Regenerate] Error:', error)

    return NextResponse.json(
      {
        error: 'Regeneration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Batch regeneration endpoint
 * Regenerates multiple pages in sequence
 *
 * POST /api/wiki/regenerate/batch
 * Body: { slugs: string[] }
 */
export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Parse request
    const body = await request.json()
    const { slugs } = body

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request - "slugs" array required' },
        { status: 400 }
      )
    }

    console.log(`[Batch Regenerate] Processing ${slugs.length} pages`)

    const results = []

    for (const slug of slugs) {
      try {
        // Get existing page query
        const { data: existingPage } = await supabase
          .from('wiki_pages')
          .select('metadata')
          .eq('slug', slug)
          .single() as { data: { metadata: { query: string } } | null }

        if (!existingPage?.metadata?.query) {
          throw new Error('Page not found or missing query metadata')
        }

        const query = existingPage.metadata.query

        await invalidateCache(slug)
        const page = await generateWikiPage(query, {
          temperature: 0.7,
          extractEntities: true,
        })

        // Update existing page
        await (supabase as any)
          .from('wiki_pages')
          .update({
            content: page.content,
            excerpt: page.excerpt,
            confidence_score: page.confidence_score,
            generated_at: page.generated_at,
            ttl_expires_at: page.ttl_expires_at,
            published: true,
            metadata: page.metadata,
          })
          .eq('slug', slug)

        await cachePage({
          ...page,
          slug,
        })
        revalidatePath(`/wiki/${slug}`)

        results.push({
          slug,
          success: true,
          title: page.title,
        })

        console.log(`[Batch Regenerate] Success: ${slug}`)

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`[Batch Regenerate] Failed: ${slug}:`, error)

        results.push({
          slug,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: slugs.length,
        succeeded: successCount,
        failed: slugs.length - successCount,
      },
    })
  } catch (error) {
    console.error('[Batch Regenerate] Error:', error)

    return NextResponse.json(
      {
        error: 'Batch regeneration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
