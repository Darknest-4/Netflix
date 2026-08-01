'use client';

import { useEffect, useState } from 'react';
import {
  API_ROUTES,
  PLANS,
  formatDate,
  formatPrice,
  type InvoiceDto,
  type PlanTier,
  type SubscriptionDto,
} from '@nova/shared';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TwoFactorPanel } from '@/components/account/TwoFactorPanel';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';

/**
 * Account page: profile summary, subscription, plan switching and invoices.
 *
 * @returns The page element.
 */
export default function AccountPage(): React.JSX.Element {
  const { user, status, authFetch } = useSession();
  const { notify } = useToast();

  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<PlanTier | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    void Promise.all([
      authFetch<SubscriptionDto | null>(API_ROUTES.billing.subscription),
      authFetch<InvoiceDto[]>(API_ROUTES.billing.invoices),
    ])
      .then(([currentSubscription, invoiceList]) => {
        if (!cancelled) {
          setSubscription(currentSubscription);
          setInvoices(invoiceList);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status, authFetch]);

  /**
   * Starts checkout for a plan.
   *
   * @param plan - Selected plan.
   */
  const changePlan = async (plan: PlanTier): Promise<void> => {
    setSwitching(plan);
    try {
      const session = await authFetch<{ url: string; simulated: boolean }>(
        API_ROUTES.billing.checkout,
        { method: 'POST', body: { plan } },
      );

      if (session.simulated) {
        const updated = await authFetch<SubscriptionDto | null>(API_ROUTES.billing.subscription);
        setSubscription(updated);
        notify('A csomag frissítve (szimulált fizetés).', 'success');
      } else {
        window.location.href = session.url;
      }
    } catch {
      notify('A csomagváltás nem sikerült.', 'error');
    } finally {
      setSwitching(null);
    }
  };

  /**
   * Schedules or revokes cancellation.
   *
   * @param cancelAtPeriodEnd - Desired cancellation state.
   */
  const setCancellation = async (cancelAtPeriodEnd: boolean): Promise<void> => {
    try {
      const updated = await authFetch<SubscriptionDto>('/billing/cancel', {
        method: 'POST',
        body: { cancelAtPeriodEnd },
      });
      setSubscription(updated);
      notify(
        cancelAtPeriodEnd
          ? 'Az előfizetés az időszak végén megszűnik.'
          : 'Az előfizetés újra megújul.',
        'success',
      );
    } catch {
      notify('A művelet nem sikerült.', 'error');
    }
  };

  const currentPlan = PLANS.find((plan) => plan.tier === subscription?.plan);

  return (
    <>
      <SiteHeader />

      <main className="mx-auto min-h-dvh max-w-4xl px-6 pb-16 pt-28">
        <h1 className="text-3xl font-black tracking-tight">Fiók</h1>

        <section className="mt-8 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6">
          <h2 className="text-lg font-bold">Belépési adatok</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--text-muted)]">Név</dt>
              <dd>{user?.displayName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">E-mail</dt>
              <dd>{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Szerepkör</dt>
              <dd>{user?.role === 'ADMIN' ? 'Adminisztrátor' : 'Tag'}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Tagság kezdete</dt>
              <dd>{user ? formatDate(user.createdAt) : '—'}</dd>
            </div>
          </dl>
        </section>

        <TwoFactorPanel />

        <section className="mt-6 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6">
          <h2 className="text-lg font-bold">Előfizetés</h2>

          {loading ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : subscription ? (
            <>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-[var(--text-muted)]">Csomag</dt>
                  <dd className="font-semibold">{currentPlan?.name ?? subscription.plan}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Állapot</dt>
                  <dd>{subscription.status === 'TRIALING' ? 'Próbaidőszak' : 'Aktív'}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Következő számlázás</dt>
                  <dd>{formatDate(subscription.currentPeriodEnd)}</dd>
                </div>
              </dl>

              {subscription.cancelAtPeriodEnd ? (
                <div className="mt-4 rounded-md bg-warning/15 p-4 text-sm">
                  <p>Az előfizetésed {formatDate(subscription.currentPeriodEnd)}-én megszűnik.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => void setCancellation(false)}
                  >
                    Mégis maradok
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 !px-0 text-danger"
                  onClick={() => void setCancellation(true)}
                >
                  Előfizetés lemondása
                </Button>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Jelenleg nincs aktív előfizetésed.
            </p>
          )}

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Csomagváltás
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const active = plan.tier === subscription?.plan;
              return (
                <li
                  key={plan.tier}
                  className={`rounded-lg border p-4 ${
                    active ? 'border-nova-red' : 'border-[var(--surface-border)]'
                  }`}
                >
                  <p className="font-bold">{plan.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {formatPrice(plan.priceMinor, plan.currency)} / hó · {plan.maxQuality}
                  </p>
                  <Button
                    size="sm"
                    variant={active ? 'ghost' : 'primary'}
                    className="mt-3"
                    fullWidth
                    disabled={active}
                    loading={switching === plan.tier}
                    onClick={() => void changePlan(plan.tier)}
                  >
                    {active ? 'Jelenlegi csomag' : 'Váltás'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6">
          <h2 className="text-lg font-bold">Számlatörténet</h2>

          {invoices.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Még nincs kiállított számla.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-left text-[var(--text-muted)]">
                  <th scope="col" className="py-2 font-medium">
                    Dátum
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Összeg
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Állapot
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[var(--surface-border)]">
                    <td className="py-2">{formatDate(invoice.issuedAt)}</td>
                    <td className="py-2">{formatPrice(invoice.amountMinor, invoice.currency)}</td>
                    <td className="py-2">
                      {invoice.status === 'paid' ? (
                        <span className="text-success">Kifizetve</span>
                      ) : (
                        invoice.status
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
