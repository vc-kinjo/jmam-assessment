import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NotificationContainer } from '@/components/ui/NotificationContainer';
import { Layout } from '@/components/layout/Layout';
import { AuthInitializer } from '@/components/auth/AuthInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gunchart - プロジェクト管理システム',
  description: 'ガントチャートによる視覚的プロジェクト管理システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthInitializer>
          {children}
        </AuthInitializer>
        <NotificationContainer />
      </body>
    </html>
  );
}