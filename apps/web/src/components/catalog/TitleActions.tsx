'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES, TitleKind, type PlaybackManifestDto, type TitleDetailDto } from '@nova/shared';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';

/** Props of {@link TitleActions}. */
export interface TitleActionsProps {
  title: TitleDetailDto;
}

/**
 * Play, trailer and watchlist actions of the detail page.
 *
 * The trailer opens in a modal player, so members can preview a title without
 * leaving the page they are reading.
 *
 * @param props - The catalog entry.
 * @returns The action bar.
 */
export function TitleActions({ title }: TitleActionsProps): React.JSX.Element {
  const { activeProfile, status, authFetch } = useSession();
  const { notify } = useToast();

  const [inMyList, setInMyList] = useState(false);
  const [trailer, setTrailer] = useState<PlaybackManifestDto | null>(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);

  /** Reads the current watchlist membership. */
  useEffect(() => {
    if (!activeProfile) {
      return;
    }

    let cancelled = false;
    void authFetch<{ id: string }[]>(API_ROUTES.watchlist.list(activeProfile.id))
      .then((list) => {
        if (!cancelled) {
          setInMyList(list.some((entry) => entry.id === title.id));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [activeProfile, authFetch, title.id]);

  /** Adds or removes the title from the member's list. */
  const toggleMyList = async (): Promise<void> => {
    if (!activeProfile) {
      notify('Válassz profilt a listád használatához.', 'info');
      return;
    }
    try {
      const result = await authFetch<{ inMyList: boolean }>(
        API_ROUTES.watchlist.toggle(activeProfile.id, title.id),
        { method: 'POST' },
      );
      setInMyList(result.inMyList);
      notify(result.inMyList ? 'Hozzáadva a listádhoz.' : 'Eltávolítva a listádról.', 'success');
    } catch {
      notify('A művelet nem sikerült.', 'error');
    }
  };

  /** Loads and opens the trailer. */
  const openTrailer = async (): Promise<void> => {
    setLoadingTrailer(true);
    try {
      const query = new URLSearchParams({
        profileId: activeProfile?.id ?? 'anonymous',
        titleId: title.id,
        trailer: 'true',
      });
      const manifest = await authFetch<PlaybackManifestDto>(
        `${API_ROUTES.playback.manifest}?${query.toString()}`,
      );
      setTrailer(manifest);
    } catch {
      notify('Az előzetes most nem érhető el.', 'error');
    } finally {
      setLoadingTrailer(false);
    }
  };

  const firstEpisodeId = title.seasons[0]?.episodes[0]?.id;
  const playHref =
    title.kind === TitleKind.SERIES && firstEpisodeId
      ? `/watch/${title.id}?episodeId=${firstEpisodeId}`
      : `/watch/${title.id}`;

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button
          href={playHref}
          size="lg"
          className="!bg-white !text-black hover:!bg-white/85"
          icon={
            <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          }
        >
          Lejátszás
        </Button>

        <Button
          size="lg"
          variant="secondary"
          loading={loadingTrailer}
          onClick={() => void openTrailer()}
        >
          Előzetes
        </Button>

        {status === 'authenticated' && (
          <button
            type="button"
            onClick={() => void toggleMyList()}
            aria-pressed={inMyList}
            aria-label={inMyList ? 'Eltávolítás a listámról' : 'Hozzáadás a listámhoz'}
            className="grid size-11 place-items-center rounded-full border-2 border-white/50 bg-black/30 text-xl transition-colors hover:border-white"
          >
            {inMyList ? '✓' : '+'}
          </button>
        )}
      </div>

      <Modal
        open={trailer !== null}
        onClose={() => setTrailer(null)}
        title={`${title.name} — előzetes`}
        size="xl"
        hideHeader
      >
        {trailer && (
          <VideoPlayer manifest={trailer} title={`${title.name} — előzetes`} autoplayNext={false} />
        )}
      </Modal>
    </>
  );
}
