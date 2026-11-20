// The fields of the add / edit product form (used inside an ActionForm).
import { CATEGORY_LABEL, DESIGN_LABEL, type Category, type Design, type Product } from '@/lib/catalog';

export default function ProductFields({ p, builtIn = false, isNew = false }: { p?: Product; builtIn?: boolean; isNew?: boolean }) {
  return (
    <>
      <div className="row2">
        <label htmlFor="name">Product name<input id="name" name="name" defaultValue={p?.name} maxLength={60} required placeholder="e.g. Split cup · 400 ml" /></label>
        {isNew
          ? <label htmlFor="slug">Web address <span className="opt">(optional, made from the name)</span>
              <input id="slug" name="slug" maxLength={40} pattern="[a-z0-9\-]*" placeholder="split-cup-400" autoComplete="off" spellCheck={false} /></label>
          : <label>Web address<input value={`/shop/${p?.slug}`} readOnly disabled /><input type="hidden" name="slug" value={p?.slug} /></label>}
      </div>
      <div className="row2">
        <label htmlFor="category">Type
          {builtIn
            ? <><input value={CATEGORY_LABEL[p!.category]} readOnly disabled /><input type="hidden" name="category" value={p!.category} /></>
            : <select id="category" name="category" defaultValue={p?.category ?? 'cup'}>
                {(Object.keys(CATEGORY_LABEL) as Category[]).map(c => <option key={c} value={c}>{CATEGORY_LABEL[c].replace(/s$/, '')}</option>)}
              </select>}
        </label>
        <label htmlFor="design">Picture / 3D shape
          <select id="design" name="design" defaultValue={p?.design ?? 'split'}>
            {(Object.keys(DESIGN_LABEL) as Design[]).map(d => <option key={d} value={d}>{DESIGN_LABEL[d]} cup</option>)}
          </select>
        </label>
      </div>
      <div className="row2">
        <label htmlFor="unitPrice">Price per piece (EGP, excl. VAT)<input id="unitPrice" name="unitPrice" defaultValue={p ? p.unitPrice.toFixed(2) : ''} inputMode="decimal" required placeholder="3.20" /></label>
        <label htmlFor="perCarton">Pieces per carton<input id="perCarton" name="perCarton" defaultValue={p?.perCarton ?? 500} inputMode="numeric" required /></label>
      </div>
      <label htmlFor="short">Short line for the shop card<input id="short" name="short" defaultValue={p?.short} maxLength={120} required placeholder="Two legs, one rim." /></label>
      <label htmlFor="description">Description for the product page<textarea id="description" name="description" defaultValue={p?.description} maxLength={700} required /></label>
      <label htmlFor="facts">Key facts <span className="opt">(one per line, up to 6)</span><textarea id="facts" name="facts" defaultValue={p?.facts.join('\n')} maxLength={600} placeholder={'Two drinks, 250 ml each\nClear food-grade PP 5'} /></label>
      <label className="check"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /><span>Show in the shop</span></label>
    </>
  );
}
