import type { Dictionar } from './dictionar';
import { esteInceputDeRunda, type StareJoc } from './fazan';
import { terminatie as terminatieDe } from './normalizare';

export type Nivel = 'usor' | 'mediu' | 'greu';

interface ProfilNivel {
  sansaRatare: number; // probabilitatea ca botul sa "nu gaseasca" un cuvant
  procentTop: number; // din ce parte a listei (dupa frecventa) alege cuvinte obisnuite
  sansaInchidere: number; // cat de des inchide cand poate
}

const PROFILE: Record<Nivel, ProfilNivel> = {
  usor: { sansaRatare: 0.08, procentTop: 0.05, sansaInchidere: 0.1 },
  mediu: { sansaRatare: 0.03, procentTop: 0.3, sansaInchidere: 0.35 },
  greu: { sansaRatare: 0, procentTop: 1, sansaInchidere: 1 },
};

const alege = <T>(lista: readonly T[], rng: () => number): T => lista[Math.floor(rng() * lista.length)];

/**
 * Alege cuvantul botului. Returneaza null daca botul renunta (apelantul face `renunta`).
 * Cuvantul returnat trebuie trimis tot prin `aplicaMutare`, ca orice jucator.
 */
export async function alegeCuvant(
  stare: StareJoc,
  dict: Dictionar,
  nivel: Nivel = 'mediu',
  rng: () => number = Math.random,
): Promise<string | null> {
  const profil = PROFILE[nivel];
  const inceput = esteInceputDeRunda(stare);
  const poateInchide = !inceput || !stare.setari.interzisInchidereLaInceputDeRunda;

  // La inceput de runda, botul alege un prefix "bogat", ca sa para natural.
  const prefix = stare.terminatie ?? alege(dict.prefixe().slice(0, 40), rng);
  await dict.pregateste(prefix);

  if (!inceput && rng() < profil.sansaRatare) return null;

  const folosite = new Set(stare.folosite);
  const min = stare.setari.lungimeMinima;
  const disponibile = dict.cuvinteCuPrefix(prefix).filter((c) => c.length >= min && !folosite.has(c));

  const inchizatoare: string[] = [];
  const normale: string[] = [];
  for (const c of disponibile) (dict.continuari(terminatieDe(c)) === 0 ? inchizatoare : normale).push(c);

  if (poateInchide && inchizatoare.length > 0 && rng() < profil.sansaInchidere) {
    return inchizatoare[0]; // cel mai frecvent cuvant care inchide
  }

  if (normale.length === 0) return poateInchide && inchizatoare.length > 0 ? inchizatoare[0] : null;

  if (nivel === 'greu') {
    // Lasa adversarului cat mai putine variante.
    const sortate = [...normale].sort((a, b) => dict.continuari(terminatieDe(a)) - dict.continuari(terminatieDe(b)));
    return alege(sortate.slice(0, 5), rng);
  }

  const top = normale.slice(0, Math.max(30, Math.ceil(normale.length * profil.procentTop)));
  return alege(top, rng);
}
