'use client';

import { Layout } from '@/components/layout/Layout';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout showNavigation={false}>
      {children}
    </Layout>
  );
}