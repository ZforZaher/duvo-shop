// Downloads and decodes the cup models off the main thread, then hands the finished arrays to the page.
import { buffers, decode, type RawData } from './decode';

self.onmessage = async (e: MessageEvent<string>) => {
  try {
    const r = await fetch(e.data);
    if (!r.ok) throw new Error('Could not load cup models');
    const ready = decode((await r.json()) as RawData);
    (self as unknown as Worker).postMessage({ ok: true, data: ready }, buffers(ready));
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: String((err as Error).message || err) });
  }
};
