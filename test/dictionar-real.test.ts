import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DictionarPeFisiere, aplicaMutare, alegeCuvant, prefix, renunta, startJoc } from '../src/engine';

// Ruleaza doar daca exista fisierele generate in public/dict.
const DIR = new URL('../public/dict/', import.meta.url);
const areDict = existsSync(new URL('index-v2.json', DIR));

describe.runIf(areDict)('dictionarul real (public/dict)', () => {
  const dict = new DictionarPeFisiere(async (f) => JSON.parse(await readFile(new URL(f, DIR), 'utf8')));

  it('terminatiile clasice inchid', async () => {
    const idx = await dict.init();
    for (const t of ['nt', 'ng', 'nd', 'mb', 'rt']) expect(idx.inchid).toContain(t);
  });

  it('indexul numara prefixele cu diacritice separat', async () => {
    const idx = await dict.init();
    for (const p of ['sa', 'să', 'șa', 'ta', 'tă', 'ța', 'ță', 'în', 'in']) expect(idx.continuari[p]).toBeGreaterThan(0);
    expect(idx.inchid).toContain('ăm'); // „lucrăm” nu are continuare
    expect(idx.inchid).not.toContain('am');
  });

  it('cuvinteCuPrefix respecta diacriticele', async () => {
    await dict.pregateste('șa');
    const sa = dict.cuvinteCuPrefix('sa');
    const șa = dict.cuvinteCuPrefix('șa');
    const să = dict.cuvinteCuPrefix('să');
    expect(sa.length).toBeGreaterThan(0);
    expect(sa.every((c) => c.startsWith('sa'))).toBe(true);
    expect(șa.every((c) => c.startsWith('șa'))).toBe(true);
    expect(să.every((c) => c.startsWith('să'))).toBe(true);
  });

  it('valideaza cuvinte reale, inclusiv fara diacritice', async () => {
    await dict.pregateste('fa');
    await dict.pregateste('st');
    expect(dict.potriviri('fazanului')).toContain('fazanului');
    expect(dict.potriviri('stiinta')).toContain('știință');
    expect(dict.potriviri('fazanxyz')).toEqual([]);
  });

  it('botul joaca 20 de meciuri reale fara mutari invalide', async () => {
    for (let m = 0; m < 20; m++) {
      let s = startJoc([{ id: 'a', nume: 'A' }, { id: 'b', nume: 'B' }], 0);
      for (let pas = 0; pas < 400 && s.status !== 'terminat'; pas++) {
        const id = s.jucatori[s.randul].id;
        const c = await alegeCuvant(s, dict, pas % 2 ? 'greu' : 'usor');
        if (c) await dict.pregateste(prefix(c)); // la fel ca in UI, inainte de fiecare mutare
        const t = s.terminatie;
        const r = c ? aplicaMutare(s, id, c, dict, 0) : renunta(s, id, 0);
        if (!r.ok) throw new Error(`${c} -> ${r.eroare}`);
        if (c && t && r.eveniment.tip === 'cuvant_acceptat') expect(c.startsWith(t)).toBe(true);
        s = r.stare;
      }
      expect(s.status).toBe('terminat');
    }
  }, 30_000);
});
