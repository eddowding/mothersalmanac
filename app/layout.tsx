import type { Metadata } from "next";
import { Inter, Lora, JetBrains_Mono } from "next/font/google";
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
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

export const metadata: Metadata = {
  title: "Mother's Almanac - Your Dynamic Knowledge Repository",
  description: "A living encyclopedia powered by AI that grows with your questions. Ask anything, and watch the almanac expand with interconnected knowledge.",
  keywords: ["wiki", "knowledge base", "AI", "encyclopedia", "almanac", "learning"],
  authors: [{ name: "Mother's Almanac" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mothersalmanac.com",
    title: "Mother's Almanac",
    description: "Your Dynamic Knowledge Repository",
    siteName: "Mother's Almanac",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mother's Almanac",
    description: "Your Dynamic Knowledge Repository",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        className={`${inter.variable} ${lora.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
