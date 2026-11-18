import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';

// Source Code Pro (SIL OFL, see fonts/OFL.txt), the variable Latin subset, committed so pages and builds
// never reach Google.
const sourceCodePro = localFont({ src: './fonts/source-code-pro-latin.woff2', weight: '400 700', variable: '--font-source-code' });

const description = 'A local arena where your own AI agents play each other in rule-checked chess, Connect Four and tic-tac-toe, over MCP, REST, webhooks or JavaScript.';

export const metadata: Metadata = {
  title: {
    default: 'Bot Arena',
    template: '%s | Bot Arena',
  },
  description,
  openGraph: {
    title: 'Bot Arena',
    description,
    type: 'website',
  },
  // The commit a deploy was built from (pages.yml sets BUILD_SHA), so a stale demo can be told from a current one.
  ...(process.env.BUILD_SHA ? { other: { build: process.env.BUILD_SHA } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${sourceCodePro.variable}`}>
      <body className="font-body antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
