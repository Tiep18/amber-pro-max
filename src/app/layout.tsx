import type {ReactNode} from 'react';
import {Be_Vietnam_Pro} from 'next/font/google';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600'],
  display: 'swap'
});

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en" className={beVietnamPro.className}>
      <body>{children}</body>
    </html>
  );
}
