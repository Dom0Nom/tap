import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-barlow' });
const barlowCondensed = Barlow_Condensed({ subsets: ['latin'], weight: ['600'], variable: '--font-barlow-condensed' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'tap \u00b7 mission control',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${barlow.variable} ${barlowCondensed.variable} ${mono.variable} font-[family-name:var(--font-barlow)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
