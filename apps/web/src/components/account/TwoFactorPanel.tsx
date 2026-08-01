'use client';

import { useState } from 'react';
import { API_ROUTES, type TwoFactorSetupDto } from '@nova/shared';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';

/**
 * Two-factor authentication panel.
 *
 * Walks through the full enrolment: generate a secret, show the provisioning
 * URI and recovery codes, then verify the first code before 2FA is switched on.
 *
 * @returns The panel element.
 */
export function TwoFactorPanel(): React.JSX.Element {
  const { user, authFetch } = useSession();
  const { notify } = useToast();

  const [setup, setSetup] = useState<TwoFactorSetupDto | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [busy, setBusy] = useState(false);

  /** Requests a new shared secret. */
  const startSetup = async (): Promise<void> => {
    setBusy(true);
    try {
      setSetup(await authFetch<TwoFactorSetupDto>(API_ROUTES.auth.twoFactorSetup, { method: 'POST' }));
    } catch {
      notify('A 2FA előkészítése nem sikerült.', 'error');
    } finally {
      setBusy(false);
    }
  };

  /** Verifies the first code and enables 2FA. */
  const confirm = async (): Promise<void> => {
    if (!setup) {
      return;
    }
    setBusy(true);
    try {
      await authFetch(API_ROUTES.auth.twoFactorEnable, {
        method: 'POST',
        body: { code, recoveryCodes: setup.recoveryCodes },
      });
      setEnabled(true);
      setSetup(null);
      setCode('');
      notify('A kétlépcsős azonosítás bekapcsolva.', 'success');
    } catch {
      notify('A megadott kód érvénytelen.', 'error');
    } finally {
      setBusy(false);
    }
  };

  /** Disables 2FA after a password confirmation. */
  const disable = async (): Promise<void> => {
    setBusy(true);
    try {
      await authFetch(API_ROUTES.auth.twoFactorDisable, { method: 'POST', body: { password } });
      setEnabled(false);
      setPassword('');
      notify('A kétlépcsős azonosítás kikapcsolva.', 'success');
    } catch {
      notify('A jelszó helytelen.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6">
      <h2 className="text-lg font-bold">Kétlépcsős azonosítás (2FA)</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Extra védelem a fiókodnak: bejelentkezéskor a jelszó mellett egy időalapú kódot is kérünk.
      </p>

      {enabled ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-success">A 2FA jelenleg aktív ezen a fiókon.</p>
          <Input
            label="Jelszó megerősítése"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button variant="danger" loading={busy} onClick={() => void disable()}>
            2FA kikapcsolása
          </Button>
        </div>
      ) : setup ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium">1. Add hozzá a hitelesítő alkalmazásodhoz</p>
            <code className="mt-2 block break-all rounded bg-black/40 p-3 text-xs text-[var(--text-secondary)]">
              {setup.otpauthUrl}
            </code>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Kézi bevitel esetén a titok: <strong>{setup.secret}</strong>
            </p>
          </div>

          <div>
            <p className="text-sm font-medium">2. Mentsd el a helyreállítási kódokat</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-[var(--text-secondary)] sm:grid-cols-4">
              {setup.recoveryCodes.map((recovery) => (
                <li key={recovery} className="rounded bg-black/30 px-2 py-1 text-center">
                  {recovery}
                </li>
              ))}
            </ul>
          </div>

          <Input
            label="3. Írd be az alkalmazás által mutatott kódot"
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />

          <div className="flex gap-3">
            <Button loading={busy} onClick={() => void confirm()}>
              Aktiválás
            </Button>
            <Button variant="ghost" onClick={() => setSetup(null)}>
              Mégse
            </Button>
          </div>
        </div>
      ) : (
        <Button className="mt-4" loading={busy} onClick={() => void startSetup()}>
          2FA bekapcsolása
        </Button>
      )}
    </section>
  );
}
