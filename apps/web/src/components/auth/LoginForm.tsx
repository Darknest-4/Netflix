'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSession } from '@/providers/SessionProvider';

/**
 * Sign-in form.
 *
 * Handles the two-step 2FA challenge inline: when the API reports that a code
 * is required, the same form re-submits with the TOTP field revealed.
 *
 * @returns The form element.
 */
export function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Submits the credentials.
   *
   * @param event - Form submit event.
   */
  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await login(email, password, needsTotp ? totpCode : undefined);
      if (result.twoFactorRequired) {
        setNeedsTotp(true);
        return;
      }
      router.push(params.get('next') ?? '/profiles');
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'A bejelentkezés most nem sikerült.',
      );
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
        label="E-mail cím"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <Input
        label="Jelszó"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {needsTotp && (
        <Input
          label="Hitelesítési kód"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          hint="Add meg a hitelesítő alkalmazás 6 jegyű kódját."
          value={totpCode}
          onChange={(event) => setTotpCode(event.target.value)}
        />
      )}

      <Button type="submit" fullWidth size="lg" loading={submitting}>
        {needsTotp ? 'Kód ellenőrzése' : 'Bejelentkezés'}
      </Button>

      <div className="rounded-md border border-dashed border-[var(--surface-border)] p-3 text-xs text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text-secondary)]">Demó fiókok</p>
        <p>Néző: demo@nova.example / NovaDemo2026!</p>
        <p>Admin: admin@nova.example / NovaAdmin2026!</p>
      </div>
    </form>
  );
}
