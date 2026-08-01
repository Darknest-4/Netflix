'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Quality level exposed by the adaptive stream. */
export interface QualityLevel {
  /** Index in the manifest, `-1` meaning automatic selection. */
  id: number;
  label: string;
  height: number;
}

/** Return value of {@link useHlsPlayer}. */
export interface HlsPlayerState {
  ready: boolean;
  error: string | null;
  levels: QualityLevel[];
  currentLevel: number;
  /**
   * Switches the quality level.
   *
   * @param level - Level index, or `-1` for automatic.
   */
  setLevel: (level: number) => void;
}

/**
 * Attaches an adaptive stream to a `<video>` element.
 *
 * Safari and iOS play HLS natively; everywhere else `hls.js` is loaded lazily
 * (it is a sizeable dependency and must never block the first paint) and its
 * quality ladder is surfaced to the settings menu.
 *
 * @param videoRef - Ref of the target `<video>` element.
 * @param manifestUrl - Absolute URL of the `.m3u8` manifest.
 * @returns Readiness, error state and the quality ladder.
 */
export function useHlsPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  manifestUrl: string | null,
): HlsPlayerState {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [instance, setInstance] = useState<{ currentLevel: number; destroy: () => void } | null>(
    null,
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !manifestUrl) {
      return;
    }

    let disposed = false;
    let hls: { destroy: () => void; currentLevel: number } | null = null;

    /** Loads the stream with the best available mechanism. */
    const attach = async (): Promise<void> => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = manifestUrl;
        setReady(true);
        return;
      }

      try {
        const { default: Hls } = await import('hls.js');
        if (disposed) {
          return;
        }

        if (!Hls.isSupported()) {
          video.src = manifestUrl;
          setReady(true);
          return;
        }

        const player = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 60 });
        player.loadSource(manifestUrl);
        player.attachMedia(video);

        player.on(Hls.Events.MANIFEST_PARSED, () => {
          if (disposed) {
            return;
          }
          setLevels(
            player.levels.map((level, index) => ({
              id: index,
              height: level.height ?? 0,
              label: level.height ? `${level.height}p` : `${Math.round((level.bitrate ?? 0) / 1000)} kb/s`,
            })),
          );
          setReady(true);
        });

        player.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          if (!disposed) {
            setCurrentLevel(data.level);
          }
        });

        player.on(Hls.Events.ERROR, (_event, data) => {
          if (disposed || !data.fatal) {
            return;
          }
          setError('A videófolyam jelenleg nem elérhető.');
        });

        hls = player as unknown as { destroy: () => void; currentLevel: number };
        setInstance(hls);
      } catch {
        if (!disposed) {
          setError('A lejátszó nem tudott elindulni.');
        }
      }
    };

    void attach();

    return () => {
      disposed = true;
      hls?.destroy();
      setInstance(null);
      setReady(false);
      setLevels([]);
    };
  }, [videoRef, manifestUrl]);

  /**
   * Applies a quality selection to the running stream.
   *
   * @param level - Level index, or `-1` for automatic.
   */
  const setLevel = (level: number): void => {
    setCurrentLevel(level);
    if (instance) {
      instance.currentLevel = level;
    }
  };

  return { ready, error, levels, currentLevel, setLevel };
}
