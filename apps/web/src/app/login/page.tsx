import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

/** Sign-in page metadata. */
export const metadata: Metadata = {
  title: 'Bejelentkezés',
  description: 'Jelentkezz be a NOVA fiókodba, és folytasd ott, ahol abbahagytad.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
};

/**
 * Sign-in page.
 *
 * @returns The page element.
 */
export default function LoginPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Bejelentkezés"
      subtitle="Üdv újra! Add meg az adataidat a folytatáshoz."
      footer={
        <p>
          Nincs még fiókod?{' '}
          <Link href="/signup" className="font-semibold text-[var(--text-primary)] underline">
            Regisztrálj most
          </Link>
        </p>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
