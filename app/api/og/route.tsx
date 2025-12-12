import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

/**
 * Dynamic Open Graph image generation
 * Creates beautiful OG images for social sharing
 *
 * @see https://vercel.com/docs/concepts/functions/edge-functions/og-image-generation
 */

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Get parameters
    const title = searchParams.get('title') || "Mother's Almanac"
    const description = searchParams.get('description') || 'Your Dynamic Knowledge Repository'
    const type = searchParams.get('type') || 'wiki'

    // Load fonts (you'll need to add these to your public folder)
    // For now using default system fonts

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '80px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
              }}
            >
              📚
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: '600',
                color: 'white',
                opacity: 0.9,
              }}
            >
              Mother's Almanac
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              flex: 1,
              justifyContent: 'center',
              maxWidth: '900px',
            }}
          >
            <div
              style={{
                fontSize: '64px',
                fontWeight: '700',
                color: 'white',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </div>
            {description && (
              <div
                style={{
                  fontSize: '32px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.4,
                }}
              >
                {description}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  fontSize: '20px',
                  color: 'white',
                  fontWeight: '500',
                }}
              >
                {type === 'wiki' ? '📖 Wiki' : type === 'admin' ? '⚙️ Admin' : '🏠 Home'}
              </div>
            </div>
            <div
              style={{
                fontSize: '20px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: '500',
              }}
            >
              AI-Powered Knowledge
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)

    // Return fallback image response
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontSize: '64px',
            color: 'white',
            fontWeight: '700',
          }}
        >
          📚 Mother's Almanac
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  }
}
