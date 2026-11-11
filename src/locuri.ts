import type { Nivel } from './engine';

/** Un "loc" de pe uliță = o masă de poker: are suprafața lui, mizele lui (nivel, timp) și jucătorii lui. */
export interface Loc {
  id: string;
  nume: string;
  descriere: string;
  suprafata: 'banca' | 'covor' | 'nuc';
  nivel: Nivel;
  secundePeTura: number;
  boti: string[]; // cine stă deja acolo
  rangNecesar: number; // indexul din RANGURI de la care se deschide locul
}

export const LOCURI: Loc[] = [
  {
    id: 'banca',
    nume: 'Banca de la poartă',
    descriere: 'Se joacă în doi, fără grabă. Bun pentru început.',
    suprafata: 'banca',
    nivel: 'usor',
    secundePeTura: 30,
    boti: ['Nea Ion'],
    rangNecesar: 0,
  },
  {
    id: 'covor',
    nume: 'Covorul din tindă',
    descriere: 'Trei la joc. Închide din când în când.',
    suprafata: 'covor',
    nivel: 'mediu',
    secundePeTura: 20,
    boti: ['Tanti Florica', 'Mitică'],
    rangNecesar: 1,
  },
  {
    id: 'nuc',
    nume: 'Masa de sub nuc',
    descriere: 'Patru jucători care închid de câte ori pot.',
    suprafata: 'nuc',
    nivel: 'greu',
    secundePeTura: 15,
    boti: ['Popa Vasile', 'Domnu’ Profesor', 'Leana'],
    rangNecesar: 2,
  },
];

export const NUME_NIVEL: Record<Nivel, string> = { usor: 'Ușor', mediu: 'Mediu', greu: 'Greu' };
