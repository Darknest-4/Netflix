'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { checkPassword } from '@nova/shared';

import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSession } from '@/providers/SessionProvider';

/** Labels of the password strength meter. */
const STRENGTH_LABEL = ['Túl gyenge', 'Gyenge', 'Közepes', 'Erős', 'Nagyon erős'] as const;

/**
 * Registration form with a live password strength meter.
 *
 * The policy check comes from `@nova/shared`, i.e. the exact same function the
 * API enforces, so the client can never accept a password the server rejects.
 *
 * @returns The form element.
 */
export function SignupForm(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const { register } = useSession();

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = useMemo(() => checkPassword(password), [password]);

  /**
   * Creates the account.
   *
   * @param event - Form submit event.
   */
  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!strength.valid) {
      setError(strength.issues.join(' '));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await register({ email, password, displayName });
      router.push('/profiles');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'A regisztráció most nem sikerült.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <p role="alert" className="rounded-md bg-danger/15 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Input
        label="Név"
        autoComplete="name"
        required
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
      />

      <Input
        label="E-mail cím"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <div className="space-y-2">
        <Input
          label="Jelszó"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="Legalább 10 karakter, kis- és nagybetű, valamint számjegy."
        />

        {password.length > 0 && (
          <div>
            <div className="flex gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={`h-1.5 flex-1 rounded-full ${
                    index < strength.score ? 'bg-success' : 'bg-[var(--color-ink-700)]'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]" aria-live="polite">
              Jelszó erőssége: {STRENGTH_LABEL[strength.score]}
            </p>
          </div>
        )}
      </div>

      <Button type="submit" fullWidth size="lg" loading={submitting}>
        Fiók létrehozása
      </Button>

      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
        A regisztrációval elfogadod a Felhasználási feltételeket és az Adatkezelési tájékoztatót.
        Az első 30 nap ingyenes, utána bármikor lemondható.
      </p>
    </form>
  );
}
