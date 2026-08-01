import { BRAND_NAME } from '@nova/shared';

/** Input of {@link renderEmail}. */
export interface EmailTemplateInput {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
}

/**
 * Escapes user supplied text before it is interpolated into HTML.
 *
 * @param value - Raw text.
 * @returns HTML-safe text.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders a transactional e-mail in both HTML and plain text.
 *
 * The layout is a single dark card with the wordmark on top — deliberately
 * table-free and inline-styled so it survives every major mail client.
 *
 * @param input - Subject, body and optional call to action.
 * @returns Rendered HTML and text bodies.
 */
export function renderEmail(input: EmailTemplateInput): { html: string; text: string } {
  const cta =
    input.ctaHref && input.ctaLabel
      ? `<a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#e11d2e;color:#ffffff;border-radius:4px;font-weight:700;text-decoration:none">${escapeHtml(input.ctaLabel)}</a>`
      : '';

  const html = `<!doctype html>
<html lang="hu">
  <body style="margin:0;padding:32px 16px;background:#0b0b0f;font-family:Inter,Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#141419;border-radius:12px;padding:40px 36px;color:#e6e6ea">
      <div style="font-size:26px;font-weight:900;letter-spacing:.14em;color:#e11d2e">${BRAND_NAME}</div>
      <h1 style="margin:28px 0 12px;font-size:22px;line-height:1.3;color:#ffffff">${escapeHtml(input.title)}</h1>
      <p style="margin:0;font-size:15px;line-height:1.65;color:#b6b6c0">${escapeHtml(input.body)}</p>
      ${cta}
      <p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#6f6f7c">
        ${escapeHtml(input.footerNote ?? `Ezt a levelet a ${BRAND_NAME} fiókodhoz kapcsolódóan küldtük.`)}
      </p>
    </div>
  </body>
</html>`;

  const text = [
    BRAND_NAME,
    '',
    input.title,
    '',
    input.body,
    input.ctaHref ? `\n${input.ctaLabel}: ${input.ctaHref}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text };
}
