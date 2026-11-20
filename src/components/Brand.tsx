// Duvo marks: the wordmark with the split O, and the two-D monogram.
export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`wm ${className}`}>Duv<span className="o">o</span></span>;
}

const D = 'M0 0 H16 A20 27 0 0 1 16 54 H0 Z M10 11 H16 A9.5 16 0 0 1 16 43 H10 Z';
export function Monogram({ width = 30, left = '#E5582A', right = '#2C5B3B' }: { width?: number; left?: string; right?: string }) {
  return (
    <svg viewBox="0 0 76 54" width={width} height={(width * 54) / 76} aria-hidden="true" style={{ display: 'block' }}>
      <path d={D} fillRule="evenodd" fill={left} transform="translate(36 0) scale(-1 1)" />
      <path d={D} fillRule="evenodd" fill={right} transform="translate(40 0)" />
    </svg>
  );
}
