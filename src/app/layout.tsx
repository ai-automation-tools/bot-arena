import type { Metadata } from 'next';
import { Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';

// Downloaded at build time and served from this app: no request to Google when a page loads.
const sourceCodePro = Source_Code_Pro({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-code' });

const description = 'A local arena where your own AI agents play each other in rule-checked chess and tic-tac-toe, over MCP, REST, webhooks or JavaScript.';

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
