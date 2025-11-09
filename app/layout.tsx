import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';

export const metadata: Metadata = {
  title: 'GEMflush - AI Visibility Platform',
  description: 'Get your business found by ChatGPT, Claude, and Perplexity. Automated Wikidata publishing and LLM visibility tracking for local businesses.',
  keywords: ['AI visibility', 'Wikidata', 'LLM', 'ChatGPT', 'knowledge graph', 'business visibility', 'SEO'],
  authors: [{ name: 'GEMflush' }],
  openGraph: {
    title: 'GEMflush - AI Visibility Platform',
    description: 'Get your business found by ChatGPT, Claude, and Perplexity.',
    type: 'website',
    siteName: 'GEMflush',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GEMflush - AI Visibility Platform',
    description: 'Get your business found by ChatGPT, Claude, and Perplexity.',
  }
};

export const viewport: Viewport = {
  maximumScale: 1
};

const manrope = Manrope({ subsets: ['latin'] });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <SWRConfig
          value={{
            fallback: {
              // We do NOT await here
              // Only components that read this data will suspend
              '/api/user': getUser(),
              '/api/team': getTeamForUser()
            }
          }}
        >
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
