import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: '面试搭子 - AI面试紧张终结者 | mianshidazi.com',
  description: '你不是不会，你只是太紧张了。找个面试搭子，上场不慌。AI面试紧张类型测试 + 模拟面试练习，帮助你克服面试恐惧，提升面试表现。',
  keywords: '面试紧张, 面试焦虑, AI面试练习, 面试辅导, 克服面试恐惧, 面试搭子',
  authors: [{ name: '面试搭子' }],
  openGraph: {
    title: '面试搭子 - AI面试紧张终结者',
    description: '你不是不会，你只是太紧张了。找个面试搭子，上场不慌。',
    url: 'https://mianshidazi.com',
    siteName: '面试搭子',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '面试搭子 - AI面试紧张终结者',
    description: '你不是不会，你只是太紧张了。找个面试搭子，上场不慌。',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FF6B35' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1A2E' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="msvalidate.01" content="ED1A7551D0CE0BB8575D1C4B86A4F3CD" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
