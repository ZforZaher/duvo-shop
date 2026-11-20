// Server-rendered charts for the dashboard. Single-series, so one ink colour (Duvo green, checked for
// contrast against the panel surface); text stays in text colours; each bar has a hover tooltip, and
// every chart has a table view for screen readers and exact numbers.

type Bar = { label: string; value: number; tip: string };

/** Vertical bars over time with a baseline, 3 light gridlines and a few date labels. */
export function ColumnChart({ data, format, title }: { data: Bar[]; format: (n: number) => string; title: string }) {
  const W = 760, H = 220, padL = 64, padB = 26, padT = 10, padR = 8;
  const max = Math.max(1, ...data.map(d => d.value));
  const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= max) return m * p; return 10 * p; })();
  const iw = W - padL - padR, ih = H - padT - padB, n = data.length, slot = iw / n, bw = Math.max(1, slot - 2);
  const y = (v: number) => padT + ih - (v / nice) * ih;
  const every = Math.ceil(n / 8);
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} style={{ width: '100%', height: 'auto' }}>
        {[0, 0.5, 1].map(f => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(nice * f)} y2={y(nice * f)} stroke="var(--line)" strokeWidth={f === 0 ? 1.5 : 1} />
            <text x={padL - 8} y={y(nice * f) + 4} textAnchor="end" className="tick">{format(nice * f)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + 1, h = (d.value / nice) * ih, top = padT + ih - h, r = Math.min(4, bw / 2, h);
          return (
            <g key={d.label} className="bar">
              <rect x={padL + i * slot} y={padT} width={slot} height={ih} fill="transparent"><title>{d.tip}</title></rect>
              {h > 0 && (
                <path d={`M${x},${padT + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${padT + ih} Z`} fill="var(--green)">
                  <title>{d.tip}</title>
                </path>
              )}
              {i % every === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="tick">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <details className="tableview"><summary className="label">Show as table</summary>
        <table className="t"><thead><tr><th>Day</th><th className="r">Value</th></tr></thead>
          <tbody>{data.map(d => <tr key={d.label}><td>{d.label}</td><td className="r num">{format(d.value)}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}

/** Horizontal bar list: label, bar, value. */
export function BarList({ rows, format, empty }: { rows: { label: React.ReactNode; value: number; key: string }[]; format: (n: number) => string; empty: string }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  if (!rows.length || rows.every(r => r.value === 0)) return <p className="muted small" style={{ margin: 0 }}>{empty}</p>;
  return (
    <ul className="barlist">
      {rows.map(r => (
        <li key={r.key}>
          <span className="bl-label">{r.label}</span>
          <span className="bl-track" aria-hidden="true"><span className="bl-bar" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="bl-val num">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}
