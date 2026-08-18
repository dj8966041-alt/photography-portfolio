import type { Metadata } from 'next';
import { Bebas_Neue } from 'next/font/google';
import './globals.css';

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Diego Jauregui',
  description: 'Photography Portfolio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bebas.variable}>
      <body>{children}</body>
    </html>
  );
}
