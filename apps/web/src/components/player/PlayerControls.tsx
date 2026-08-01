'use client';

import { formatTimecode } from '@nova/shared';

/** Props of {@link PlayerControls}. */
export interface PlayerControlsProps {
  playing: boolean;
  muted: boolean;
  volume: number;
  position: number;
  duration: number;
  buffered: number;
  fullscreen: boolean;
  title: string;
  subtitle?: string;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (deltaSeconds: number) => void;
  onVolume: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onOpenTracks: () => void;
  onBack: () => void;
}

/**
 * Transport bar of the video player.
 *
 * Every control is a real button with an accessible name, the scrubber is an
 * `<input type="range">` (so it works with keyboard and screen readers out of
 * the box), and the buffered range is drawn behind the played range.
 *
 * @param props - Player state and callbacks.
 * @returns The control bar element.
 */
export function PlayerControls({
  playing,
  muted,
  volume,
  position,
  duration,
  buffered,
  fullscreen,
  title,
  subtitle,
  onTogglePlay,
  onSeek,
  onSkip,
  onVolume,
  onToggleMute,
  onToggleFullscreen,
  onOpenTracks,
  onBack,
}: PlayerControlsProps): React.JSX.Element {
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/85 via-transparent to-black/60 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Vissza"
          className="grid size-10 place-items-center rounded-full bg-black/50 text-xl text-white hover:bg-black/80"
        >
          ←
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white sm:text-base">{title}</p>
          {subtitle && <p className="truncate text-xs text-white/70">{subtitle}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-white/25">
            <div className="h-full rounded bg-white/40" style={{ width: `${bufferedPercent}%` }} />
            <div className="absolute inset-y-0 left-0 rounded bg-nova-red" style={{ width: `${progress}%` }} />
          </div>
          <label htmlFor="player-scrubber" className="sr-only">
            Lejátszási pozíció
          </label>
          <input
            id="player-scrubber"
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            value={Math.floor(position)}
            onChange={(event) => onSeek(Number(event.target.value))}
            aria-valuetext={`${formatTimecode(position)} / ${formatTimecode(duration)}`}
            className="relative z-10 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-nova-red"
          />
        </div>

        <div className="flex items-center gap-3 text-white">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Szünet' : 'Lejátszás'}
            className="grid size-11 place-items-center rounded-full hover:bg-white/15"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden="true">
                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSkip(-10)}
            aria-label="10 másodperc vissza"
            className="grid size-10 place-items-center rounded-full text-xs font-semibold hover:bg-white/15"
          >
            −10
          </button>
          <button
            type="button"
            onClick={() => onSkip(10)}
            aria-label="10 másodperc előre"
            className="grid size-10 place-items-center rounded-full text-xs font-semibold hover:bg-white/15"
          >
            +10
          </button>

          <div className="group/volume flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Hang bekapcsolása' : 'Némítás'}
              className="grid size-10 place-items-center rounded-full hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
                {muted || volume === 0 ? (
                  <path d="M5 9v6h4l5 4V5L9 9H5Zm11.5 3 2.8-2.8-1.4-1.4L15 10.6l-2.8-2.8-1.4 1.4L13.6 12l-2.8 2.8 1.4 1.4 2.8-2.8 2.9 2.8 1.4-1.4L16.5 12Z" />
                ) : (
                  <path d="M5 9v6h4l5 4V5L9 9H5Zm11.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z" />
                )}
              </svg>
            </button>
            <label htmlFor="player-volume" className="sr-only">
              Hangerő
            </label>
            <input
              id="player-volume"
              type="range"
              min={0}
              max={100}
              value={Math.round((muted ? 0 : volume) * 100)}
              onChange={(event) => onVolume(Number(event.target.value) / 100)}
              className="w-0 cursor-pointer opacity-0 transition-all duration-200 group-hover/volume:w-24 group-hover/volume:opacity-100 focus:w-24 focus:opacity-100"
            />
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/80">
            {formatTimecode(position)} / {formatTimecode(duration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTracks}
              aria-label="Feliratok és hangsávok"
              className="grid size-10 place-items-center rounded-full hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
                <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 9h5v-2H6v2Zm7 0h5v-2h-5v2Z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={fullscreen ? 'Kilépés a teljes képernyőből' : 'Teljes képernyő'}
              className="grid size-10 place-items-center rounded-full hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
                {fullscreen ? (
                  <path d="M9 9H4v2h7V4H9v5Zm6 0V4h-2v7h7V9h-5ZM4 13v2h5v5h2v-7H4Zm9 7h2v-5h5v-2h-7v7Z" />
                ) : (
                  <path d="M4 4h7v2H6v5H4V4Zm16 0v7h-2V6h-5V4h7ZM4 13h2v5h5v2H4v-7Zm16 0v7h-7v-2h5v-5h2Z" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
