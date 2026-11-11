// Recompensele: nuci (moneda jocului), ranguri si insigne ("lada de zestre").
// Totul e pur, fara React, ca sa se poata testa si, mai tarziu, verifica pe server.

import type { Loc } from './locuri';

// ---------- ranguri ----------

export interface Rang {
  nume: string;
  prag: number; // nuci stranse in total
}

export const RANGURI: Rang[] = [
  { nume: 'Ucenic', prag: 0 },
  { nume: 'Vorbăreț', prag: 150 },
  { nume: 'Iscusit', prag: 450 },
  { nume: 'Meșter de vorbe', prag: 1000 },
  { nume: 'Vătaful jocului', prag: 2000 },
];

export function rangDupaNuci(nuci: number) {
  let index = 0;
  RANGURI.forEach((r, i) => {
    if (nuci >= r.prag) index = i;
  });
  const urmator = RANGURI[index + 1] ?? null;
  const progres = urmator ? (nuci - RANGURI[index].prag) / (urmator.prag - RANGURI[index].prag) : 1;
  return { index, rang: RANGURI[index], urmator, progres };
}

// ---------- profil (persistat) ----------

export interface IntrareCaiet {
  cuvant: string; // forma pe care ai intrebat-o
  categorie?: string;
  text: string;
  sursa: string;
  data: string;
  folosit?: boolean; // ai spus-o apoi intr-o partida
}

export const PRET_DEFINITIE = 3;

export interface Profil {
  nuci: number; // total strans, nu se pierde niciodata (da rangul)
  sold: number; // nucile din punga, se pot cheltui pe definitii
  caiet: Record<string, IntrareCaiet>; // lema -> definitia aflata
  insigne: Record<string, string>; // id -> data (YYYY-MM-DD)
  cuvinte: number;
  inchideri: number;
  partide: number;
  victorii: number;
  victoriiPeLoc: Record<string, number>;
  zile: { ultima: string | null; serie: number; bonusDat: string | null };
}

export const PROFIL_NOU: Profil = {
  nuci: 0,
  sold: 0,
  caiet: {},
  insigne: {},
  cuvinte: 0,
  inchideri: 0,
  partide: 0,
  victorii: 0,
  victoriiPeLoc: {},
  zile: { ultima: null, serie: 0, bonusDat: null },
};

// ---------- partida curenta ----------

export interface Linie {
  motiv: string;
  nuci: number;
}

export interface Partida {
  cuvinte: number;
  serie: number; // cuvinte la rand fara sa primesti litera
  serieMax: number;
  inchideri: number;
  rapide: number;
  maxLungime: number;
  rare: number;
  nuci: number;
  linii: Linie[]; // cumulate pe motiv, pentru rezumatul de final
}

export const PARTIDA_NOUA: Partida = {
  cuvinte: 0,
  serie: 0,
  serieMax: 0,
  inchideri: 0,
  rapide: 0,
  maxLungime: 0,
  rare: 0,
  nuci: 0,
  linii: [],
};

export const PRAG_RAR = 0.85;
export const SECUNDE_RAPID = 3;

/** Nucile pentru un cuvant spus de tine. */
export function nuciPentruCuvant(p: { cuvant: string; raritate: number; secunde: number; inchide: boolean; serie: number }): Linie[] {
  const linii: Linie[] = [{ motiv: 'Cuvinte spuse', nuci: 1 }];
  // +1 la 9 litere, +2 la 11, +3 de la 13 in sus
  const lung = Math.min(3, Math.max(0, Math.floor((p.cuvant.length - 7) / 2)));
  if (lung > 0) linii.push({ motiv: 'Cuvinte lungi', nuci: lung });
  if (p.raritate >= PRAG_RAR) linii.push({ motiv: 'Cuvinte rare', nuci: 3 });
  if (p.secunde < SECUNDE_RAPID) linii.push({ motiv: 'Răspunsuri iuți', nuci: 2 });
  if (p.inchide) linii.push({ motiv: 'Închideri', nuci: 5 });
  if (p.serie > 0 && p.serie % 5 === 0) linii.push({ motiv: 'Serii de 5 cuvinte', nuci: 5 });
  return linii;
}

export const PREMIU_LOC: Record<string, number> = { banca: 20, covor: 40, nuc: 80 };

export function nuciPentruVictorie(loc: Loc, penalizari: number, serieZile: number, bonusAziDat: boolean): Linie[] {
  const linii: Linie[] = [{ motiv: `Premiul de la ${loc.nume.toLowerCase()}`, nuci: PREMIU_LOC[loc.id] ?? 20 }];
  if (penalizari === 0) linii.push({ motiv: 'Fără nicio literă', nuci: 20 });
  if (!bonusAziDat) linii.push({ motiv: `Prima victorie de azi (${serieZile} ${serieZile === 1 ? 'zi' : 'zile'} la rând)`, nuci: 10 * Math.min(5, serieZile) });
  return linii;
}

export function adunaLinii(existente: Linie[], noi: Linie[]): Linie[] {
  const rez = existente.map((l) => ({ ...l }));
  for (const n of noi) {
    const l = rez.find((x) => x.motiv === n.motiv);
    if (l) l.nuci += n.nuci;
    else rez.push({ ...n });
  }
  return rez;
}

export const totalLinii = (linii: Linie[]) => linii.reduce((s, l) => s + l.nuci, 0);

// ---------- zile la rand ----------

export const ziua = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function actualizeazaZile(z: Profil['zile'], azi: string): Profil['zile'] {
  if (z.ultima === azi) return z;
  const ieri = ziua(new Date(new Date(`${azi}T12:00:00`).getTime() - 86_400_000));
  return { ...z, ultima: azi, serie: z.ultima === ieri ? z.serie + 1 : 1 };
}

// ---------- insigne ----------

export interface ContextInsigne {
  profil: Profil;
  partida: Partida;
  loc: Loc | null;
  victorie?: { penalizari: number };
}

export interface Insigna {
  id: string;
  nume: string;
  descriere: string;
  nuci: number;
  castigata(c: ContextInsigne): boolean;
}

export const INSIGNE: Insigna[] = [
  { id: 'prima-vorba', nume: 'Prima vorbă', descriere: 'Spune primul cuvânt.', nuci: 5, castigata: (c) => c.profil.cuvinte >= 1 },
  { id: 'prima-victorie', nume: 'Prima partidă', descriere: 'Câștigă o partidă.', nuci: 15, castigata: (c) => c.profil.victorii >= 1 },
  { id: 'vorba-lunga', nume: 'Vorbă lungă', descriere: 'Spune un cuvânt de cel puțin 12 litere.', nuci: 15, castigata: (c) => c.partida.maxLungime >= 12 },
  { id: 'iute', nume: 'Iute de gură', descriere: 'Răspunde repede de 5 ori în aceeași partidă.', nuci: 15, castigata: (c) => c.partida.rapide >= 5 },
  { id: 'pe-val', nume: 'Pe val', descriere: 'Spune 10 cuvinte la rând fără să primești vreo literă.', nuci: 25, castigata: (c) => c.partida.serieMax >= 10 },
  { id: 'dictionar', nume: 'Cuvânt de dicționar', descriere: 'Spune un cuvânt rar.', nuci: 10, castigata: (c) => c.partida.rare >= 1 },
  { id: 'inchizator', nume: 'Închizătorul', descriere: 'Închide jocul de 10 ori.', nuci: 30, castigata: (c) => c.profil.inchideri >= 10 },
  { id: 'neatins', nume: 'Neatins', descriere: 'Câștigă o partidă fără nicio literă.', nuci: 30, castigata: (c) => c.victorie?.penalizari === 0 },
  { id: 'curios', nume: 'Curios', descriere: 'Află ce înseamnă 10 cuvinte.', nuci: 20, castigata: (c) => Object.keys(c.profil.caiet).length >= 10 },
  { id: 'invatat', nume: 'Vorbă învățată', descriere: 'Spune într-o partidă un cuvânt din caietul tău.', nuci: 15, castigata: (c) => Object.values(c.profil.caiet).some((i) => i.folosit) },
  { id: 'suta', nume: 'O sută de vorbe', descriere: 'Spune 100 de cuvinte în total.', nuci: 25, castigata: (c) => c.profil.cuvinte >= 100 },
  { id: 'obisnuit', nume: 'Obișnuit al uliței', descriere: 'Joacă 3 zile la rând.', nuci: 30, castigata: (c) => c.profil.zile.serie >= 3 },
  { id: 'tinda', nume: 'Gazda din tindă', descriere: 'Câștigă pe covorul din tindă.', nuci: 30, castigata: (c) => (c.profil.victoriiPeLoc.covor ?? 0) >= 1 },
  { id: 'nuc', nume: 'Stăpânul nucului', descriere: 'Câștigă la masa de sub nuc.', nuci: 60, castigata: (c) => (c.profil.victoriiPeLoc.nuc ?? 0) >= 1 },
];

/** Insignele castigate acum si necastigate inainte. */
export function insigneNoi(c: ContextInsigne): Insigna[] {
  return INSIGNE.filter((i) => !c.profil.insigne[i.id] && i.castigata(c));
}
