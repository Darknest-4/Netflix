'use client';

import { useState } from 'react';
import { formatDate, type UserDto } from '@nova/shared';

import { Input } from '@/components/ui/Input';

/** Props of {@link UserTable}. */
export interface UserTableProps {
  users: UserDto[];
}

/**
 * User administration table.
 *
 * Read-only by design: destructive account operations belong to a separate,
 * audited flow rather than a one-click button in a list.
 *
 * @param props - Accounts to display.
 * @returns The table section.
 */
export function UserTable({ users }: UserTableProps): React.JSX.Element {
  const [search, setSearch] = useState('');

  const filtered = users.filter((user) =>
    `${user.displayName} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <section aria-label="Felhasználók">
      <div className="max-w-sm">
        <Input
          label="Keresés név vagy e-mail alapján"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--surface-border)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[var(--surface-raised)] text-left text-[var(--text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Név
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                E-mail
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Szerepkör
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                2FA
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Regisztrált
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-t border-[var(--surface-border)]">
                <td className="px-4 py-3 font-medium">{user.displayName}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      user.role === 'ADMIN'
                        ? 'bg-nova-red/20 text-nova-red'
                        : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {user.role === 'ADMIN' ? 'Admin' : 'Tag'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.twoFactorEnabled ? (
                    <span className="text-success">Aktív</span>
                  ) : (
                    <span className="text-[var(--text-muted)]">Nincs</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">Nincs találat.</p>
      )}
    </section>
  );
}
