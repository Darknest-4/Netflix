'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  API_ROUTES,
  type PlaybackManifestDto,
  type TitleDetailDto,
} from '@nova/shared';

import { apiFetch } from '@/lib/api-client';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/providers/SessionProvider';

/**
 * Full-screen watch page.
 *
 * Resolves the playback manifest for the requested title (and episode), streams
 * progress heartbeats back to the API and chains into the next episode when the
 * profile has auto-play enabled.
 *
 * @returns The page element.
 */
export default function WatchPage(): React.JSX.Element {
  const params = useParams<{ titleId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { status, activeProfile, authFetch } = useSession();

  const titleId = params.titleId;
  const episodeId = search.get('episodeId');

  const [manifest, setManifest] = useState<PlaybackManifestDto | null>(null);
  const [detail, setDetail] = useState<TitleDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace(`/login?next=/watch/${titleId}`);
    }
  }, [status, router, titleId]);

  /** Loads the manifest and the title metadata. */
  useEffect(() => {
    if (!activeProfile) {
      return;
    }

    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const query = new URLSearchParams({ profileId: activeProfile.id, titleId });
        if (episodeId) {
          query.set('episodeId', episodeId);
        }

        const [ticket, meta] = await Promise.all([
          authFetch<PlaybackManifestDto>(`${API_ROUTES.playback.manifest}?${query.toString()}`),
          apiFetch<TitleDetailDto>(API_ROUTES.catalog.titleBySlug(titleId)).catch(() => null),
        ]);

        if (cancelled) {
          return;
        }
        setManifest(ticket);
        setDetail(meta);
      } catch {
        if (!cancelled) {
          setError('A lejátszás nem indítható el.');
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeProfile, titleId, episodeId, authFetch]);

  /**
   * Sends a progress heartbeat.
   *
   * @param positionSeconds - Current position.
   * @param durationSeconds - Total duration.
   */
  const reportProgress = useCallback(
    (positionSeconds: number, durationSeconds: number): void => {
      if (!activeProfile || !manifest) {
        return;
      }
      void authFetch(API_ROUTES.playback.progress, {
        method: 'POST',
        body: {
          profileId: activeProfile.id,
          titleId: manifest.titleId,
          ...(manifest.episodeId ? { episodeId: manifest.episodeId } : {}),
          positionSeconds: Math.floor(positionSeconds),
          durationSeconds: Math.floor(durationSeconds),
        },
      }).catch(() => undefined);
    },
    [activeProfile, manifest, authFetch],
  );

  /** Navigates to the next episode. */
  const playNext = useCallback((): void => {
    if (manifest?.nextEpisodeId) {
      router.replace(`/watch/${titleId}?episodeId=${manifest.nextEpisodeId}`);
    }
  }, [manifest, router, titleId]);

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black px-6 text-center text-white">
        <div>
          <p className="text-xl font-semibold">{error}</p>
          <Button href="/browse" className="mt-6">
            Vissza a katalógushoz
          </Button>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="grid min-h-dvh place-items-center bg-black">
        <div
          role="status"
          aria-label="Betöltés"
          className="size-12 animate-spin rounded-full border-4 border-white/20 border-t-nova-red"
        />
      </div>
    );
  }

  const episode = detail?.seasons
    .flatMap((season) => season.episodes)
    .find((entry) => entry.id === manifest.episodeId);

  return (
    <div className="min-h-dvh bg-black">
      <VideoPlayer
        manifest={manifest}
        title={detail?.name ?? 'Lejátszás'}
        subtitle={
          episode ? `S${episode.seasonNumber}:E${episode.episodeNumber} · ${episode.name}` : undefined
        }
        autoplayNext={activeProfile?.autoplayNextEpisode ?? true}
        onProgress={reportProgress}
        onEnded={playNext}
        onNextEpisode={playNext}
      />
    </div>
  );
}
