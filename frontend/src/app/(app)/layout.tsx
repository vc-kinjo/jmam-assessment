'use client';

import { Layout } from '@/components/layout/Layout';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout showNavigation={true}>
      {children}
    </Layout>
  );
}