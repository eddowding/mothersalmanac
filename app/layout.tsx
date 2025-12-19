import type { Metadata } from "next";
import { Inter, Lora, JetBrains_Mono } from "next/font/google";
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import "./globals.css";

// Sans-serif for body text - clean and readable
const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Serif for headings - warm and traditional, perfect for an almanac
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Monospace for code
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mothersalmanac.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Mother's Almanac — Evidence-Based Parenting Guide",
    template: "%s | Mother's Almanac",
  },
  description: "Your trusted companion for evidence-based parenting guidance. Quick-reference articles on baby care, child development, sleep, feeding, and more — synthesised from books, medical sources, and expert advice.",
  keywords: [
    "parenting guide",
    "baby care",
    "child development",
    "newborn",
    "toddler",
    "infant care",
    "breastfeeding",
    "sleep training",
    "child health",
    "parenting advice",
    "mother",
    "father",
    "childcare",
  ],
  authors: [{ name: "Mother's Almanac" }],
  creator: "Mother's Almanac",
  publisher: "Mother's Almanac",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: BASE_URL,
    title: "Mother's Almanac — Evidence-Based Parenting Guide",
    description: "Your trusted companion for evidence-based parenting guidance. Quick-reference articles synthesised from trusted books and medical sources.",
    siteName: "Mother's Almanac",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 634,
        alt: "Mother's Almanac — Evidence-Based Parenting Guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mother's Almanac — Evidence-Based Parenting Guide",
    description: "Your trusted companion for evidence-based parenting guidance.",
    site: "@mothersalmanac",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when ready
    // google: 'your-google-verification-code',
  },
  category: 'Parenting',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${inter.variable} ${lora.variable} ${jetbrainsMono.variable} font-sans antialiased transition-colors duration-300`}
      >
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
