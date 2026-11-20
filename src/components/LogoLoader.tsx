// Duvo loading mark: the two D's of the monogram fill up like two drinks being poured (orange, then green).
const D = 'M0 0 H16 A20 27 0 0 1 16 54 H0 Z M10 11 H16 A9.5 16 0 0 1 16 43 H10 Z';

export default function LogoLoader({ size = 84, label = 'Loading', dark = false, uid = 'll' }: { size?: number; label?: string; dark?: boolean; uid?: string }) {
  const outline = dark ? '#F7F2EA' : '#1E2620', a = `${uid}-a`, b = `${uid}-b`;
  return (
    <div className="logo-loader" role="status" aria-live="polite">
      <svg viewBox="-2 -2 80 58" width={size} height={(size * 58) / 80} aria-hidden="true">
        <defs>
          <clipPath id={a}><path d={D} transform="translate(36 0) scale(-1 1)" fillRule="evenodd" /></clipPath>
          <clipPath id={b}><path d={D} transform="translate(40 0)" fillRule="evenodd" /></clipPath>
        </defs>
        <g clipPath={`url(#${a})`}><rect className="ll-fill ll-a" x="0" y="0" width="38" height="54" fill="#E5582A" /></g>
        <g clipPath={`url(#${b})`}><rect className="ll-fill ll-b" x="38" y="0" width="40" height="54" fill="#2C5B3B" /></g>
        <path d={D} transform="translate(36 0) scale(-1 1)" fillRule="evenodd" fill="none" stroke={outline} strokeWidth="1.6" />
        <path d={D} transform="translate(40 0)" fillRule="evenodd" fill="none" stroke={outline} strokeWidth="1.6" />
      </svg>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
