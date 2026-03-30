import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dial Competition Tracker',
  description: 'Track dials, pick ups, sets, and points for your sales competition',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
