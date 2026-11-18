import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'F1 Motorsport Manager — Pit Wall Telemetry & Career',
  description: 'Singleplayer Formula 1 Pit Wall Telemetry & Team Management Simulator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}

