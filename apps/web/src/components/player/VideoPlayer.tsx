'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api-client';
import type { PlaybackManifestDto } from '@nova/shared';

import { PlayerControls } from './PlayerControls';
import { TrackMenu } from './TrackMenu';
import { useHlsPlayer } from './useHlsPlayer';

/** Props of {@link VideoPlayer}. */
export interface VideoPlayerProps {
  manifest: PlaybackManifestDto;
  title: string;
  subtitle?: string;
  /** Called every few seconds with the current position. */
  onProgress?: (positionSeconds: number, durationSeconds: number) => void;
  /** Called when playback reaches the end of the asset. */
  onEnded?: () => void;
  /** Starts the next episode; enables the auto-play countdown. */
  onNextEpisode?: () => void;
  /** Whether the profile enabled auto-play for the next episode. */
  autoplayNext?: boolean;
}

/** Seconds between two progress heartbeats. */
const PROGRESS_INTERVAL_SECONDS = 15;

/** Idle milliseconds after which the chrome hides. */
const IDLE_TIMEOUT_MS = 3200;

/**
 * Full-screen video player.
 *
 * Owns the media element and everything around it: adaptive streaming, resume,
 * subtitles, audio and quality selection, skip-intro, next-episode auto-play,
 * keyboard shortcuts and progress reporting.
 *
 * @param props - Manifest, labels and lifecycle callbacks.
 * @returns The player element.
 */
export function VideoPlayer({
  manifest,
  title,
  subtitle,
  onProgress,
  onEnded,
  onNextEpisode,
  autoplayNext = true,
}: VideoPlayerProps): React.JSX.Element {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastReport = useRef(0);
  const idleTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [position, setPosition] = useState(manifest.startPositionSeconds);
  const [duration, setDuration] = useState(manifest.durationSeconds);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState(
    manifest.audioTracks.find((track) => track.isDefault)?.id ?? manifest.audioTracks[0]?.id ?? '',
  );
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(null);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);

  const { ready, error, levels, currentLevel, setLevel } = useHlsPlayer(
    videoRef,
    manifest.manifestUrl,
  );

  /** Restores the resume position once the media is ready. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready || manifest.startPositionSeconds <= 0) {
      return;
    }
    video.currentTime = manifest.startPositionSeconds;
  }, [ready, manifest.startPositionSeconds]);

  /** Reveals the chrome and schedules the next auto-hide. */
  const wakeChrome = useCallback((): void => {
    setChromeVisible(true);
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current);
    }
    idleTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setChromeVisible(false);
        setMenuOpen(false);
      }
    }, IDLE_TIMEOUT_MS);
  }, []);

  const togglePlay = useCallback((): void => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
    wakeChrome();
  }, [wakeChrome]);

  const seek = useCallback(
    (seconds: number): void => {
      const video = videoRef.current;
      if (!video) {
        return;
      }
      video.currentTime = Math.max(0, Math.min(seconds, video.duration || duration));
      wakeChrome();
    },
    [duration, wakeChrome],
  );

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await container.requestFullscreen().catch(() => undefined);
    }
  }, []);

  /** Keyboard shortcuts, matching the conventions members already know. */
  useEffect(() => {
    /**
     * Handles a shortcut key.
     *
     * @param event - Keyboard event.
     */
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.target instanceof HTMLInputElement) {
        return;
      }

      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          seek(position + 10);
          break;
        case 'ArrowLeft':
          seek(position - 10);
          break;
        case 'ArrowUp':
          setVolume((value) => Math.min(1, value + 0.1));
          break;
        case 'ArrowDown':
          setVolume((value) => Math.max(0, value - 0.1));
          break;
        case 'f':
          void toggleFullscreen();
          break;
        case 'm':
          setMuted((value) => !value);
          break;
        case 'c':
          setActiveSubtitleId((current) =>
            current === null ? (manifest.subtitleTracks[0]?.id ?? null) : null,
          );
          break;
        case 'Escape':
          setMenuOpen(false);
          break;
        default:
          break;
      }
      wakeChrome();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [manifest.subtitleTracks, position, seek, toggleFullscreen, togglePlay, wakeChrome]);

  /** Mirrors volume and mute state onto the media element. */
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = muted;
    }
  }, [volume, muted]);

  /** Tracks the browser fullscreen state. */
  useEffect(() => {
    /** Syncs the local flag with the document state. */
    const onChange = (): void => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /** Enables the requested subtitle track on the media element. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    for (let index = 0; index < video.textTracks.length; index += 1) {
      const track = video.textTracks[index];
      if (track) {
        track.mode = track.id === activeSubtitleId ? 'showing' : 'disabled';
      }
    }
  }, [activeSubtitleId, ready]);

  /** Counts down and starts the next episode when credits begin. */
  useEffect(() => {
    if (nextCountdown === null) {
      return;
    }
    if (nextCountdown <= 0) {
      onNextEpisode?.();
      return;
    }
    const timer = window.setTimeout(() => setNextCountdown((value) => (value ?? 1) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [nextCountdown, onNextEpisode]);

  const showSkipIntro =
    manifest.introStartSeconds !== null &&
    manifest.introEndSeconds !== null &&
    position >= manifest.introStartSeconds &&
    position <= manifest.introEndSeconds;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full bg-black"
      onMouseMove={wakeChrome}
      onTouchStart={wakeChrome}
    >
      <video
        ref={videoRef}
        className="size-full bg-black"
        playsInline
        autoPlay
        crossOrigin="anonymous"
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setChromeVisible(true);
        }}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || manifest.durationSeconds)}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          setPosition(video.currentTime);

          if (video.buffered.length > 0) {
            setBuffered(video.buffered.end(video.buffered.length - 1));
          }

          if (video.currentTime - lastReport.current >= PROGRESS_INTERVAL_SECONDS) {
            lastReport.current = video.currentTime;
            onProgress?.(video.currentTime, video.duration || manifest.durationSeconds);
          }

          if (
            autoplayNext &&
            manifest.nextEpisodeId &&
            manifest.creditsStartSeconds !== null &&
            video.currentTime >= manifest.creditsStartSeconds &&
            nextCountdown === null
          ) {
            setNextCountdown(10);
          }
        }}
        onEnded={() => {
          onProgress?.(duration, duration);
          onEnded?.();
        }}
      >
        {manifest.subtitleTracks.map((track) => (
          <track
            key={track.id}
            id={track.id}
            kind="subtitles"
            label={track.label}
            srcLang={track.language}
            src={`${API_BASE_URL}${track.url}`}
          />
        ))}
      </video>

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-8 text-center">
          <div className="max-w-md space-y-3">
            <p className="text-lg font-semibold text-white">{error}</p>
            <p className="text-sm text-white/70">
              Ellenőrizd a kapcsolatot, vagy próbáld újra néhány másodperc múlva.
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Újratöltés
            </button>
          </div>
        </div>
      )}

      {showSkipIntro && (
        <button
          type="button"
          onClick={() => seek(manifest.introEndSeconds ?? position)}
          className="absolute bottom-28 right-6 z-20 rounded border border-white/70 bg-black/70 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
        >
          Főcím átugrása
        </button>
      )}

      {nextCountdown !== null && manifest.nextEpisodeId && (
        <div className="absolute bottom-28 right-6 z-20 flex items-center gap-3 rounded border border-white/20 bg-black/85 px-5 py-3 text-white">
          <span className="text-sm">Következő rész {nextCountdown} mp múlva</span>
          <button
            type="button"
            onClick={() => onNextEpisode?.()}
            className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-black"
          >
            Indítás
          </button>
          <button
            type="button"
            onClick={() => setNextCountdown(null)}
            className="rounded border border-white/40 px-3 py-1.5 text-xs"
          >
            Mégse
          </button>
        </div>
      )}

      <TrackMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        audioTracks={manifest.audioTracks}
        subtitleTracks={manifest.subtitleTracks}
        levels={levels}
        activeAudioId={activeAudioId}
        activeSubtitleId={activeSubtitleId}
        activeLevel={currentLevel}
        onSelectAudio={setActiveAudioId}
        onSelectSubtitle={setActiveSubtitleId}
        onSelectLevel={setLevel}
      />

      <div
        className={`transition-opacity duration-300 ${chromeVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <PlayerControls
          playing={playing}
          muted={muted}
          volume={volume}
          position={position}
          duration={duration}
          buffered={buffered}
          fullscreen={fullscreen}
          title={title}
          subtitle={subtitle}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onSkip={(delta) => seek(position + delta)}
          onVolume={(value) => {
            setVolume(value);
            setMuted(value === 0);
          }}
          onToggleMute={() => setMuted((value) => !value)}
          onToggleFullscreen={() => void toggleFullscreen()}
          onOpenTracks={() => setMenuOpen((open) => !open)}
          onBack={() => router.back()}
        />
      </div>
    </div>
  );
}
