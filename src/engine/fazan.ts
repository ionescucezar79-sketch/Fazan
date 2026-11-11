import type { Dictionar } from './dictionar';
import { CARACTERE_VALIDE, curata, normalizeaza, terminatie as terminatieDe } from './normalizare';

// Motor pur: nu stie nimic de React, Firebase sau ceas. Timpul vine ca parametru (`acum`, ms),
// deci acelasi cod ruleaza identic in browser, in teste si in Cloud Function.

export const CUVANT_FAZAN = 'FAZAN';
export const PENALIZARI_MAXIME = CUVANT_FAZAN.length;

export interface Setari {
  secundePeTura: number; // 0 = fara timer
  lungimeMinima: number;
  /** Regula clasica: primul cuvant dintr-o runda nu are voie sa inchida. */
  interzisInchidereLaInceputDeRunda: boolean;
}

export const SETARI_IMPLICITE: Setari = {
  secundePeTura: 20,
  lungimeMinima: 3,
  interzisInchidereLaInceputDeRunda: true,
};

export interface Jucator {
  id: string;
  nume: string;
  penalizari: number;
  eliminat: boolean;
}

export type TipMutare = 'cuvant' | 'inchidere' | 'renunta' | 'timeout';

export interface Mutare {
  jucatorId: string;
  tip: TipMutare;
  cuvant?: string;
  penalizatId?: string;
  la: number;
}

export interface StareJoc {
  jucatori: Jucator[];
  randul: number; // indexul jucatorului care trebuie sa spuna un cuvant
  cuvantCurent: string | null;
  /** Terminatia ceruta (fara diacritice). null = runda noua, orice cuvant e permis. */
  terminatie: string | null;
  folosite: string[]; // forme canonice, pe tot meciul
  status: 'in_desfasurare' | 'terminat';
  castigatorId: string | null;
  termenLimita: number | null; // ms; null daca nu exista timer
  istoric: Mutare[];
  setari: Setari;
}

export type CodEroare =
  | 'joc_terminat'
  | 'nu_e_randul'
  | 'timp_expirat'
  | 'caractere_invalide'
  | 'prea_scurt'
  | 'prefix_gresit'
  | 'nu_exista'
  | 'deja_folosit'
  | 'inchidere_interzisa';

export const MESAJE_EROARE: Record<CodEroare, string> = {
  joc_terminat: 'Jocul s-a terminat.',
  nu_e_randul: 'Nu e rândul tău.',
  timp_expirat: 'Timpul a expirat.',
  caractere_invalide: 'Folosește doar litere.',
  prea_scurt: 'Cuvântul e prea scurt.',
  prefix_gresit: 'Cuvântul trebuie să înceapă cu literele cerute.',
  nu_exista: 'Cuvântul nu e în dicționar.',
  deja_folosit: 'Cuvântul a mai fost folosit.',
  inchidere_interzisa: 'Nu ai voie să închizi la începutul rundei.',
};

export type Eveniment =
  | { tip: 'cuvant_acceptat'; cuvant: string }
  | { tip: 'penalizare'; motiv: 'inchidere' | 'renunta' | 'timeout'; penalizatId: string; cuvant?: string; eliminat: boolean; castigatorId: string | null };

export type Rezultat =
  | { ok: true; stare: StareJoc; eveniment: Eveniment }
  | { ok: false; eroare: CodEroare; stare: StareJoc };

// ---------- utilitare ----------

export const literePrimite = (j: Jucator): string => CUVANT_FAZAN.slice(0, j.penalizari);

export const jucatorCurent = (s: StareJoc): Jucator => s.jucatori[s.randul];

export const esteInceputDeRunda = (s: StareJoc): boolean => s.terminatie === null;

function urmatorulActiv(s: StareJoc, de: number): number {
  const n = s.jucatori.length;
  for (let pas = 1; pas <= n; pas++) {
    const i = (de + pas) % n;
    if (!s.jucatori[i].eliminat) return i;
  }
  return de;
}

function pornesteTimer(s: StareJoc, acum: number): void {
  s.termenLimita = s.setari.secundePeTura > 0 ? acum + s.setari.secundePeTura * 1000 : null;
}

// ---------- API ----------

export function startJoc(
  jucatori: { id: string; nume: string }[],
  acum: number,
  setari: Partial<Setari> = {},
  cineIncepe = 0,
): StareJoc {
  if (jucatori.length < 2) throw new Error('Fazanul se joacă cu cel puțin 2 jucători.');
  if (new Set(jucatori.map((j) => j.id)).size !== jucatori.length) throw new Error('ID-uri de jucător duplicate.');
  const stare: StareJoc = {
    jucatori: jucatori.map((j) => ({ ...j, penalizari: 0, eliminat: false })),
    randul: cineIncepe % jucatori.length,
    cuvantCurent: null,
    terminatie: null,
    folosite: [],
    status: 'in_desfasurare',
    castigatorId: null,
    termenLimita: null,
    istoric: [],
    setari: { ...SETARI_IMPLICITE, ...setari },
  };
  pornesteTimer(stare, acum);
  return stare;
}

/** Validare fara modificarea starii. Returneaza forma canonica sau codul de eroare. */
export function valideaza(
  s: StareJoc,
  jucatorId: string,
  input: string,
  dict: Dictionar,
  acum: number,
): { ok: true; cuvant: string; inchide: boolean } | { ok: false; eroare: CodEroare } {
  if (s.status === 'terminat') return { ok: false, eroare: 'joc_terminat' };
  if (jucatorCurent(s).id !== jucatorId) return { ok: false, eroare: 'nu_e_randul' };
  if (s.termenLimita !== null && acum > s.termenLimita) return { ok: false, eroare: 'timp_expirat' };

  const c = curata(input);
  if (!CARACTERE_VALIDE.test(c)) return { ok: false, eroare: 'caractere_invalide' };
  if (c.length < s.setari.lungimeMinima) return { ok: false, eroare: 'prea_scurt' };
  if (s.terminatie !== null && !normalizeaza(c).startsWith(s.terminatie)) return { ok: false, eroare: 'prefix_gresit' };

  const candidati = dict.potriviri(c);
  if (candidati.length === 0) return { ok: false, eroare: 'nu_exista' };
  const folosite = new Set(s.folosite);
  const cuvant = candidati.find((x) => !folosite.has(x));
  if (!cuvant) return { ok: false, eroare: 'deja_folosit' };

  const inchide = dict.continuari(terminatieDe(cuvant)) === 0;
  if (inchide && esteInceputDeRunda(s) && s.setari.interzisInchidereLaInceputDeRunda) {
    return { ok: false, eroare: 'inchidere_interzisa' };
  }
  return { ok: true, cuvant, inchide };
}

export function aplicaMutare(
  stare: StareJoc,
  jucatorId: string,
  input: string,
  dict: Dictionar,
  acum: number,
): Rezultat {
  const v = valideaza(stare, jucatorId, input, dict, acum);
  if (!v.ok) return { ok: false, eroare: v.eroare, stare };

  const s = structuredClone(stare);
  s.folosite.push(v.cuvant);
  s.cuvantCurent = v.cuvant;

  if (v.inchide) {
    // Nimeni nu poate continua: urmatorul jucator ia automat o litera.
    s.istoric.push({ jucatorId, tip: 'inchidere', cuvant: v.cuvant, la: acum });
    const penalizat = urmatorulActiv(s, s.randul);
    return penalizeaza(s, penalizat, 'inchidere', acum, v.cuvant);
  }

  s.istoric.push({ jucatorId, tip: 'cuvant', cuvant: v.cuvant, la: acum });
  s.terminatie = terminatieDe(v.cuvant);
  s.randul = urmatorulActiv(s, s.randul);
  pornesteTimer(s, acum);
  return { ok: true, stare: s, eveniment: { tip: 'cuvant_acceptat', cuvant: v.cuvant } };
}

/** Jucatorul curent renunta la tura si ia o litera. */
export function renunta(stare: StareJoc, jucatorId: string, acum: number): Rezultat {
  if (stare.status === 'terminat') return { ok: false, eroare: 'joc_terminat', stare };
  if (jucatorCurent(stare).id !== jucatorId) return { ok: false, eroare: 'nu_e_randul', stare };
  const s = structuredClone(stare);
  s.istoric.push({ jucatorId, tip: 'renunta', la: acum });
  return penalizeaza(s, s.randul, 'renunta', acum);
}

/**
 * Apelat de oricine (client, bot, Cloud Function) cand timpul pare expirat.
 * Verifica singur ora, deci un apel prematur nu are efect.
 */
export function timpExpirat(stare: StareJoc, acum: number): Rezultat | null {
  if (stare.status === 'terminat' || stare.termenLimita === null || acum <= stare.termenLimita) return null;
  const s = structuredClone(stare);
  s.istoric.push({ jucatorId: jucatorCurent(s).id, tip: 'timeout', la: acum });
  return penalizeaza(s, s.randul, 'timeout', acum);
}

function penalizeaza(
  s: StareJoc,
  index: number,
  motiv: 'inchidere' | 'renunta' | 'timeout',
  acum: number,
  cuvant?: string,
): Rezultat {
  const j = s.jucatori[index];
  j.penalizari += 1;
  const ultim = s.istoric[s.istoric.length - 1];
  if (ultim) ultim.penalizatId = j.id;
  if (j.penalizari >= PENALIZARI_MAXIME) j.eliminat = true;

  // Runda noua: incepe cel penalizat (daca mai e in joc), altfel urmatorul.
  s.terminatie = null;
  s.cuvantCurent = null;
  const activi = s.jucatori.filter((x) => !x.eliminat);
  if (activi.length <= 1) {
    s.status = 'terminat';
    s.castigatorId = activi[0]?.id ?? null;
    s.termenLimita = null;
  } else {
    s.randul = j.eliminat ? urmatorulActiv(s, index) : index;
    pornesteTimer(s, acum);
  }
  return {
    ok: true,
    stare: s,
    eveniment: { tip: 'penalizare', motiv, penalizatId: j.id, cuvant, eliminat: j.eliminat, castigatorId: s.castigatorId },
  };
}
