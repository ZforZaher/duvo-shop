// ─────────────────────────────────────────────────────────────────────────────
// Duvo catalogue: product definitions and STARTING prices.
// Live prices, carton sizes, visibility and the "example prices" notice are edited in the admin panel
// (Products page) and stored in .data/settings.json; these values are only the defaults.
// Currency: Egyptian pounds (EGP), excluding VAT.
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCY = 'EGP';
export const VAT_RATE = 0.14; // Egypt standard VAT

/** Carton discounts, applied per product line by number of cartons ordered. */
export const TIERS = [
  { min: 1, discount: 0 },
  { min: 5, discount: 0.08 },
  { min: 20, discount: 0.15 },
] as const;

export const MAX_CARTONS_PER_LINE = 500;

export type Design = 'split' | 'heart' | 'round';
export type Category = 'cup' | 'sleeve';

export type Product = {
  slug: string;
  category: Category;
  name: string;
  short: string;
  description: string;
  /** Price of one piece (cup or sleeve), EGP excl. VAT. */
  unitPrice: number;
  /** Pieces per carton. Orders are placed in whole cartons. */
  perCarton: number;
  /** Which 3D cup to show. */
  design: Design;
  facts: string[];
  /** Shown in the shop. */
  active: boolean;
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    slug: 'split-cup', category: 'cup', design: 'split',
    name: 'Split cup', short: 'Two legs, one rim. The classic Duvo.',
    description: 'Two legs that meet just under the rim, so both drinks show side by side. Seals with its twin-pod lid.',
    unitPrice: 3.2, perCarton: 500,
    facts: ['Two drinks, 250 ml each', 'Clear food-grade PP 5', 'Iced or hot, −20 to 120 °C'], active: true,
  },
  {
    slug: 'heart-cup', category: 'cup', design: 'heart',
    name: 'Heart cup', short: 'Each leg is half a heart.',
    description: 'Two half-heart legs that come together as one heart at the rim. Made for sharing, and sealed with a heart-shaped twin-pod lid.',
    unitPrice: 3.8, perCarton: 500,
    facts: ['Two drinks, 250 ml each', 'Clear food-grade PP 5', 'Heart-shaped twin-pod lid'], active: true,
  },
  {
    slug: 'round-cup', category: 'cup', design: 'round',
    name: 'Round cup', short: 'One cup, a twisted wall inside.',
    description: 'A classic round cup with a twisted wall inside, so the two drinks wrap around each other. Seals with its twin-pod lid.',
    unitPrice: 3.0, perCarton: 500,
    facts: ['Two drinks, 250 ml each', 'Clear food-grade PP 5', 'Each side sealed on its own'], active: true,
  },
  {
    slug: 'sleeve-split', category: 'sleeve', design: 'split',
    name: 'Duvo sleeve · split', short: 'Printed paper sleeve for the split cup.',
    description: 'Printed board sleeve in Duvo orange. Keeps hands comfortable with hot drinks and holds the two legs together.',
    unitPrice: 0.9, perCarton: 1000,
    facts: ['Fits the split cup', '350 gsm printed board', 'Ships flat'], active: true,
  },
  {
    slug: 'sleeve-heart', category: 'sleeve', design: 'heart',
    name: 'Duvo sleeve · heart', short: 'Printed paper sleeve for the heart cup.',
    description: 'Printed board sleeve in Duvo orange, shaped to wrap the heart cup.',
    unitPrice: 0.9, perCarton: 1000,
    facts: ['Fits the heart cup', '350 gsm printed board', 'Ships flat'], active: true,
  },
  {
    slug: 'sleeve-round', category: 'sleeve', design: 'round',
    name: 'Duvo sleeve · round', short: 'Printed paper sleeve for the round cup.',
    description: 'Printed board sleeve in Duvo orange for the round cup.',
    unitPrice: 0.9, perCarton: 1000,
    facts: ['Fits the round cup', '350 gsm printed board', 'Ships flat'], active: true,
  },
];


export const CATEGORY_LABEL: Record<Category, string> = { cup: 'Cups', sleeve: 'Sleeves' };
export const DESIGN_LABEL: Record<Design, string> = { split: 'Split', heart: 'Heart', round: 'Round' };
