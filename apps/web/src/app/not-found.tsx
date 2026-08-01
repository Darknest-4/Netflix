import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';

/**
 * 404 page.
 *
 * @returns The page element.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md space-y-5">
        <Logo size="lg" href="/" />
        <h1 className="text-3xl font-black tracking-tight">Ez a lap eltűnt a képernyőről</h1>
        <p className="text-[var(--text-secondary)]">
          A keresett oldal nem található. Lehet, hogy a tartalom lekerült a kínálatból, vagy elgépelt
          címet nyitottál meg.
        </p>
        <div className="flex justify-center gap-3">
          <Button href="/browse">Kezdőlap</Button>
          <Button href="/search" variant="secondary">
            Keresés
          </Button>
        </div>
      </div>
    </div>
  );
}
