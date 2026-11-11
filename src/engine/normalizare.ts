// Normalizare comuna pentru client, bot si Cloud Function.

const FARA_DIACRITICE: Record<string, string> = {
  ă: 'a', â: 'a', î: 'i', ș: 's', ț: 't', ş: 's', ţ: 't',
};

/** Curata ce a tastat jucatorul: spatii, majuscule, sedila (ş ţ) -> virgula (ș ț). */
export function curata(input: string): string {
  return input.trim().toLowerCase().replace(/ş/g, 'ș').replace(/ţ/g, 'ț');
}

/** Forma fara diacritice, folosita pentru prefixe si terminatii. */
export function normalizeaza(s: string): string {
  return curata(s).replace(/[ăâîșțşţ]/g, (c) => FARA_DIACRITICE[c] ?? c);
}

export const prefix = (cuvant: string): string => normalizeaza(cuvant).slice(0, 2);
export const terminatie = (cuvant: string): string => normalizeaza(cuvant).slice(-2);

export const CARACTERE_VALIDE = /^[a-zăâîșț]+$/;
