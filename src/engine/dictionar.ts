import { compatibil, curata, inceput as inceputDe, normalizeaza, prefix as fisierDe, terminatie as terminatieDe } from './normalizare';

/**
 * Motorul jocului lucreaza sincron cu un Dictionar.
 * Inainte de o mutare, apelantul trebuie sa faca `await dict.pregateste(prefix)`.
 */
export interface Dictionar {
  /** Incarca (daca e nevoie) fisierul care contine cuvintele ce incep cu prefixul dat (cu sau fara diacritice). */
  pregateste(prefix: string): Promise<void>;
  /**
   * Formele canonice (cu diacritice) compatibile cu ce a tastat jucatorul: literele fara diacritic pot fi
   * completate, diacriticele tastate se respecta. Forma exacta e prima.
   */
  potriviri(input: string): string[];
  /** Cate cuvinte incep exact cu aceste doua litere, cu diacritice (0 = terminatia inchide jocul). */
  continuari(terminatie: string): number;
  /** Cuvintele care incep exact cu prefixul (cu diacritice), descrescator dupa frecventa. Prefixul trebuie pregatit. */
  cuvinteCuPrefix(prefix: string): readonly string[];
  /** Prefixele existente (cu diacritice), ordonate descrescator dupa numarul de cuvinte. */
  prefixe(): readonly string[];
}

export interface IndexDictionar {
  versiune: string;
  total: number;
  /** prefix exact (cu diacritice) -> cate cuvinte incep asa */
  continuari: Record<string, number>;
  /** terminatii exacte (cu diacritice) fara nicio continuare */
  inchid: string[];
}

/** Numele fisierului de index. Versiunea 2 numara prefixele cu diacritice. */
export const FISIER_INDEX = 'index-v2.json';

interface Grupa {
  cuvinte: string[];
  exacte: Set<string>;
  pozitie?: Map<string, number>; // construit la nevoie, pentru raritate
  normalizate: Map<string, string[]>; // forma fara diacritice -> forme canonice
  pePrefix?: Map<string, string[]>; // prefix exact -> cuvinte, construit la nevoie
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
  /** Exista fisier pentru aceasta cheie (fara diacritice)? */
  protected abstract areFisier(cheie: string): boolean;
  abstract pregateste(prefix: string): Promise<void>;
  abstract prefixe(): readonly string[];

  protected grupa(prefix: string): Grupa {
    const cheie = fisierDe(prefix);
    const g = this.grupe.get(cheie);
    if (!g) throw new Error(`Prefixul "${prefix}" nu a fost pregatit (apeleaza pregateste).`);
    return g;
  }

  potriviri(input: string): string[] {
    const c = curata(input);
    const cheie = fisierDe(c);
    if (cheie.length < 2 || !this.areFisier(cheie)) return [];
    const g = this.grupa(cheie);
    const candidati = (g.normalizate.get(normalizeaza(c)) ?? []).filter((x) => compatibil(c, x));
    if (g.exacte.has(c)) return [c, ...candidati.filter((x) => x !== c)];
    return candidati;
  }

  continuari(terminatie: string): number {
    return this.numarContinuari(terminatie);
  }

  cuvinteCuPrefix(prefix: string): readonly string[] {
    const p = curata(prefix);
    if (this.numarContinuari(p) === 0) return [];
    const g = this.grupa(p);
    if (!g.pePrefix) {
      g.pePrefix = new Map();
      for (const c of g.cuvinte) {
        const i = inceputDe(c);
        const lista = g.pePrefix.get(i);
        if (lista) lista.push(c);
        else g.pePrefix.set(i, [c]);
      }
    }
    return g.pePrefix.get(p) ?? [];
  }

  /**
   * Cat de rar e cuvantul, intre 0 (cel mai frecvent) si 1 (cel mai rar), dupa pozitia in lista
   * ordonata dupa frecventa. Prefixul trebuie pregatit; cuvant necunoscut -> 0.
   */
  raritate(cuvant: string): number {
    const g = this.grupe.get(fisierDe(cuvant));
    if (!g || g.cuvinte.length < 2) return 0;
    if (!g.pozitie) g.pozitie = new Map(g.cuvinte.map((c, i) => [c, i]));
    const i = g.pozitie.get(curata(cuvant));
    return i === undefined ? 0 : i / (g.cuvinte.length - 1);
  }
}

/**
 * Dictionar incarcat lenes, pe fisiere de prefix (generate de scripts/imparte-lista.mjs).
 * In browser: new DictionarPeFisiere((f) => fetch(`${BASE}dict/${f}`).then((r) => r.json()))
 * In Node / Cloud Function: un loader care citeste de pe disc.
 */
export class DictionarPeFisiere extends DictionarPeGrupe {
  private index: IndexDictionar | null = null;
  private inCurs = new Map<string, Promise<void>>();
  private ordinePrefixe: string[] = [];
  private fisiere = new Set<string>();

  constructor(private readonly incarca: (numeFisier: string) => Promise<unknown>) {
    super();
  }

  async init(): Promise<IndexDictionar> {
    if (!this.index) {
      this.index = (await this.incarca(FISIER_INDEX)) as IndexDictionar;
      this.fisiere = new Set(Object.keys(this.index.continuari).map(fisierDe));
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

  protected areFisier(cheie: string): boolean {
    this.cereIndex();
    return this.fisiere.has(cheie);
  }

  prefixe(): readonly string[] {
    this.cereIndex();
    return this.ordinePrefixe;
  }

  async pregateste(prefix: string): Promise<void> {
    await this.init();
    const cheie = fisierDe(prefix);
    if (this.grupe.has(cheie) || !this.fisiere.has(cheie)) return;
    let p = this.inCurs.get(cheie);
    if (!p) {
      p = this.incarca(`${cheie}.json`).then(
        (cuvinte) => {
          this.grupe.set(cheie, construiesteGrupa(cuvinte as string[]));
          this.inCurs.delete(cheie);
        },
        (e) => {
          this.inCurs.delete(cheie);
          throw e;
        },
      );
      this.inCurs.set(cheie, p);
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
    const peFisier = new Map<string, string[]>();
    for (const brut of cuvinte) {
      const c = curata(brut);
      const f = fisierDe(c);
      if (!peFisier.has(f)) peFisier.set(f, []);
      peFisier.get(f)!.push(c);
      const p = inceputDe(c);
      this.numar.set(p, (this.numar.get(p) ?? 0) + 1);
    }
    for (const [f, lista] of peFisier) this.grupe.set(f, construiesteGrupa(lista));
    this.ordinePrefixe = [...this.numar.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }

  protected numarContinuari(t: string): number {
    return this.numar.get(t) ?? 0;
  }

  protected areFisier(cheie: string): boolean {
    return this.grupe.has(cheie);
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
