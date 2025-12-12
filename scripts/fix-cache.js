const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Fetch all pages
  const { data: pages, error: fetchError } = await supabase
    .from('wiki_pages')
    .select('id, slug, content');

  if (fetchError) {
    console.log('Error fetching:', fetchError);
    return;
  }

  // Find pages where content doesn't start with # (heading)
  const badPages = pages.filter(p => {
    const content = (p.content || '').trim();
    // Content should start with a heading (#) not a link ([)
    if (content.startsWith('[')) return true;
    if (content.length > 0 && content.charAt(0) !== '#') return true;
    return false;
  });

  console.log('Found', badPages.length, 'pages with malformed content');

  for (const page of badPages) {
    console.log('Deleting:', page.slug);
    const { error } = await supabase
      .from('wiki_pages')
      .delete()
      .eq('id', page.id);
    if (error) {
      console.log('Error deleting', page.slug, error);
    }
  }

  console.log('Done!');
}

main();
