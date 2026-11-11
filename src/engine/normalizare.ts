// Normalizare comuna pentru client, bot si Cloud Function.

const FARA_DIACRITICE: Record<string, string> = {
  ă: 'a', â: 'a', î: 'i', ș: 's', ț: 't', ş: 's', ţ: 't',
};

/** Curata ce a tastat jucatorul: spatii, majuscule, sedila (ş ţ) -> virgula (ș ț). */
export function curata(input: string): string {
  return input.trim().toLowerCase().replace(/ş/g, 'ș').replace(/ţ/g, 'ț');
}

/** Forma fara diacritice: doar pentru a recunoaste ce s-a tastat si pentru numele fisierelor. */
export function normalizeaza(s: string): string {
  return curata(s).replace(/[ăâîșțşţ]/g, (c) => FARA_DIACRITICE[c] ?? c);
}

/**
 * Cheia fisierului de dictionar (primele 2 litere, fara diacritice): „sa”, „să”, „șa” stau in acelasi fisier.
 * NU se foloseste pentru reguli.
 */
export const prefix = (cuvant: string): string => normalizeaza(cuvant).slice(0, 2);

// Regulile respecta alfabetul romanesc: ă, â, î, ș, ț sunt litere separate (a ≠ ă ≠ â, s ≠ ș, t ≠ ț).
/** Primele doua litere, exact cum sunt scrise (cu diacritice). */
export const inceput = (cuvant: string): string => curata(cuvant).slice(0, 2);
/** Ultimele doua litere, exact cum sunt scrise (cu diacritice). Urmatorul cuvant trebuie sa inceapa asa. */
export const terminatie = (cuvant: string): string => curata(cuvant).slice(-2);

/**
 * Se potriveste ce a tastat jucatorul cu forma din dictionar? O litera fara diacritic poate tine locul
 * variantei cu diacritic (telefoane fara tastatura romaneasca), dar o diacritica tastata trebuie respectata.
 */
export function compatibil(tastat: string, canonic: string): boolean {
  const t = curata(tastat);
  if (t.length !== canonic.length) return false;
  for (let i = 0; i < t.length; i++) {
    const a = t[i];
    const b = canonic[i];
    if (a !== b && a !== (FARA_DIACRITICE[b] ?? b)) return false;
  }
  return true;
}

export const CARACTERE_VALIDE = /^[a-zăâîșț]+$/;
