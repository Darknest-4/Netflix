/** Cue templates per supported language. */
const CUE_TEMPLATES: Record<string, string[]> = {
  hu: [
    'A NOVA bemutatja',
    'Ez a felirat a lejátszó feliratkezelését mutatja be.',
    'A nyelvet a lejátszó "Feliratok" menüjében válthatod.',
    'A feliratok stílusa a beállításokban testre szabható.',
    'Jó szórakozást!',
  ],
  en: [
    'NOVA presents',
    'This subtitle track demonstrates the player subtitle pipeline.',
    'Switch languages from the "Subtitles" menu.',
    'Caption styling is configurable in the settings.',
    'Enjoy the show!',
  ],
  de: [
    'NOVA präsentiert',
    'Diese Untertitelspur demonstriert die Untertitelverarbeitung.',
    'Die Sprache lässt sich im Menü „Untertitel“ umschalten.',
    'Der Stil ist in den Einstellungen anpassbar.',
    'Viel Spaß!',
  ],
};

/**
 * Formats a second offset as a WebVTT timestamp.
 *
 * @param seconds - Offset from the start of the asset.
 * @returns `hh:mm:ss.mmm`.
 */
function toTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (value: number, size = 2): string => value.toString().padStart(size, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.000`;
}

/**
 * Builds a WebVTT subtitle document for a title.
 *
 * Cues repeat on a fixed cadence for the length of a typical episode, which is
 * enough to exercise subtitle rendering, switching and styling end to end.
 *
 * @param titleId - Catalog entry the track belongs to.
 * @param language - Requested language code.
 * @returns A complete WebVTT document.
 */
export function buildSubtitleTrack(titleId: string, language: string): string {
  const lines = CUE_TEMPLATES[language] ?? CUE_TEMPLATES.hu!;
  const cues: string[] = ['WEBVTT', '', `NOTE title=${titleId} lang=${language}`, ''];

  for (let index = 0; index < 40; index += 1) {
    const start = index * 45;
    const end = start + 6;
    cues.push(
      `${index + 1}`,
      `${toTimestamp(start)} --> ${toTimestamp(end)}`,
      lines[index % lines.length] as string,
      '',
    );
  }

  return cues.join('\n');
}
