'use client';

import { BRAND_NAME } from '@nova/shared';

/** Questions rendered on the landing page. */
const FAQ = [
  {
    question: `Mi az a ${BRAND_NAME}?`,
    answer: `A ${BRAND_NAME} egy előfizetéses streaming szolgáltatás, ahol reklámok nélkül nézhetsz sorozatokat, filmeket és dokumentumfilmeket internetkapcsolattal rendelkező eszközökön.`,
  },
  {
    question: 'Mennyibe kerül?',
    answer:
      'Havi 2 490 Ft-tól 5 990 Ft-ig, csomagtól függően. Nincs szerződés, nincs kiegészítő díj — egyetlen havidíj, minden eszközre.',
  },
  {
    question: 'Hol nézhetem?',
    answer:
      'Bárhol, bármikor. Jelentkezz be a fiókodba számítógépen vagy bármely internetkapcsolattal rendelkező eszközön, amely támogatja a webes lejátszást.',
  },
  {
    question: 'Hogyan mondhatom le?',
    answer:
      'Egyetlen kattintással, a Fiók oldalon. Nincs felmondási idő és nincs díj — a lemondás a fizetési időszak végén lép életbe.',
  },
  {
    question: 'Alkalmas gyerekeknek is?',
    answer:
      'Igen. Külön gyermekprofilt hozhatsz létre, amely csak korhatár-mentes tartalmat mutat, és PIN-kóddal védheted a felnőtt profilokat.',
  },
] as const;

/**
 * Frequently asked questions.
 *
 * Built on native `<details>` elements, so it works without JavaScript, is
 * keyboard operable by default and is announced correctly by screen readers.
 *
 * @returns The accordion element.
 */
export function FaqAccordion(): React.JSX.Element {
  return (
    <div className="space-y-2">
      {FAQ.map((item) => (
        <details
          key={item.question}
          className="group rounded-lg border border-[var(--surface-border)] bg-[var(--surface-raised)]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-lg font-semibold">
            {item.question}
            <span
              aria-hidden="true"
              className="text-2xl transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="border-t border-[var(--surface-border)] px-6 py-5 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
