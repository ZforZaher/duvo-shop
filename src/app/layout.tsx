import type { Metadata, Viewport } from 'next';
import { Anton, DM_Mono, DM_Sans } from 'next/font/google';
import './globals.css';

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--f-display' });
const body = DM_Sans({ subsets: ['latin'], variable: '--f-body' });
const mono = DM_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--f-mono' });

export const metadata: Metadata = {
  title: { default: 'Duvo · Twin cups for cafés', template: '%s · Duvo' },
  description: 'Two drinks, one cup. Order Duvo split, heart and round twin cups and printed sleeves for your café.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#EFE6DA' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
