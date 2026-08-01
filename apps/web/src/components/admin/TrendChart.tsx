import type { TimeSeriesPointDto } from '@nova/shared';

/** Props of {@link TrendChart}. */
export interface TrendChartProps {
  title: string;
  points: TimeSeriesPointDto[];
}

/**
 * Sparkline-style area chart for a daily time series.
 *
 * Hand-drawn as an inline SVG rather than pulled from a charting library: the
 * dashboard needs one chart shape, and this keeps the bundle small and the
 * markup fully themeable. The underlying numbers are also exposed in a visually
 * hidden table so the data is available to screen readers.
 *
 * @param props - Chart title and data points.
 * @returns The chart element.
 */
export function TrendChart({ title, points }: TrendChartProps): React.JSX.Element {
  const width = 600;
  const height = 180;
  const padding = 8;

  const values = points.map((point) => point.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);

  /**
   * Maps a data point onto SVG coordinates.
   *
   * @param value - Data value.
   * @param index - Position in the series.
   * @returns `[x, y]` in the SVG coordinate system.
   */
  const project = (value: number, index: number): [number, number] => {
    const x =
      padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
    const y =
      height - padding - ((value - min) / Math.max(1, max - min)) * (height - padding * 2);
    return [x, y];
  };

  const line = points
    .map((point, index) => {
      const [x, y] = project(point.value, index);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const area = `${line} L${width - padding},${height - padding} L${padding},${height - padding} Z`;

  return (
    <figure className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-6">
      <figcaption className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {title}
      </figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`${title}: ${values.at(-1) ?? 0} az utolsó napon, maximum ${max}.`}
      >
        <defs>
          <linearGradient id={`grad-${title.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-nova-red)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--color-nova-red)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#grad-${title.replace(/\W/g, '')})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-nova-red)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Dátum</th>
            <th scope="col">Érték</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.date}</th>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
