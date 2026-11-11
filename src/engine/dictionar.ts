import { curata, normalizeaza, prefix as prefixDe, terminatie as terminatieDe } from './normalizare';

/**
 * Motorul jocului lucreaza sincron cu un Dictionar.
 * Inainte de o mutare, apelantul trebuie sa faca `await dict.pregateste(prefix)`.
 */
export interface Dictionar {
  /** Incarca (daca e nevoie) cuvintele care incep cu prefixul dat (2 litere, fara diacritice). */
  pregateste(prefix: string): Promise<void>;
  /** Formele canonice (cu diacritice) care se potrivesc cu ce a tastat jucatorul. Forma exacta e prima. */
  potriviri(input: string): string[];
  /** Cate cuvinte incep cu aceasta terminatie (0 = terminatia inchide jocul). */
  continuari(terminatie: string): number;
  /** Cuvintele care incep cu prefixul, ordonate descrescator dupa frecventa. Prefixul trebuie pregatit. */
  cuvinteCuPrefix(prefix: string): readonly string[];
  /** Prefixele existente, ordonate descrescator dupa numarul de cuvinte. */
  prefixe(): readonly string[];
}

export interface IndexDictionar {
  versiune: string;
  total: number;
  continuari: Record<string, number>;
  inchid: string[];
}

interface Grupa {
  cuvinte: string[];
  exacte: Set<string>;
  pozitie?: Map<string, number>; // construit la nevoie, pentru raritate
  normalizate: Map<string, string[]>; // forma fara diacritice -> forme canonice
}

function construiesteGrupa(cuvinte: string[]): Grupa {
  const normalizate = new Map<string, string[]>();
  for (const c of cuvinte) {
    const n = normalizeaza(c);
    const lista = normalizate.get(n);
    if (lista) lista.push(c);
    else normalizate.set(n, [c]);
  }
  return { cuvinte, exacte: new Set(cuvinte), normalizate };
}

abstract class DictionarPeGrupe implements Dictionar {
  protected grupe = new Map<string, Grupa>();
  protected abstract numarContinuari(terminatie: string): number;
  abstract pregateste(prefix: string): Promise<void>;
  abstract prefixe(): readonly string[];

  protected grupa(prefix: string): Grupa {
    const g = this.grupe.get(prefix);
    if (!g) throw new Error(`Prefixul "${prefix}" nu a fost pregatit (apeleaza pregateste).`);
    return g;
  }

  potriviri(input: string): string[] {
    const c = curata(input);
    const p = prefixDe(c);
    if (p.length < 2 || this.numarContinuari(p) === 0) return [];
    const g = this.grupa(p);
    const candidati = g.normalizate.get(normalizeaza(c)) ?? [];
    if (g.exacte.has(c)) return [c, ...candidati.filter((x) => x !== c)];
    return [...candidati];
  }

  continuari(terminatie: string): number {
    return this.numarContinuari(terminatie);
  }

  cuvinteCuPrefix(prefix: string): readonly string[] {
    if (this.numarContinuari(prefix) === 0) return [];
    return this.grupa(prefix).cuvinte;
  }

  /**
   * Cat de rar e cuvantul, intre 0 (cel mai frecvent) si 1 (cel mai rar), dupa pozitia in lista
   * ordonata dupa frecventa. Prefixul trebuie pregatit; cuvant necunoscut -> 0.
   */
  raritate(cuvant: string): number {
    const g = this.grupe.get(prefixDe(cuvant));
    if (!g || g.cuvinte.length < 2) return 0;
    if (!g.pozitie) g.pozitie = new Map(g.cuvinte.map((c, i) => [c, i]));
    const i = g.pozitie.get(curata(cuvant));
    return i === undefined ? 0 : i / (g.cuvinte.length - 1);
  }
}

/**
 * Dictionar incarcat lenes, pe fisiere de prefix (generate de scripts/imparte-lista.mjs).
 * In browser: new DictionarPeFisiere((f) => fetch(`/dict/${f}`).then((r) => r.json()))
 * In Node / Cloud Function: un loader care citeste de pe disc.
 */
export class DictionarPeFisiere extends DictionarPeGrupe {
  private index: IndexDictionar | null = null;
  private inCurs = new Map<string, Promise<void>>();
  private ordinePrefixe: string[] = [];

  constructor(private readonly incarca: (numeFisier: string) => Promise<unknown>) {
    super();
  }

  async init(): Promise<IndexDictionar> {
    if (!this.index) {
      this.index = (await this.incarca('index.json')) as IndexDictionar;
      this.ordinePrefixe = Object.entries(this.index.continuari)
        .sort((a, b) => b[1] - a[1])
        .map(([p]) => p);
    }
    return this.index;
  }

  private cereIndex(): IndexDictionar {
    if (!this.index) throw new Error('Dictionarul nu e initializat (apeleaza init).');
    return this.index;
  }

  protected numarContinuari(t: string): number {
    return this.cereIndex().continuari[t] ?? 0;
  }

  prefixe(): readonly string[] {
    this.cereIndex();
    return this.ordinePrefixe;
  }

  async pregateste(prefix: string): Promise<void> {
    await this.init();
    if (this.grupe.has(prefix) || this.numarContinuari(prefix) === 0) return;
    let p = this.inCurs.get(prefix);
    if (!p) {
      p = this.incarca(`${prefix}.json`).then((cuvinte) => {
        this.grupe.set(prefix, construiesteGrupa(cuvinte as string[]));
        this.inCurs.delete(prefix);
      });
      this.inCurs.set(prefix, p);
    }
    await p;
  }
}

/** Dictionar complet in memorie: pentru teste si pentru Cloud Function. Lista ordonata dupa frecventa. */
export class DictionarInMemorie extends DictionarPeGrupe {
  private numar = new Map<string, number>();
  private ordinePrefixe: string[];

  constructor(cuvinte: string[]) {
    super();
    const pePrefix = new Map<string, string[]>();
    for (const brut of cuvinte) {
      const c = curata(brut);
      const p = prefixDe(c);
      if (!pePrefix.has(p)) pePrefix.set(p, []);
      pePrefix.get(p)!.push(c);
    }
    for (const [p, lista] of pePrefix) {
      this.grupe.set(p, construiesteGrupa(lista));
      this.numar.set(p, lista.length);
    }
    this.ordinePrefixe = [...this.numar.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }

  protected numarContinuari(t: string): number {
    return this.numar.get(t) ?? 0;
  }

  prefixe(): readonly string[] {
    return this.ordinePrefixe;
  }

  async pregateste(): Promise<void> {}

  /** Terminatiile care inchid, calculate din lista (util pentru verificari). */
  inchideri(): string[] {
    const t = new Set<string>();
    for (const g of this.grupe.values()) for (const c of g.cuvinte) t.add(terminatieDe(c));
    return [...t].filter((x) => !this.numar.has(x)).sort();
  }
}
