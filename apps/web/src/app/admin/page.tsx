'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  API_ROUTES,
  formatPrice,
  type PaginatedResponse,
  type PlatformStatsDto,
  type TitleSummaryDto,
  type UserDto,
} from '@nova/shared';

import { AdminShell } from '@/components/admin/AdminShell';
import { CatalogManager } from '@/components/admin/CatalogManager';
import { StatTile } from '@/components/admin/StatTile';
import { TrendChart } from '@/components/admin/TrendChart';
import { UserTable } from '@/components/admin/UserTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSession } from '@/providers/SessionProvider';

/** Tabs of the admin panel. */
type AdminTab = 'overview' | 'catalog' | 'users';

/**
 * Administrator panel.
 *
 * Combines the KPI dashboard, the content management system and user
 * administration behind a role guard — the API enforces the same rule, this is
 * only the UI half of it.
 *
 * @returns The page element.
 */
export default function AdminPage(): React.JSX.Element {
  const router = useRouter();
  const { user, status, authFetch } = useSession();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<PlatformStatsDto | null>(null);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [titles, setTitles] = useState<TitleSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/admin');
      return;
    }
    if (status === 'authenticated' && user?.role !== 'ADMIN') {
      router.replace('/browse');
    }
  }, [status, user, router]);

  useEffect(() => {
    if (status !== 'authenticated' || user?.role !== 'ADMIN') {
      return;
    }

    let cancelled = false;
    void Promise.all([
      authFetch<PlatformStatsDto>(API_ROUTES.admin.stats),
      authFetch<PaginatedResponse<UserDto>>(`${API_ROUTES.admin.users}?perPage=25`),
      authFetch<PaginatedResponse<TitleSummaryDto>>(`${API_ROUTES.admin.titles}?perPage=50`),
    ])
      .then(([platformStats, userPage, titlePage]) => {
        if (cancelled) {
          return;
        }
        setStats(platformStats);
        setUsers(userPage.data);
        setTitles(titlePage.data);
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
  }, [status, user, authFetch]);

  return (
    <AdminShell activeTab={tab} onTabChange={setTab}>
      {tab === 'overview' && (
        <section aria-label="Áttekintés" className="space-y-6">
          {loading || !stats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_unused, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Tagok" value={stats.totalMembers.toLocaleString('hu-HU')} hint="összes regisztráció" />
                <StatTile
                  label="Aktív előfizetés"
                  value={stats.activeSubscriptions.toLocaleString('hu-HU')}
                  hint={`${stats.churnRatePercent}% lemorzsolódás`}
                />
                <StatTile
                  label="MRR"
                  value={formatPrice(stats.monthlyRecurringRevenueMinor, stats.currency)}
                  hint="havi ismétlődő bevétel"
                />
                <StatTile
                  label="Nézett órák"
                  value={stats.totalWatchHours.toLocaleString('hu-HU')}
                  hint={`${stats.totalTitles} tartalom a katalógusban`}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <TrendChart title="Regisztrációk (30 nap)" points={stats.signupsTrend} />
                <TrendChart title="Nézett órák (30 nap)" points={stats.watchTrend} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Legnézettebb tartalmak
                  </h2>
                  <ol className="mt-4 space-y-2 text-sm">
                    {stats.topTitles.map((entry, index) => (
                      <li key={entry.titleId} className="flex justify-between gap-4">
                        <span>
                          <span className="mr-2 text-[var(--text-muted)]">{index + 1}.</span>
                          {entry.name}
                        </span>
                        <span className="tabular-nums text-[var(--text-secondary)]">
                          {entry.views.toLocaleString('hu-HU')}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Csomagmegoszlás
                  </h2>
                  <ul className="mt-4 space-y-3 text-sm">
                    {stats.planDistribution.map((entry) => {
                      const total = stats.planDistribution.reduce((sum, item) => sum + item.count, 0);
                      const percent = total > 0 ? (entry.count / total) * 100 : 0;
                      return (
                        <li key={entry.plan}>
                          <div className="flex justify-between">
                            <span>{entry.plan}</span>
                            <span className="tabular-nums text-[var(--text-secondary)]">
                              {entry.count}
                            </span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-[var(--color-ink-800)]">
                            <div
                              className="h-full rounded-full bg-nova-red"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'catalog' && <CatalogManager titles={titles} onTitlesChange={setTitles} />}

      {tab === 'users' && <UserTable users={users} />}
    </AdminShell>
  );
}
