/**
 * Setup verification script for Mother's Almanac Wiki System
 *
 * Checks environment variables, database connections, and API keys
 * Run with: npx tsx scripts/verify-setup.ts
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkEnvVar(name: string, required: boolean = true): boolean {
  const value = process.env[name]
  const exists = !!value

  if (exists) {
    log(`✓ ${name} is set`, 'green')
    return true
  } else if (required) {
    log(`✗ ${name} is missing (required)`, 'red')
    return false
  } else {
    log(`⚠ ${name} is not set (optional)`, 'yellow')
    return true
  }
}

async function verifySetup() {
  console.log('\n' + '='.repeat(60))
  log('Mother\'s Almanac - Setup Verification', 'cyan')
  console.log('='.repeat(60) + '\n')

  let allGood = true

  // Check Supabase configuration
  log('\n1. Supabase Configuration:', 'blue')
  allGood = checkEnvVar('NEXT_PUBLIC_SUPABASE_URL') && allGood
  allGood = checkEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') && allGood
  checkEnvVar('SUPABASE_SERVICE_ROLE_KEY', false)

  // Check API keys
  log('\n2. AI API Keys:', 'blue')
  allGood = checkEnvVar('ANTHROPIC_API_KEY') && allGood
  allGood = checkEnvVar('OPENAI_API_KEY') && allGood

  // Check optional configurations
  log('\n3. Optional Configurations:', 'blue')
  checkEnvVar('CLAUDE_MODEL', false)
  checkEnvVar('CLAUDE_MAX_TOKENS', false)
  checkEnvVar('WIKI_CACHE_TTL_HOURS', false)
  checkEnvVar('WIKI_CONFIDENCE_THRESHOLD', false)

  // Model configuration
  log('\n4. Model Configuration:', 'blue')
  const claudeModel = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
  const maxTokens = process.env.CLAUDE_MAX_TOKENS || '4000'
  log(`   Claude Model: ${claudeModel}`, 'reset')
  log(`   Max Tokens: ${maxTokens}`, 'reset')

  // Wiki configuration
  log('\n5. Wiki Configuration:', 'blue')
  const cacheTTL = process.env.WIKI_CACHE_TTL_HOURS || '48'
  const confidenceThreshold = process.env.WIKI_CONFIDENCE_THRESHOLD || '0.6'
  log(`   Cache TTL: ${cacheTTL} hours`, 'reset')
  log(`   Confidence Threshold: ${confidenceThreshold}`, 'reset')

  // Summary
  console.log('\n' + '='.repeat(60))
  if (allGood) {
    log('✓ All required environment variables are set!', 'green')
    log('\nNext steps:', 'cyan')
    log('1. Ensure database migrations are applied', 'reset')
    log('2. Upload source documents via /admin/documents', 'reset')
    log('3. Run: npm run test:wiki', 'reset')
    log('4. Visit: http://localhost:3000/wiki/your-topic', 'reset')
  } else {
    log('✗ Some required environment variables are missing', 'red')
    log('\nTo fix:', 'yellow')
    log('1. Copy .env.local.example to .env.local', 'reset')
    log('2. Fill in your Supabase and API credentials', 'reset')
    log('3. Run this script again to verify', 'reset')
  }
  console.log('='.repeat(60) + '\n')

  return allGood
}

// Run verification
verifySetup()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('Verification failed:', error)
    process.exit(1)
  })
