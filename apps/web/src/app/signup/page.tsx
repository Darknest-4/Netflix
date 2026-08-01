import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { AuthShell } from '@/components/auth/AuthShell';
import { SignupForm } from '@/components/auth/SignupForm';

/** Sign-up page metadata. */
export const metadata: Metadata = {
  title: 'Regisztráció',
  description: 'Hozd létre a NOVA fiókodat, és nézd korlátlanul a teljes katalógust.',
  alternates: { canonical: '/signup' },
};

/**
 * Registration page.
 *
 * @returns The page element.
 */
export default function SignupPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Fiók létrehozása"
      subtitle="Az első 30 nap ingyenes, utána bármikor lemondható."
      footer={
        <p>
          Már van fiókod?{' '}
          <Link href="/login" className="font-semibold text-[var(--text-primary)] underline">
            Jelentkezz be
          </Link>
        </p>
      }
    >
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
