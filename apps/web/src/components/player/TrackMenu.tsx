'use client';

import type { AudioTrackDto, SubtitleTrackDto } from '@nova/shared';

import type { QualityLevel } from './useHlsPlayer';

/** Props of {@link TrackMenu}. */
export interface TrackMenuProps {
  open: boolean;
  onClose: () => void;
  audioTracks: AudioTrackDto[];
  subtitleTracks: SubtitleTrackDto[];
  levels: QualityLevel[];
  activeAudioId: string;
  /** Active subtitle track id, or `null` when subtitles are off. */
  activeSubtitleId: string | null;
  activeLevel: number;
  onSelectAudio: (id: string) => void;
  onSelectSubtitle: (id: string | null) => void;
  onSelectLevel: (level: number) => void;
}

/**
 * Audio, subtitle and quality selector.
 *
 * Rendered as three radio groups so the current selection is announced
 * correctly and the whole menu is operable from the keyboard.
 *
 * @param props - Track lists, current selection and callbacks.
 * @returns The menu element, or `null` when closed.
 */
export function TrackMenu({
  open,
  onClose,
  audioTracks,
  subtitleTracks,
  levels,
  activeAudioId,
  activeSubtitleId,
  activeLevel,
  onSelectAudio,
  onSelectSubtitle,
  onSelectLevel,
}: TrackMenuProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute bottom-24 right-4 z-20 w-[min(92vw,560px)] rounded-lg border border-white/15 bg-black/90 p-5 text-white shadow-2xl backdrop-blur sm:right-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/70">
          Hang és feliratok
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Menü bezárása"
          className="grid size-8 place-items-center rounded-full hover:bg-white/15"
        >
          ×
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
            Hangsáv
          </legend>
          <div className="space-y-1">
            {audioTracks.map((track) => (
              <label key={track.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="audio-track"
                  checked={track.id === activeAudioId}
                  onChange={() => onSelectAudio(track.id)}
                  className="accent-[var(--color-nova-red)]"
                />
                <span>
                  {track.label}
                  <span className="ml-1 text-xs text-white/50">{track.channels}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
            Felirat
          </legend>
          <div className="space-y-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="subtitle-track"
                checked={activeSubtitleId === null}
                onChange={() => onSelectSubtitle(null)}
                className="accent-[var(--color-nova-red)]"
              />
              Kikapcsolva
            </label>
            {subtitleTracks.map((track) => (
              <label key={track.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="subtitle-track"
                  checked={track.id === activeSubtitleId}
                  onChange={() => onSelectSubtitle(track.id)}
                  className="accent-[var(--color-nova-red)]"
                />
                {track.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
            Minőség
          </legend>
          <div className="space-y-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="quality-level"
                checked={activeLevel === -1}
                onChange={() => onSelectLevel(-1)}
                className="accent-[var(--color-nova-red)]"
              />
              Automatikus
            </label>
            {levels.map((level) => (
              <label key={level.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="quality-level"
                  checked={activeLevel === level.id}
                  onChange={() => onSelectLevel(level.id)}
                  className="accent-[var(--color-nova-red)]"
                />
                {level.label}
              </label>
            ))}
            {levels.length === 0 && <p className="text-xs text-white/50">Adaptív folyam</p>}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
