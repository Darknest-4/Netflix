'use client';

import { useState } from 'react';
import {
  API_ROUTES,
  GENRES,
  MaturityRating,
  TitleKind,
  type TitleSummaryDto,
} from '@nova/shared';

import { Artwork } from '@/components/catalog/Artwork';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';

/** Props of {@link CatalogManager}. */
export interface CatalogManagerProps {
  titles: TitleSummaryDto[];
  /** Lifts the updated list back to the page. */
  onTitlesChange: (titles: TitleSummaryDto[]) => void;
}

/** Editable fields of the CMS form. */
interface FormState {
  name: string;
  kind: TitleKind;
  synopsis: string;
  releaseYear: number;
  maturityRating: MaturityRating;
  genres: string[];
  durationMinutes: number;
  isOriginal: boolean;
  isPublished: boolean;
}

/** Initial state of a new entry. */
const EMPTY_FORM: FormState = {
  name: '',
  kind: TitleKind.MOVIE,
  synopsis: '',
  releaseYear: new Date().getFullYear(),
  maturityRating: MaturityRating.TWELVE_PLUS,
  genres: [],
  durationMinutes: 100,
  isOriginal: true,
  isPublished: false,
};

/**
 * Content management system.
 *
 * Lists every catalog entry — drafts included — and provides the create, edit
 * and delete flows the editorial team uses.
 *
 * @param props - Current entries and the change callback.
 * @returns The CMS section.
 */
export function CatalogManager({
  titles,
  onTitlesChange,
}: CatalogManagerProps): React.JSX.Element {
  const { authFetch } = useSession();
  const { notify } = useToast();

  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const filtered = titles.filter((title) =>
    title.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  /** Reloads the CMS list from the API. */
  const reload = async (): Promise<void> => {
    const page = await authFetch<{ data: TitleSummaryDto[] }>(
      `${API_ROUTES.admin.titles}?perPage=50`,
    );
    onTitlesChange(page.data);
  };

  /** Creates or updates an entry. */
  const save = async (): Promise<void> => {
    setBusy(true);
    try {
      const body = {
        name: form.name,
        kind: form.kind,
        synopsis: form.synopsis,
        releaseYear: Number(form.releaseYear),
        maturityRating: form.maturityRating,
        genres: form.genres,
        isOriginal: form.isOriginal,
        isPublished: form.isPublished,
        ...(form.kind === TitleKind.MOVIE
          ? { durationSeconds: Number(form.durationMinutes) * 60 }
          : {
              seasons: [
                {
                  seasonNumber: 1,
                  episodes: [
                    { episodeNumber: 1, name: '1. rész', durationSeconds: 2_700, synopsis: '' },
                  ],
                },
              ],
            }),
      };

      if (editingId) {
        await authFetch(API_ROUTES.admin.titleById(editingId), { method: 'PATCH', body });
        notify('Tartalom frissítve.', 'success');
      } else {
        await authFetch(API_ROUTES.admin.titles, { method: 'POST', body });
        notify('Tartalom létrehozva.', 'success');
      }

      await reload();
      setEditorOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch {
      notify('A mentés nem sikerült — ellenőrizd a mezőket.', 'error');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Deletes an entry after confirmation.
   *
   * @param title - Entry to delete.
   */
  const remove = async (title: TitleSummaryDto): Promise<void> => {
    if (!window.confirm(`Biztosan törlöd: ${title.name}?`)) {
      return;
    }
    try {
      await authFetch(API_ROUTES.admin.titleById(title.id), { method: 'DELETE' });
      onTitlesChange(titles.filter((entry) => entry.id !== title.id));
      notify('Tartalom törölve.', 'success');
    } catch {
      notify('A törlés nem sikerült.', 'error');
    }
  };

  return (
    <section aria-label="Tartalomkezelés">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-sm">
          <Input
            label="Keresés a katalógusban"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setEditingId(null);
            setEditorOpen(true);
          }}
        >
          + Új tartalom
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--surface-border)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--surface-raised)] text-left text-[var(--text-muted)]">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Tartalom
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Típus
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Év
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Műfaj
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Népszerűség
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Műveletek
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((title) => (
              <tr key={title.id} className="border-t border-[var(--surface-border)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 overflow-hidden rounded">
                      <Artwork artwork={title.artwork} ratio="wide" showWordmark={false} />
                    </span>
                    <span className="font-medium">{title.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {title.kind === TitleKind.SERIES ? 'Sorozat' : 'Film'}
                </td>
                <td className="px-4 py-3 tabular-nums">{title.releaseYear}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">
                  {title.genres.slice(0, 2).join(', ')}
                </td>
                <td className="px-4 py-3 tabular-nums">{title.matchScore}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(title.id);
                        setForm({
                          name: title.name,
                          kind: title.kind,
                          synopsis: title.tagline || 'Szerkesztés alatt álló leírás.',
                          releaseYear: title.releaseYear,
                          maturityRating: title.maturityRating,
                          genres: title.genres,
                          durationMinutes: Math.round((title.durationSeconds ?? 6000) / 60),
                          isOriginal: title.isOriginal,
                          isPublished: true,
                        });
                        setEditorOpen(true);
                      }}
                      className="text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
                    >
                      Szerkesztés
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(title)}
                      className="text-danger underline"
                    >
                      Törlés
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? 'Tartalom szerkesztése' : 'Új tartalom'}
        size="xl"
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Input
            label="Cím"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cms-kind" className="text-sm font-medium text-[var(--text-secondary)]">
              Típus
            </label>
            <select
              id="cms-kind"
              value={form.kind}
              onChange={(event) => setForm({ ...form, kind: event.target.value as TitleKind })}
              className="h-12 rounded-md border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3"
            >
              <option value={TitleKind.MOVIE}>Film</option>
              <option value={TitleKind.SERIES}>Sorozat</option>
            </select>
          </div>

          <Input
            label="Megjelenés éve"
            type="number"
            value={form.releaseYear}
            onChange={(event) => setForm({ ...form, releaseYear: Number(event.target.value) })}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cms-rating" className="text-sm font-medium text-[var(--text-secondary)]">
              Korhatár
            </label>
            <select
              id="cms-rating"
              value={form.maturityRating}
              onChange={(event) =>
                setForm({ ...form, maturityRating: event.target.value as MaturityRating })
              }
              className="h-12 rounded-md border border-[var(--surface-border)] bg-[var(--surface-overlay)] px-3"
            >
              {Object.values(MaturityRating).map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </div>

          {form.kind === TitleKind.MOVIE && (
            <Input
              label="Játékidő (perc)"
              type="number"
              value={form.durationMinutes}
              onChange={(event) =>
                setForm({ ...form, durationMinutes: Number(event.target.value) })
              }
            />
          )}

          <div className="sm:col-span-2">
            <label
              htmlFor="cms-synopsis"
              className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
            >
              Leírás
            </label>
            <textarea
              id="cms-synopsis"
              rows={4}
              value={form.synopsis}
              onChange={(event) => setForm({ ...form, synopsis: event.target.value })}
              className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-3 text-[15px]"
            />
          </div>

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Műfajok</legend>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const selected = form.genres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setForm({
                        ...form,
                        genres: selected
                          ? form.genres.filter((entry) => entry !== genre)
                          : [...form.genres, genre],
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? 'bg-nova-red text-white'
                        : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isOriginal}
              onChange={(event) => setForm({ ...form, isOriginal: event.target.checked })}
              className="size-4 accent-[var(--color-nova-red)]"
            />
            NOVA saját gyártás
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
              className="size-4 accent-[var(--color-nova-red)]"
            />
            Publikálva
          </label>

          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Mégse
            </Button>
            <Button
              loading={busy}
              disabled={form.name.length === 0 || form.synopsis.length < 10}
              onClick={() => void save()}
            >
              Mentés
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
