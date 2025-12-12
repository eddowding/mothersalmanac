/**
 * Script to clear wiki pages with old link format
 * Run with: npx tsx scripts/clear-wiki-cache.ts
 */

import { createClient } from '@supabase/supabase-js'

async function clearOldFormatPages() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log('Looking for pages with old link format...')

  // First, find pages with the old format
  const { data: pages, error: fetchError } = await supabase
    .from('wiki_pages')
    .select('id, slug, content')

  if (fetchError) {
    console.error('Error fetching pages:', fetchError)
    process.exit(1)
  }

  const pagesToDelete = pages?.filter(p =>
    p.content?.includes('{: .wiki-link-')
  ) || []

  console.log(`Found ${pagesToDelete.length} pages with old format`)

  if (pagesToDelete.length === 0) {
    console.log('No pages to delete')
    return
  }

  // Delete them
  for (const page of pagesToDelete) {
    console.log(`Deleting: ${page.slug}`)
    const { error } = await supabase
      .from('wiki_pages')
      .delete()
      .eq('id', page.id)

    if (error) {
      console.error(`Failed to delete ${page.slug}:`, error)
    } else {
      console.log(`Deleted: ${page.slug}`)
    }
  }

  console.log('Done!')
}

clearOldFormatPages().catch(console.error)
