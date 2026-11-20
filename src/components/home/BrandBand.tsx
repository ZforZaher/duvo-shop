// "The O takes both flavours" band with the rotating Duvo badge.
const D = 'M0 0 H16 A20 27 0 0 1 16 54 H0 Z M10 11 H16 A9.5 16 0 0 1 16 43 H10 Z';

export default function BrandBand() {
  return (
    <section className="band orange brandband" id="mark">
      <div className="inner">
        <div>
          <div className="label" style={{ marginBottom: 18 }}>The mark</div>
          <h2>The O takes<br /><span className="g">both flavours.</span></h2>
          <p>Our name ends on a split O, half orange and half green, just like the cup. Two D&apos;s sit side by side in the monogram, one for each drink.</p>
        </div>
        <div className="badge" role="img" aria-label="Duvo badge: two drinks, one cup">
          {/* The text ring is its own picture so it can spin on the graphics card, not the main thread. */}
          <svg className="ring" viewBox="0 0 320 320" aria-hidden="true">
            <defs><path id="ring" d="M160 160 m-124 0 a124 124 0 1 1 248 0 a124 124 0 1 1 -248 0" /></defs>
            <text fontFamily="var(--f-mono), monospace" fontSize="17" letterSpacing="7" fill="#F7F2EA">
              <textPath href="#ring">TWO DRINKS · ONE CUP · DUVO · TWO DRINKS · ONE CUP · DUVO ·</textPath>
            </text>
          </svg>
          <svg viewBox="0 0 320 320" aria-hidden="true">
            <circle cx="160" cy="160" r="150" fill="none" stroke="#F7F2EA" strokeWidth="1.5" />
            <circle cx="160" cy="160" r="100" fill="none" stroke="#F7F2EA" strokeWidth="1.5" />
            <g transform="translate(122 133)">
              <path d={D} fillRule="evenodd" fill="#F7F2EA" transform="translate(36 0) scale(-1 1)" />
              <path d={D} fillRule="evenodd" fill="#2C5B3B" transform="translate(40 0)" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
