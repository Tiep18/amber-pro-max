import type { ReactNode } from 'react';
import { Nunito } from 'next/font/google';
import { defaultLocale } from '@/i18n/routing';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap'
});

const localeLangScript = `
(() => {
  const locale = window.location.pathname.split('/')[1];
  document.documentElement.lang = locale === 'en' ? 'en' : 'vi';
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={defaultLocale}
      className={nunito.className}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeLangScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
