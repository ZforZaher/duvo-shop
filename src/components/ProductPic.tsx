// Simple brand illustrations for product cards (not to scale; the 3D view is on each product page).
import type { Product } from '@/lib/catalog';

const O = '#E5582A', G = '#2C5B3B', C = '#F7F2EA', INK = '#1E2620', A = '#E0782F', B = '#8DB255';

function Cup({ design }: { design: Product['design'] }) {
  if (design === 'heart') {
    return (
      <svg viewBox="0 0 200 150" width="70%" aria-hidden="true">
        <path d="M100 132 L42 72 A30 30 0 0 1 100 38 Z" fill={A} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M100 132 L158 72 A30 30 0 0 0 100 38 Z" fill={B} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    );
  }
  const twist = design === 'round';
  return (
    <svg viewBox="0 0 200 150" width="70%" aria-hidden="true">
      {twist ? (
        <>
          <path d="M62 18 H138 L126 136 H74 Z" fill={B} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M62 18 H100 C 100 60, 88 100, 74 136 Z" fill={A} />
          <path d="M100 18 C 100 60, 88 100, 74 136" fill="none" stroke={INK} strokeWidth="2" />
          <path d="M62 18 H138 L126 136 H74 Z" fill="none" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <path d="M60 18 H98 V128 L76 134 Z" fill={A} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M102 18 H140 L124 134 L102 128 Z" fill={B} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )}
      <rect x="56" y="12" width="88" height="8" rx="3" fill={C} stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

function Sleeve() {
  return (
    <svg viewBox="0 0 200 150" width="80%" aria-hidden="true">
      <path d="M20 46 Q100 26 180 46 L170 106 Q100 88 30 106 Z" fill={O} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M27 58 Q100 39 173 58" fill="none" stroke={G} strokeWidth="3" />
      <path d="M31 96 Q100 78 169 96" fill="none" stroke={G} strokeWidth="3" />
      <text x="100" y="82" textAnchor="middle" fontFamily="Impact, Anton, sans-serif" fontSize="26" fill={C} letterSpacing="1">DUVO</text>
    </svg>
  );
}

export default function ProductPic({ p }: { p: Product }) {
  return p.category === 'cup' ? <Cup design={p.design} /> : <Sleeve />;
}
