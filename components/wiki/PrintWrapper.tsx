'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import QRCode from 'qrcode'

interface PrintWrapperProps {
  slug: string
  title: string
  generatedAt?: string
  confidenceScore?: number
  children: React.ReactNode
}

/**
 * PrintWrapper Component
 * Wraps wiki content with print-optimized layout and QR code
 *
 * Features:
 * - Print button
 * - QR code to page URL
 * - Print header/footer
 * - Clean print layout
 * - Metadata in footer
 */
export function PrintWrapper({
  slug,
  title,
  generatedAt,
  confidenceScore,
  children
}: PrintWrapperProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    // Generate QR code for current page URL
    const pageUrl = `${window.location.origin}/wiki/${slug}`

    QRCode.toDataURL(pageUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => {
        setQrCodeUrl(url)
      })
      .catch(err => {
        console.error('Failed to generate QR code:', err)
      })
  }, [slug])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="print-container">
      {/* Screen-only print button */}
      <div className="no-print mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print page
        </Button>
      </div>

      {/* Print header (hidden on screen) */}
      <div className="print-only print-header">
        <div className="print-logo">Mother's Almanac</div>
        <div className="text-right text-xs text-muted-foreground">
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Print metadata (hidden on screen) */}
      <div className="print-only print-metadata">
        {generatedAt && (
          <div className="print-metadata-item">
            <span className="print-metadata-label">Generated:</span>
            <span>
              {new Date(generatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        )}
        {confidenceScore !== undefined && (
          <div className="print-metadata-item">
            <span className="print-metadata-label">Quality Score:</span>
            <span>{(confidenceScore * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="print-content">
        {children}
      </div>

      {/* Print footer (hidden on screen) */}
      <div className="print-only print-footer">
        <div>
          <p className="font-medium mb-1">Mother's Almanac</p>
          <p className="text-xs">
            Your comprehensive parenting knowledge companion
          </p>
        </div>

        {qrCodeUrl && (
          <div className="print-qr-code">
            <img
              src={qrCodeUrl}
              alt="QR code to page"
              className="print-qr-code-image"
            />
            <p className="print-qr-code-label">
              Scan to view online
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * PrintButton - Standalone print button
 */
export function PrintButton({ className }: { className?: string }) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className={className}
    >
      <Printer className="h-4 w-4" />
    </Button>
  )
}
