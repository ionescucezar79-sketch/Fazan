import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DictionarPeFisiere, aplicaMutare, alegeCuvant, prefix, renunta, startJoc } from '../src/engine';

// Ruleaza doar daca exista fisierele generate in public/dict.
const DIR = new URL('../public/dict/', import.meta.url);
const areDict = existsSync(new URL('index.json', DIR));

describe.runIf(areDict)('dictionarul real (public/dict)', () => {
  const dict = new DictionarPeFisiere(async (f) => JSON.parse(await readFile(new URL(f, DIR), 'utf8')));

  it('terminatiile clasice inchid', async () => {
    const idx = await dict.init();
    for (const t of ['nt', 'ng', 'nd', 'mb', 'rt']) expect(idx.inchid).toContain(t);
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
        const r = c ? aplicaMutare(s, id, c, dict, 0) : renunta(s, id, 0);
        if (!r.ok) throw new Error(`${c} -> ${r.eroare}`);
        s = r.stare;
      }
      expect(s.status).toBe('terminat');
    }
  }, 30_000);
});
