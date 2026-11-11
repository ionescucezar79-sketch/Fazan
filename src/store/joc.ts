import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DictionarPeFisiere,
  MESAJE_EROARE,
  aplicaMutare,
  alegeCuvant,
  normalizeaza,
  prefix,
  renunta,
  startJoc,
  timpExpirat,
  type Eveniment,
  type Rezultat,
  type StareJoc,
} from '../engine';
import { LOCURI, type Loc } from '../locuri';
import { cautaDefinitii, type Definitie } from '../definitii';
import {
  PARTIDA_NOUA,
  PRET_DEFINITIE,
  PRAG_RAR,
  PROFIL_NOU,
  RANGURI,
  SECUNDE_RAPID,
  actualizeazaZile,
  adunaLinii,
  insigneNoi,
  nuciPentruCuvant,
  nuciPentruVictorie,
  rangDupaNuci,
  totalLinii,
  ziua,
  type Insigna,
  type Linie,
  type Partida,
  type Profil,
} from '../recompense';

export const EU = 'eu';
export const esteBot = (id: string) => id !== EU;

const BAZA = import.meta.env.BASE_URL;
export const dict = new DictionarPeFisiere(async (fisier) => {
  const r = await fetch(`${BAZA}dict/${fisier}`);
  if (!r.ok) throw new Error(`Nu am putut încărca ${fisier} (${r.status})`);
  return r.json();
});

export interface Mesaj {
  tip: 'info' | 'eroare' | 'penalizare';
  text: string;
  id: number;
}

export interface Anunt {
  id: number;
  tip: 'insigna' | 'rang';
  titlu: string;
  text: string;
}

export interface StareDefinitie {
  cuvant: string;
  faza: 'se_incarca' | 'intrebare' | 'gata' | 'lipsa' | 'fara_nuci' | 'eroare';
  rezultate: Definitie[];
  dinCaiet: boolean;
}

export interface Rezumat {
  linii: Linie[];
  total: number;
  insigne: Insigna[];
  rangInainte: number;
  rangDupa: number;
}

interface StareStore {
  dictionar: 'se_incarca' | 'gata' | 'eroare';
  offline: { status: 'nu' | 'se_descarca' | 'gata'; progres: number };
  nume: string;
  profil: Profil;
  partida: Partida;
  rezumat: Rezumat | null;
  recompensa: { nuci: number; id: number } | null; // "+N nuci" care zboara peste scaunul tau
  anunturi: Anunt[];
  definitie: StareDefinitie | null;
  loc: Loc | null;
  joc: StareJoc | null;
  gandeste: string | null; // id-ul botului care se gandeste
  seVerifica: boolean;
  mesaj: Mesaj | null;

  initializeaza(): Promise<void>;
  setNume(nume: string): void;
  staiJos(locId: string): void;
  inca(): void;
  ridicaTe(): void;
  trimite(text: string): Promise<boolean>;
  renuntEu(): void;
  tick(): void;
  descarcaOffline(): Promise<void>;
  inchideAnunt(id: number): void;
  deschideDefinitie(cuvant: string): Promise<void>;
  cumparaDefinitie(): void;
  inchideDefinitie(): void;
}

let idMesaj = 0;
let inceputTura = 0; // cand a inceput tura ta (pentru raspunsuri iuti)
let insigneInPartida: Insigna[] = [];
let rangLaStart = 0;
let generatie = 0; // invalideaza mutarile botilor dintr-un meci vechi
const msg = (tip: Mesaj['tip'], text: string): Mesaj => ({ tip, text, id: ++idMesaj });

function textEveniment(e: Eveniment, joc: StareJoc): Mesaj | null {
  if (e.tip !== 'penalizare') return null;
  const nume = (id: string) => joc.jucatori.find((j) => j.id === id)?.nume ?? '';
  const tu = e.penalizatId === EU;
  const cine = tu ? 'Primești' : `${nume(e.penalizatId)} primește`;
  let text: string;
  if (e.motiv === 'inchidere') {
    const aInchis = joc.istoric.at(-1)?.jucatorId ?? '';
    text = `${aInchis === EU ? 'Ai închis' : `${nume(aInchis)} a închis`} cu „${e.cuvant}”. ${cine} o literă.`;
  } else if (e.motiv === 'timeout') {
    text = tu ? 'Timpul a expirat. Primești o literă.' : `${nume(e.penalizatId)} n-a răspuns la timp și primește o literă.`;
  } else {
    text = tu ? 'Ai renunțat. Primești o literă.' : `${nume(e.penalizatId)} nu găsește nimic și primește o literă.`;
  }
  if (e.eliminat && !tu) text += ` ${nume(e.penalizatId)} a rămas fazan și se ridică.`;
  return msg('penalizare', text);
}

export const useJoc = create<StareStore>()(
  persist(
    (set, get) => {
      function aplica(r: Rezultat) {
        if (!r.ok) return;
        let joc = r.stare;
        const mesaj = textEveniment(r.eveniment, joc);
        const eu = joc.jucatori.find((j) => j.id === EU)!;
        // Daca ai iesit din joc, masa se incheie pentru tine (botii nu mai joaca intre ei).
        if (eu.eliminat && joc.status !== 'terminat') {
          joc = { ...joc, status: 'terminat', castigatorId: null, termenLimita: null };
        }
        const inainte = get().joc;
        set({ joc, ...(mesaj ? { mesaj } : {}) });
        if (r.eveniment.tip === 'penalizare' && r.eveniment.penalizatId === EU) {
          navigator.vibrate?.(120);
          set({ partida: { ...get().partida, serie: 0 } });
        }
        // Orice mutare aplicata care iti da randul porneste o tura noua pentru tine.
        if (joc.status !== 'terminat' && joc.jucatori[joc.randul].id === EU) inceputTura = Date.now();
        if (joc.status === 'terminat' && inainte?.status !== 'terminat') incheiePartida(joc);
        programeazaBot();
      }

      function acorda(linii: Linie[], zboara = true) {
        const nuci = totalLinii(linii);
        if (nuci <= 0) return;
        const { profil, partida } = get();
        const inainte = rangDupaNuci(profil.nuci).index;
        const nou = { ...profil, nuci: profil.nuci + nuci, sold: profil.sold + nuci };
        const dupa = rangDupaNuci(nou.nuci).index;
        set({
          profil: nou,
          partida: { ...partida, nuci: partida.nuci + nuci, linii: adunaLinii(partida.linii, linii) },
          ...(zboara ? { recompensa: { nuci, id: ++idMesaj } } : {}),
        });
        if (dupa > inainte) {
          const deschise = LOCURI.filter((l) => l.rangNecesar === dupa).map((l) => l.nume);
          anunta('rang', `Ai ajuns ${RANGURI[dupa].nume}`, deschise.length ? `S-a deschis ${deschise.join(', ')}.` : 'Ai urcat un rang.');
        }
      }

      function anunta(tip: Anunt['tip'], titlu: string, text: string) {
        set({ anunturi: [...get().anunturi, { id: ++idMesaj, tip, titlu, text }] });
      }

      function verificaInsigne(victorie?: { penalizari: number }) {
        const { profil, partida, loc } = get();
        const noi = insigneNoi({ profil, partida, loc, victorie });
        if (!noi.length) return;
        const azi = ziua();
        const insigne = { ...profil.insigne };
        for (const i of noi) insigne[i.id] = azi;
        set({ profil: { ...profil, insigne } });
        insigneInPartida = [...insigneInPartida, ...noi];
        for (const i of noi) anunta('insigna', `Insignă nouă: ${i.nume}`, `${i.descriere} +${i.nuci} nuci`);
        acorda(noi.map((i) => ({ motiv: 'Insigne', nuci: i.nuci })), false);
      }

      function recompenseazaCuvant(r: Rezultat, acum: number) {
        if (!r.ok) return;
        const e = r.eveniment;
        const cuvant = e.tip === 'cuvant_acceptat' ? e.cuvant : e.cuvant;
        if (!cuvant) return;
        const inchide = e.tip === 'penalizare';
        const raritate = dict.raritate(cuvant);
        const secunde = (acum - inceputTura) / 1000;
        const p = get().partida;
        const serie = p.serie + 1;
        set({
          partida: {
            ...p,
            cuvinte: p.cuvinte + 1,
            serie,
            serieMax: Math.max(p.serieMax, serie),
            inchideri: p.inchideri + (inchide ? 1 : 0),
            rapide: p.rapide + (secunde < SECUNDE_RAPID ? 1 : 0),
            maxLungime: Math.max(p.maxLungime, cuvant.length),
            rare: p.rare + (raritate >= PRAG_RAR ? 1 : 0),
          },
          profil: { ...get().profil, cuvinte: get().profil.cuvinte + 1, inchideri: get().profil.inchideri + (inchide ? 1 : 0) },
        });
        acorda(nuciPentruCuvant({ cuvant, raritate, secunde, inchide, serie }));
        verificaInsigne();
        verificaCuvantInvatat(cuvant);
      }

      /** Daca ai spus un cuvant din caiet, primesti un bonus (o singura data pe cuvant). */
      function verificaCuvantInvatat(cuvant: string) {
        if (Object.keys(get().profil.caiet).length === 0) return;
        const g = generatie;
        cautaDefinitii(cuvant)
          .then((defs) => {
            if (g !== generatie) return;
            const caiet = { ...get().profil.caiet };
            const noi = defs.filter((d) => caiet[d.lema] && !caiet[d.lema].folosit);
            if (!noi.length) return;
            for (const d of noi) caiet[d.lema] = { ...caiet[d.lema], folosit: true };
            set({ profil: { ...get().profil, caiet } });
            acorda([{ motiv: 'Cuvinte învățate', nuci: 2 * noi.length }]);
            verificaInsigne();
          })
          .catch(() => {});
      }

      function incheiePartida(joc: StareJoc) {
        const loc = get().loc;
        const azi = ziua();
        let profil = get().profil;
        const zile = actualizeazaZile(profil.zile, azi);
        const amCastigat = joc.castigatorId === EU;
        const eu = joc.jucatori.find((j) => j.id === EU)!;
        profil = {
          ...profil,
          zile: amCastigat ? { ...zile, bonusDat: azi } : zile,
          partide: profil.partide + 1,
          victorii: profil.victorii + (amCastigat ? 1 : 0),
          victoriiPeLoc: amCastigat && loc ? { ...profil.victoriiPeLoc, [loc.id]: (profil.victoriiPeLoc[loc.id] ?? 0) + 1 } : profil.victoriiPeLoc,
        };
        set({ profil });
        if (amCastigat && loc) acorda(nuciPentruVictorie(loc, eu.penalizari, zile.serie, zile.bonusDat === azi), false);
        verificaInsigne(amCastigat ? { penalizari: eu.penalizari } : undefined);
        const partida = get().partida;
        set({
          rezumat: {
            linii: partida.linii,
            total: partida.nuci,
            insigne: insigneInPartida,
            rangInainte: rangLaStart,
            rangDupa: rangDupaNuci(get().profil.nuci).index,
          },
        });
      }

      function programeazaBot() {
        const { joc, loc } = get();
        if (!joc || !loc || joc.status === 'terminat') return;
        const botId = joc.jucatori[joc.randul].id;
        if (!esteBot(botId)) return;
        const g = generatie;
        set({ gandeste: botId });
        setTimeout(async () => {
          const inceput = get().joc;
          if (g !== generatie || !inceput || inceput.jucatori[inceput.randul].id !== botId) return;
          try {
            const cuvant = await alegeCuvant(inceput, dict, loc.nivel);
            if (g !== generatie) return;
            const acum = Date.now();
            let r: Rezultat;
            if (cuvant) {
              await dict.pregateste(prefix(cuvant));
              r = aplicaMutare(inceput, botId, cuvant, dict, acum);
              if (!r.ok) r = renunta(inceput, botId, acum);
            } else {
              r = renunta(inceput, botId, acum);
            }
            set({ gandeste: null });
            aplica(r);
          } catch {
            set({ gandeste: null, mesaj: msg('eroare', 'Nu am putut încărca dicționarul. Verifică conexiunea.') });
          }
        }, 900 + Math.random() * 1100);
      }

      function porneste(loc: Loc) {
        generatie++;
        const jucatori = [
          { id: EU, nume: get().nume.trim() || 'Tu' },
          ...loc.boti.map((nume, i) => ({ id: `bot${i}`, nume })),
        ];
        const cineIncepe = Math.floor(Math.random() * jucatori.length);
        const joc = startJoc(jucatori, Date.now(), { secundePeTura: loc.secundePeTura }, cineIncepe);
        inceputTura = Date.now();
        insigneInPartida = [];
        rangLaStart = rangDupaNuci(get().profil.nuci).index;
        set({
          loc,
          joc,
          partida: PARTIDA_NOUA,
          rezumat: null,
          recompensa: null,
          gandeste: null,
          mesaj: msg('info', cineIncepe === 0 ? 'Începi tu. Spune orice cuvânt.' : `Începe ${jucatori[cineIncepe].nume}.`),
        });
        programeazaBot();
      }

      return {
        dictionar: 'se_incarca',
        offline: { status: 'nu', progres: 0 },
        nume: '',
        profil: PROFIL_NOU,
        partida: PARTIDA_NOUA,
        rezumat: null,
        recompensa: null,
        anunturi: [],
        definitie: null,
        loc: null,
        joc: null,
        gandeste: null,
        seVerifica: false,
        mesaj: null,

        async initializeaza() {
          try {
            await dict.init();
            set({ dictionar: 'gata' });
          } catch {
            set({ dictionar: 'eroare' });
          }
        },

        setNume(nume) {
          set({ nume });
        },

        staiJos(locId) {
          const loc = LOCURI.find((l) => l.id === locId);
          if (loc && get().dictionar === 'gata' && rangDupaNuci(get().profil.nuci).index >= loc.rangNecesar) porneste(loc);
        },

        inca() {
          const loc = get().loc;
          if (loc) porneste(loc);
        },

        ridicaTe() {
          generatie++;
          set({ loc: null, joc: null, gandeste: null, mesaj: null });
        },

        async trimite(text) {
          const joc = get().joc;
          if (!joc || joc.status === 'terminat' || joc.jucatori[joc.randul].id !== EU) return false;
          const bucata = text.trim().toLowerCase();
          if (!bucata) return false;

          // Jucatorul scrie doar continuarea dupa literele cerute; acceptam si cuvantul intreg.
          const variante = joc.terminatie
            ? [joc.terminatie + bucata, ...(normalizeaza(bucata).startsWith(joc.terminatie) ? [bucata] : [])]
            : [bucata];

          set({ seVerifica: true });
          try {
            await Promise.all(variante.map((v) => dict.pregateste(prefix(v))));
          } catch {
            set({ seVerifica: false, mesaj: msg('eroare', 'Nu am putut încărca dicționarul. Verifică conexiunea.') });
            return false;
          }
          if (get().joc !== joc) {
            set({ seVerifica: false });
            return false;
          }
          const acum = Date.now();
          let r: Rezultat | null = null;
          for (const v of variante) {
            r = aplicaMutare(joc, EU, v, dict, acum);
            if (r.ok) break;
          }
          set({ seVerifica: false });
          if (!r || !r.ok) {
            const cod = r && !r.ok ? r.eroare : 'nu_exista';
            if (cod === 'timp_expirat') get().tick();
            else set({ mesaj: msg('eroare', MESAJE_EROARE[cod]) });
            return false;
          }
          set({ mesaj: null });
          recompenseazaCuvant(r, acum);
          aplica(r);
          return true;
        },

        renuntEu() {
          const joc = get().joc;
          if (joc) aplica(renunta(joc, EU, Date.now()));
        },

        tick() {
          const joc = get().joc;
          if (!joc || get().gandeste) return;
          const r = timpExpirat(joc, Date.now());
          if (r) aplica(r);
        },

        async deschideDefinitie(cuvant) {
          set({ definitie: { cuvant, faza: 'se_incarca', rezultate: [], dinCaiet: false } });
          try {
            const rezultate = await cautaDefinitii(cuvant);
            if (get().definitie?.cuvant !== cuvant) return;
            const caiet = get().profil.caiet;
            if (rezultate.length === 0) set({ definitie: { cuvant, faza: 'lipsa', rezultate, dinCaiet: false } });
            else if (rezultate.every((d) => caiet[d.lema])) set({ definitie: { cuvant, faza: 'gata', rezultate, dinCaiet: true } });
            else set({ definitie: { cuvant, faza: 'intrebare', rezultate, dinCaiet: false } });
          } catch {
            if (get().definitie?.cuvant === cuvant) set({ definitie: { cuvant, faza: 'eroare', rezultate: [], dinCaiet: false } });
          }
        },

        cumparaDefinitie() {
          const d = get().definitie;
          if (!d || d.faza !== 'intrebare') return;
          const profil = get().profil;
          if (profil.sold < PRET_DEFINITIE) {
            set({ definitie: { ...d, faza: 'fara_nuci' } });
            return;
          }
          const azi = ziua();
          const caiet = { ...profil.caiet };
          for (const r of d.rezultate) {
            if (!caiet[r.lema]) caiet[r.lema] = { cuvant: d.cuvant, categorie: r.categorie, text: r.text, sursa: r.sursa, data: azi };
          }
          set({ profil: { ...profil, sold: profil.sold - PRET_DEFINITIE, caiet }, definitie: { ...d, faza: 'gata' } });
          verificaInsigne();
        },

        inchideDefinitie() {
          set({ definitie: null });
        },

        inchideAnunt(id) {
          set({ anunturi: get().anunturi.filter((a) => a.id !== id) });
        },

        async descarcaOffline() {
          if (get().offline.status !== 'nu') return;
          set({ offline: { status: 'se_descarca', progres: 0 } });
          const toate = [...dict.prefixe()];
          const coada = [...toate];
          let gata = 0;
          const lucrator = async () => {
            while (coada.length) {
              const p = coada.shift()!;
              try {
                await dict.pregateste(p);
              } catch {
                /* se reincearca la joc */
              }
              gata++;
              set({ offline: { status: 'se_descarca', progres: gata / toate.length } });
            }
          };
          await Promise.all(Array.from({ length: 6 }, lucrator));
          set({ offline: { status: 'gata', progres: 1 } });
        },
      };
    },
    {
      name: 'fazan-solo',
      version: 4,
      migrate: (vechi: any) => {
        const st = vechi?.statistici ?? { victorii: 0, infrangeri: 0 };
        const p = vechi?.profil ?? { victorii: st.victorii, partide: st.victorii + st.infrangeri };
        return {
          nume: vechi?.preferinte?.nume ?? vechi?.nume ?? '',
          profil: { ...PROFIL_NOU, ...p, sold: p.sold ?? p.nuci ?? 0, caiet: p.caiet ?? {} },
        } as any;
      },
      partialize: (s) => ({
        nume: s.nume,
        profil: s.profil,
        offline: s.offline.status === 'gata' ? s.offline : { status: 'nu' as const, progres: 0 },
      }),
    },
  ),
);
