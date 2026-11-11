import { describe, expect, it } from 'vitest';
import { LOCURI } from '../src/locuri';
import {
  PARTIDA_NOUA,
  PROFIL_NOU,
  actualizeazaZile,
  adunaLinii,
  insigneNoi,
  nuciPentruCuvant,
  nuciPentruVictorie,
  rangDupaNuci,
  totalLinii,
} from '../src/recompense';

describe('nuci pe cuvant', () => {
  it('un cuvant obisnuit aduce 1 nuca', () => {
    expect(totalLinii(nuciPentruCuvant({ cuvant: 'casă', raritate: 0.1, secunde: 8, inchide: false, serie: 1 }))).toBe(1);
  });
  it('lung, rar, iute si inchidere se aduna', () => {
    const l = nuciPentruCuvant({ cuvant: 'anticonstituțional', raritate: 0.95, secunde: 1.5, inchide: true, serie: 5 });
    expect(l.map((x) => x.motiv)).toEqual(['Cuvinte spuse', 'Cuvinte lungi', 'Cuvinte rare', 'Răspunsuri iuți', 'Închideri', 'Serii de 5 cuvinte']);
    expect(totalLinii(l)).toBe(1 + 3 + 3 + 2 + 5 + 5);
  });
  it('liniile se cumuleaza pe motiv', () => {
    const a = adunaLinii([], [{ motiv: 'Cuvinte spuse', nuci: 1 }]);
    expect(adunaLinii(a, [{ motiv: 'Cuvinte spuse', nuci: 1 }])).toEqual([{ motiv: 'Cuvinte spuse', nuci: 2 }]);
  });
});

describe('victorie si zile', () => {
  const banca = LOCURI[0];
  it('premiul locului, bonus fara litere si bonusul zilei', () => {
    expect(totalLinii(nuciPentruVictorie(banca, 0, 3, false))).toBe(20 + 20 + 30);
    expect(totalLinii(nuciPentruVictorie(banca, 2, 3, true))).toBe(20);
  });
  it('bonusul zilei are plafon la 5 zile', () => {
    expect(totalLinii(nuciPentruVictorie(banca, 1, 12, false))).toBe(20 + 50);
  });
  it('seria de zile creste doar pe zile consecutive', () => {
    let z = actualizeazaZile(PROFIL_NOU.zile, '2026-09-20');
    expect(z.serie).toBe(1);
    z = actualizeazaZile(z, '2026-09-21');
    expect(z.serie).toBe(2);
    expect(actualizeazaZile(z, '2026-09-21')).toBe(z);
    expect(actualizeazaZile(z, '2026-09-24').serie).toBe(1);
  });
});

describe('ranguri si insigne', () => {
  it('rangul si progresul', () => {
    expect(rangDupaNuci(0).rang.nume).toBe('Ucenic');
    const r = rangDupaNuci(225);
    expect(r.rang.nume).toBe('Vorbăreț');
    expect(r.urmator?.nume).toBe('Iscusit');
    expect(r.progres).toBeCloseTo(0.25);
    expect(rangDupaNuci(99999).urmator).toBeNull();
  });
  it('locurile se deschid pe rand', () => {
    expect(LOCURI.map((l) => l.rangNecesar)).toEqual([0, 1, 2]);
  });
  it('insignele se dau o singura data', () => {
    const profil = { ...PROFIL_NOU, cuvinte: 1 };
    const partida = { ...PARTIDA_NOUA, maxLungime: 13 };
    const noi = insigneNoi({ profil, partida, loc: null });
    expect(noi.map((i) => i.id)).toEqual(['prima-vorba', 'vorba-lunga']);
    const dupa = { ...profil, insigne: { 'prima-vorba': '2026-09-24', 'vorba-lunga': '2026-09-24' } };
    expect(insigneNoi({ profil: dupa, partida, loc: null })).toEqual([]);
  });
  it('Neatins doar la victorie fara litere', () => {
    const c = { profil: PROFIL_NOU, partida: PARTIDA_NOUA, loc: null };
    expect(insigneNoi({ ...c, victorie: { penalizari: 0 } }).map((i) => i.id)).toContain('neatins');
    expect(insigneNoi({ ...c, victorie: { penalizari: 1 } }).map((i) => i.id)).not.toContain('neatins');
  });
});
