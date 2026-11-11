import { describe, expect, it } from 'vitest';
import {
  DictionarInMemorie,
  aplicaMutare,
  alegeCuvant,
  literePrimite,
  renunta,
  startJoc,
  timpExpirat,
  type StareJoc,
} from '../src/engine';

// Mini-dictionar, ordonat "dupa frecventa". Terminatii care inchid: -mp (anotimp), -ld (cald), -al (țambal).
// Fiecare terminatie cu diacritice are continuare: ră, să, ță, tă, că, ța.
const dict = new DictionarInMemorie([
  'fazan', 'fată', 'fața', 'anotimp', 'ancoră', 'rață', 'tată', 'ursă',
  'șarpe', 'pepene', 'nemțoaică', 'cald', 'casă',
  'răzeșan', 'sătean', 'țăran', 'tărtăcuță', 'căpitan', 'țambal',
]);

const T0 = 1_000_000;
const doi = () => startJoc([{ id: 'ana', nume: 'Ana' }, { id: 'bob', nume: 'Bob' }], T0);

function joaca(s: StareJoc, id: string, cuvant: string, acum = T0) {
  const r = aplicaMutare(s, id, cuvant, dict, acum);
  if (!r.ok) throw new Error(`mutare respinsa: ${cuvant} -> ${r.eroare}`);
  return r.stare;
}

describe('dictionar', () => {
  it('detecteaza terminatiile care inchid', () => {
    expect(dict.inchideri()).toEqual(['al', 'ld', 'mp']);
  });
  it('accepta cuvinte tastate fara diacritice sau cu sedila', () => {
    expect(dict.potriviri('sarpe')).toEqual(['șarpe']);
    expect(dict.potriviri('şarpe')).toEqual(['șarpe']);
    expect(dict.potriviri('fata')).toEqual(['fată', 'fața']); // fara diacritice: toate variantele
    expect(dict.potriviri('fața')).toEqual(['fața']); // diacritica tastata se respecta
    expect(dict.potriviri('fătă')).toEqual([]);
  });
});

describe('alfabetul romanesc: diacriticele conteaza in reguli', () => {
  // casă -> „să”; rață -> „ță”; fată -> „tă”; tată -> „tă”
  const d = new DictionarInMemorie([
    'casă', 'sare', 'sămânță', 'șarpe', 'țară', 'tată', 'tăcere', 'rață', 'fată', 'român', 'lucrăm', 'amar', 'pește',
    'țăran', 'răsărit',
  ]);
  const start = () => startJoc([{ id: 'ana', nume: 'Ana' }, { id: 'bob', nume: 'Bob' }], T0);
  const muta = (s: StareJoc, id: string, c: string) => aplicaMutare(s, id, c, d, T0);
  const dupa = (cuv: string) => {
    const r = muta(start(), 'ana', cuv);
    if (!r.ok) throw new Error(r.eroare);
    return r.stare;
  };

  it('terminatia se pastreaza cu diacritice', () => {
    expect(dupa('casă').terminatie).toBe('să');
    expect(dupa('rață').terminatie).toBe('ță');
  });

  it('dupa „casă” se cere „să”, nu „sa” sau „șa”', () => {
    const s = dupa('casă');
    const err = (c: string) => {
      const r = muta(s, 'bob', c);
      return r.ok ? (r.eveniment.tip === 'cuvant_acceptat' ? r.eveniment.cuvant : 'ok') : r.eroare;
    };
    expect(err('sare')).toBe('prefix_gresit');
    expect(err('șarpe')).toBe('prefix_gresit');
    expect(err('sarpe')).toBe('prefix_gresit');
    expect(err('sămânță')).toBe('sămânță');
    expect(err('samanta')).toBe('sămânță'); // tastat fara diacritice, recunoscut corect
  });

  it('dupa „rață” se cere „ță”: „tată” si „tăcere” sunt respinse', () => {
    const s = dupa('rață');
    expect(muta(s, 'bob', 'tată').ok).toBe(false);
    expect(muta(s, 'bob', 'tacere').ok).toBe(false);
    expect(muta(s, 'bob', 'țară').ok).toBe(false); // „ța” nu e „ță”
    const r = muta(s, 'bob', 'taran'); // fara diacritice -> „țăran”
    expect(r.ok && r.stare.folosite.at(-1)).toBe('țăran');
  });

  it('o terminatie cu diacritic fara continuare inchide („lucrăm” -> „ăm”), chiar daca exista „am...”', () => {
    expect(d.continuari('ăm')).toBe(0);
    expect(d.continuari('am')).toBe(1);
    const s = dupa('fată'); // -> „tă”
    const r = muta(s, 'bob', 'tăcere'); // -> „re”
    expect(r.ok).toBe(true);
    expect(d.inchideri()).toContain('ăm');
    expect(d.inchideri()).toContain('ân');
  });
});

describe('mutari', () => {
  it('primul cuvant e liber, apoi se cer ultimele doua litere', () => {
    const s = joaca(doi(), 'ana', 'fazan');
    expect(s.terminatie).toBe('an');
    expect(s.randul).toBe(1);
    expect(s.termenLimita).toBe(T0 + 20_000);
  });

  it('respinge prefix gresit, cuvinte inexistente, scurte si cuvinte folosite', () => {
    const s = joaca(doi(), 'ana', 'fazan');
    const err = (id: string, c: string, st = s) => {
      const r = aplicaMutare(st, id, c, dict, T0);
      return r.ok ? 'ok' : r.eroare;
    };
    expect(err('bob', 'rață')).toBe('prefix_gresit');
    expect(err('bob', 'anxyz')).toBe('nu_exista');
    expect(err('bob', 'an')).toBe('prea_scurt');
    expect(err('bob', 'an-3')).toBe('caractere_invalide');
    expect(err('ana', 'ancoră')).toBe('nu_e_randul');

    let t = joaca(s, 'bob', 'ancoră'); // -> „ră”
    expect(err('ana', 'rață', t)).toBe('prefix_gresit'); // „ra” nu e „ră”
    t = joaca(t, 'ana', 'răzeșan'); // -> „an”
    expect(err('bob', 'ancoră', t)).toBe('deja_folosit');
  });

  it('o mutare respinsa nu modifica starea', () => {
    const s = doi();
    const r = aplicaMutare(s, 'ana', 'nuexista', dict, T0);
    expect(r.ok).toBe(false);
    expect(r.stare).toBe(s);
  });

  it('forma fara diacritice alege varianta nefolosita', () => {
    const s = { ...doi(), folosite: ['fată'] };
    const r = aplicaMutare(s, 'ana', 'fata', dict, T0);
    expect(r.ok && r.eveniment).toEqual({ tip: 'cuvant_acceptat', cuvant: 'fața' });
  });
});

describe('inchidere si penalizari', () => {
  it('nu ai voie sa inchizi la inceput de runda', () => {
    const r = aplicaMutare(doi(), 'ana', 'anotimp', dict, T0);
    expect(r.ok ? 'ok' : r.eroare).toBe('inchidere_interzisa');
  });

  it('regula se poate dezactiva din setari', () => {
    const s = startJoc([{ id: 'ana', nume: 'Ana' }, { id: 'bob', nume: 'Bob' }], T0, {
      interzisInchidereLaInceputDeRunda: false,
    });
    expect(aplicaMutare(s, 'ana', 'anotimp', dict, T0).ok).toBe(true);
  });

  it('cine inchide da litera urmatorului, care incepe runda noua', () => {
    let s = joaca(doi(), 'ana', 'fazan');
    const r = aplicaMutare(s, 'bob', 'anotimp', dict, T0 + 5000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.stare;
    expect(r.eveniment).toMatchObject({ tip: 'penalizare', motiv: 'inchidere', penalizatId: 'ana' });
    expect(literePrimite(s.jucatori[0])).toBe('F');
    expect(s.terminatie).toBeNull();
    expect(s.randul).toBe(0);
    expect(s.istoric.at(-1)).toMatchObject({ tip: 'inchidere', jucatorId: 'bob', penalizatId: 'ana' });
  });

  it('renunta da o litera celui care renunta', () => {
    const s = joaca(doi(), 'ana', 'fazan');
    const r = renunta(s, 'bob', T0);
    expect(r.ok && r.stare.jucatori[1].penalizari).toBe(1);
    expect(r.ok && r.stare.randul).toBe(1);
    expect(renunta(s, 'ana', T0).ok).toBe(false);
  });

  it('timeout: mutarea dupa termen e respinsa, iar timpExpirat penalizeaza', () => {
    const s = joaca(doi(), 'ana', 'fazan');
    const tarziu = s.termenLimita! + 1;
    const r = aplicaMutare(s, 'bob', 'ancoră', dict, tarziu);
    expect(r.ok ? 'ok' : r.eroare).toBe('timp_expirat');
    expect(timpExpirat(s, s.termenLimita!)).toBeNull(); // inca nu a expirat
    const t = timpExpirat(s, tarziu);
    expect(t?.ok && t.eveniment).toMatchObject({ motiv: 'timeout', penalizatId: 'bob' });
  });

  it('la FAZAN jucatorul e eliminat si celalalt castiga', () => {
    let s = doi();
    for (let i = 0; i < 5; i++) {
      const r = renunta(s, 'ana', T0);
      if (!r.ok) throw new Error(r.eroare);
      s = r.stare;
    }
    expect(literePrimite(s.jucatori[0])).toBe('FAZAN');
    expect(s.status).toBe('terminat');
    expect(s.castigatorId).toBe('bob');
    expect(aplicaMutare(s, 'bob', 'fazan', dict, T0).ok).toBe(false);
  });

  it('cu 3 jucatori, eliminatul e sarit la rand', () => {
    let s = startJoc(
      [{ id: 'a', nume: 'A' }, { id: 'b', nume: 'B' }, { id: 'c', nume: 'C' }],
      T0,
    );
    s.jucatori[1].penalizari = 4;
    s.randul = 1;
    const r = renunta(s, 'b', T0);
    if (!r.ok) throw new Error(r.eroare);
    expect(r.stare.jucatori[1].eliminat).toBe(true);
    expect(r.stare.status).toBe('in_desfasurare');
    expect(r.stare.randul).toBe(2);
    const t = joaca(r.stare, 'c', 'fazan');
    expect(t.randul).toBe(0);
  });

  it('nu modifica starea primita (imutabil)', () => {
    const s = doi();
    const copie = structuredClone(s);
    joaca(s, 'ana', 'fazan');
    renunta(s, 'ana', T0);
    expect(s).toEqual(copie);
  });
});

describe('bot', () => {
  const rngFix = () => 0.5;

  it('botul greu inchide cand poate', async () => {
    const s = joaca(doi(), 'ana', 'fazan'); // bob trebuie "an..."
    expect(await alegeCuvant(s, dict, 'greu', rngFix)).toBe('anotimp');
  });

  it('botul nu inchide la inceput de runda si da doar cuvinte valide', async () => {
    for (let i = 0; i < 50; i++) {
      const s = doi();
      const c = await alegeCuvant(s, dict, 'greu', Math.random);
      if (c === null) continue;
      const r = aplicaMutare(s, 'ana', c, dict, T0);
      expect(r.ok).toBe(true);
    }
  });

  it('botul renunta cand nu mai are cuvinte', async () => {
    const s = { ...joaca(doi(), 'ana', 'fazan'), folosite: ['fazan', 'anotimp', 'ancoră'] };
    expect(await alegeCuvant(s, dict, 'greu', rngFix)).toBeNull();
  });

  it('un meci complet bot contra bot se termina corect', async () => {
    let s = doi();
    for (let pas = 0; pas < 500 && s.status !== 'terminat'; pas++) {
      const id = s.jucatori[s.randul].id;
      const c = await alegeCuvant(s, dict, 'mediu');
      const r = c ? aplicaMutare(s, id, c, dict, T0) : renunta(s, id, T0);
      if (!r.ok) throw new Error(`${c} -> ${r.eroare}`);
      s = r.stare;
    }
    expect(s.status).toBe('terminat');
    expect(s.castigatorId).not.toBeNull();
  });
});

describe('raritate', () => {
  it('primul cuvant din lista e frecvent, ultimul e rar', () => {
    const d = new DictionarInMemorie(['casă', 'cald', 'carte', 'cazma']);
    expect(d.raritate('casă')).toBe(0);
    expect(d.raritate('cazma')).toBe(1);
    expect(d.raritate('necunoscut')).toBe(0);
  });
});
