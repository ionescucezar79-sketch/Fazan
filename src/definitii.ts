// Definitii din DEX '98 / DEX '96 (singurele surse dexonline cu drept de redistribuire),
// generate de scripts/genereaza_definitii.py in public/def/<primele 3 litere>.json.
import { curata, normalizeaza } from './engine';

export interface Definitie {
  lema: string;
  categorie?: string;
  text: string;
  sursa: string;
}

interface Fisier {
  L: Record<string, { c?: string; t: string; s: string }>;
  F: Record<string, string[]>;
}

const BAZA = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<Fisier | null>>();

function fisier(cheie: string): Promise<Fisier | null> {
  let p = cache.get(cheie);
  if (!p) {
    p = fetch(`${BAZA}def/${cheie}.json`)
      .then((r) => {
        if (r.ok) return r.json() as Promise<Fisier>;
        if (r.status === 404) return { L: {}, F: {} }; // niciun cuvant cu definitie pe acest prefix
        throw new Error(String(r.status));
      })
      .catch(() => {
        cache.delete(cheie); // se reincearca data viitoare
        return null;
      });
    cache.set(cheie, p);
  }
  return p;
}

const cheie = (s: string) => normalizeaza(s).slice(0, 3);

/** Definitiile pentru o forma (ex. „fazanului” -> fazan). Lista goala = nu avem definitia. */
export async function cautaDefinitii(cuvant: string): Promise<Definitie[]> {
  const c = curata(cuvant);
  const f = await fisier(cheie(c));
  if (!f) throw new Error('Definițiile nu s-au putut încărca.');
  const leme = f.F[c] ?? [c];
  const rez: Definitie[] = [];
  for (const lema of leme) {
    const fl = cheie(lema) === cheie(c) ? f : await fisier(cheie(lema));
    const d = fl?.L[lema];
    if (d) rez.push({ lema, categorie: d.c, text: d.t, sursa: d.s });
  }
  return rez;
}

export const linkDexonline = (cuvant: string) => `https://dexonline.ro/definitie/${encodeURIComponent(curata(cuvant))}`;
