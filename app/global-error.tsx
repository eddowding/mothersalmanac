'use client'

import { useEffect } from 'react'

/**
 * Global error handler for catastrophic errors
 * This catches errors in the root layout
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errortsx
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '600px',
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '1rem',
            }}>
              😵
            </div>

            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#111',
              marginBottom: '1rem',
            }}>
              Critical Error
            </h1>

            <p style={{
              fontSize: '18px',
              color: '#666',
              marginBottom: '2rem',
              lineHeight: 1.6,
            }}>
              We encountered a critical error. Please refresh the page to continue.
            </p>

            <button
              onClick={reset}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
