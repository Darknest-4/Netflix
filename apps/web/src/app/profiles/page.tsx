'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  API_ROUTES,
  AVATAR_PRESETS,
  MAX_PROFILES_PER_ACCOUNT,
  MaturityRating,
  avatarGradient,
  type ProfileDto,
} from '@nova/shared';

import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';

/**
 * Profile gate — the "Ki nézi?" screen.
 *
 * Doubles as the profile manager: the same grid switches into edit mode, where
 * profiles can be created, renamed, re-skinned and deleted.
 *
 * @returns The page element.
 */
export default function ProfilesPage(): React.JSX.Element {
  const router = useRouter();
  const { status, profiles, selectProfile, refreshProfiles, authFetch } = useSession();
  const { notify } = useToast();

  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<ProfileDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [avatarKey, setAvatarKey] = useState<string>(AVATAR_PRESETS[0]);
  const [isKids, setIsKids] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/profiles');
    }
  }, [status, router]);

  /**
   * Activates a profile and enters the member area.
   *
   * @param profile - Selected profile.
   */
  const enter = (profile: ProfileDto): void => {
    selectProfile(profile.id);
    router.push('/browse');
  };

  /** Persists the create/edit form. */
  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      if (editing) {
        await authFetch(API_ROUTES.profiles.byId(editing.id), {
          method: 'PATCH',
          body: { name, avatarKey },
        });
        notify('Profil frissítve.', 'success');
      } else {
        await authFetch(API_ROUTES.profiles.create, {
          method: 'POST',
          body: {
            name,
            avatarKey,
            isKids,
            ...(isKids ? { maturityLevel: MaturityRating.SEVEN_PLUS } : {}),
          },
        });
        notify('Profil létrehozva.', 'success');
      }
      await refreshProfiles();
      closeForm();
    } catch {
      notify('A mentés nem sikerült.', 'error');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Deletes a profile after confirmation.
   *
   * @param profile - Profile to delete.
   */
  const remove = async (profile: ProfileDto): Promise<void> => {
    if (!window.confirm(`Biztosan törlöd a(z) "${profile.name}" profilt?`)) {
      return;
    }
    try {
      await authFetch(API_ROUTES.profiles.byId(profile.id), { method: 'DELETE' });
      await refreshProfiles();
      notify('Profil törölve.', 'success');
    } catch {
      notify('A profil nem törölhető.', 'error');
    }
  };

  /** Resets and closes the profile form. */
  const closeForm = (): void => {
    setEditing(null);
    setCreating(false);
    setName('');
    setAvatarKey(AVATAR_PRESETS[0]);
    setIsKids(false);
  };

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-10 flex justify-center">
          <Logo size="md" href="/browse" />
        </div>

        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
          {managing ? 'Profilok kezelése' : 'Ki nézi?'}
        </h1>

        <ul className="mt-10 flex flex-wrap items-start justify-center gap-6">
          {profiles.map((profile) => {
            const gradient = avatarGradient(profile.avatarKey);
            return (
              <li key={profile.id} className="w-28 sm:w-36">
                <button
                  type="button"
                  onClick={() => {
                    if (managing) {
                      setEditing(profile);
                      setName(profile.name);
                      setAvatarKey(profile.avatarKey);
                    } else {
                      enter(profile);
                    }
                  }}
                  className="group w-full"
                >
                  <span
                    className="relative grid aspect-square w-full place-items-center rounded-lg text-3xl font-black text-white ring-white transition-all duration-200 group-hover:ring-4"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    }}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                    {managing && (
                      <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/55 text-2xl">
                        ✎
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block truncate text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                    {profile.name}
                  </span>
                  {profile.isKids && (
                    <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      gyerek
                    </span>
                  )}
                </button>

                {managing && profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => void remove(profile)}
                    className="mt-1 text-xs text-danger underline"
                  >
                    Törlés
                  </button>
                )}
              </li>
            );
          })}

          {profiles.length < MAX_PROFILES_PER_ACCOUNT && (
            <li className="w-28 sm:w-36">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="group w-full"
                aria-label="Profil hozzáadása"
              >
                <span className="grid aspect-square w-full place-items-center rounded-lg border-2 border-dashed border-[var(--surface-border)] text-4xl text-[var(--text-muted)] transition-colors group-hover:border-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                  +
                </span>
                <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                  Profil hozzáadása
                </span>
              </button>
            </li>
          )}
        </ul>

        <Button
          variant="secondary"
          className="mt-12"
          onClick={() => setManaging((value) => !value)}
        >
          {managing ? 'Kész' : 'Profilok kezelése'}
        </Button>
      </div>

      <Modal
        open={creating || editing !== null}
        onClose={closeForm}
        title={editing ? 'Profil szerkesztése' : 'Új profil'}
      >
        <div className="space-y-5 p-6">
          <Input
            label="Profilnév"
            value={name}
            maxLength={24}
            onChange={(event) => setName(event.target.value)}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
              Avatár
            </legend>
            <div className="flex flex-wrap gap-3">
              {AVATAR_PRESETS.map((preset) => {
                const gradient = avatarGradient(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAvatarKey(preset)}
                    aria-label={`Avatár: ${preset}`}
                    aria-pressed={avatarKey === preset}
                    className={`size-12 rounded-lg ring-white transition-all ${
                      avatarKey === preset ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                    }}
                  />
                );
              })}
            </div>
          </fieldset>

          {!editing && (
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={isKids}
                onChange={(event) => setIsKids(event.target.checked)}
                className="size-4 accent-[var(--color-nova-red)]"
              />
              Gyermekprofil (csak 7+ korhatárig, egyszerűsített felület)
            </label>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={closeForm}>
              Mégse
            </Button>
            <Button onClick={() => void save()} loading={busy} disabled={name.trim().length === 0}>
              Mentés
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
