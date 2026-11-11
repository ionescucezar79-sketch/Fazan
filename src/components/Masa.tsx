import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { literePrimite, type Jucator, type StareJoc } from '../engine';
import { EU, useJoc } from '../store/joc';
import Cuvant from './Cuvant';
import Litere from './Litere';
import Nuca from './Nuca';
import { RANGURI, rangDupaNuci } from '../recompense';

/** Pozitia scaunelor in jurul covorului, in procente din masa. Tu esti mereu jos. */
const POZITII: Record<number, [number, number][]> = {
  2: [[50, 7]],
  3: [[20, 12], [80, 12]],
  4: [[8, 44], [50, 7], [92, 44]],
};
const POZITIE_EU: [number, number] = [50, 93];

function pozitii(joc: StareJoc): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  const altii = joc.jucatori.filter((j) => j.id !== EU);
  const lista = POZITII[joc.jucatori.length] ?? POZITII[4];
  m.set(EU, POZITIE_EU);
  altii.forEach((j, i) => m.set(j.id, lista[i] ?? [50, 7]));
  return m;
}

function useAcum(activ: boolean, ms = 150) {
  const [acum, setAcum] = useState(Date.now());
  useEffect(() => {
    if (!activ) return;
    const t = setInterval(() => setAcum(Date.now()), ms);
    return () => clearInterval(t);
  }, [activ, ms]);
  return acum;
}

const initiala = (nume: string) => nume.replace(/^(Nea|Tanti|Popa|Domnu’)\s/, '').slice(0, 1).toUpperCase();

function Scaun({
  j,
  poz,
  laRand,
  gandeste,
  ramas,
  secunde,
}: {
  j: Jucator;
  poz: [number, number];
  laRand: boolean;
  gandeste: boolean;
  ramas: number | null;
  secunde: number | null;
}) {
  const stil = { left: `${poz[0]}%`, top: `${poz[1]}%`, '--p': ramas ?? 1 } as CSSProperties;
  const urgent = laRand && secunde !== null && secunde <= 5;
  return (
    <div
      className={`scaun-joc${j.id === EU ? ' scaun-joc--eu' : ''}${laRand ? ' scaun-joc--activ' : ''}${urgent ? ' scaun-joc--urgent' : ''}${j.eliminat ? ' scaun-joc--iesit' : ''}`}
      style={stil}
    >
      <div className="scaun-joc__avatar">
        <span>{j.id === EU ? initiala(j.nume === 'Tu' ? 'Eu' : j.nume) : initiala(j.nume)}</span>
        {laRand && secunde !== null && <span className="scaun-joc__secunde">{secunde}</span>}
      </div>
      <div className="scaun-joc__eticheta">
        <span className="scaun-joc__nume">
          {j.nume}
          {laRand && <span className="vizual-ascuns"> este la rând</span>}
        </span>
        <Litere penalizari={j.penalizari} mic />
      </div>
      {gandeste && <span className="scaun-joc__bula" aria-label="se gândește">…</span>}
      {j.id === EU && <Zbor />}
      {j.eliminat && <span className="scaun-joc__fazan">fazan</span>}
    </div>
  );
}

function NuciPartida() {
  const nuci = useJoc((s) => s.partida.nuci);
  return (
    <span className="joc__nuci" aria-label={`${nuci} nuci în partida asta`}>
      <Nuca /> {nuci}
    </span>
  );
}

/** "+N nuci" care urca din scaunul tau dupa fiecare cuvant. */
function Zbor() {
  const recompensa = useJoc((s) => s.recompensa);
  if (!recompensa) return null;
  return (
    <span key={recompensa.id} className="zbor" aria-hidden="true">
      +{recompensa.nuci} <Nuca />
    </span>
  );
}

const esteInCaiet = (caiet: Record<string, { cuvant: string }>, c: string) =>
  !!caiet[c] || Object.values(caiet).some((i) => i.cuvant === c);

function IntreabaCuvant({ cuvant }: { cuvant: string }) {
  const deschide = useJoc((s) => s.deschideDefinitie);
  const stiut = useJoc((s) => esteInCaiet(s.profil.caiet, cuvant));
  return (
    <button className="carte__intreaba" onClick={() => deschide(cuvant)} aria-label={`Ce înseamnă ${cuvant}?`}>
      {stiut ? 'Din caiet' : 'Ce înseamnă?'}
    </button>
  );
}

function Pachet({ joc, poz }: { joc: StareJoc; poz: Map<string, [number, number]> }) {
  // Cartile rundei curente: ultima e deasupra, cele de dinainte stau evantai in spate.
  const start = joc.istoric.findLastIndex((m) => m.tip !== 'cuvant');
  const runda = joc.cuvantCurent ? joc.istoric.slice(start + 1).map((m, k) => ({ m, i: start + 1 + k })) : [];
  const vizibile = runda.slice(-4);
  const eu = joc.jucatori.find((j) => j.id === EU)!;
  const randulMeu = joc.jucatori[joc.randul]?.id === EU;

  if (vizibile.length === 0) {
    return (
      <div className="pachet pachet--gol">
        <p className="pachet__runda">Rundă nouă</p>
        <p className="pachet__indemn">
          {joc.status === 'terminat'
            ? ''
            : randulMeu
              ? 'Spune orice cuvânt.'
              : `${joc.jucatori[joc.randul].nume} alege primul cuvânt.`}
        </p>
        {eu.penalizari > 0 && <p className="pachet__stare">Tu ai {literePrimite(eu)}.</p>}
      </div>
    );
  }

  return (
    <div className="pachet" aria-live="polite">
      {vizibile.map(({ m, i }, k) => {
        const deasupra = k === vizibile.length - 1;
        const adancime = vizibile.length - 1 - k;
        const [sx, sy] = poz.get(m.jucatorId) ?? [50, 50];
        const cuvant = m.cuvant!;
        const stil = {
          '--dx': `${(sx - 50) * 0.9}cqw`,
          '--dy': `${(sy - 50) * 0.9}cqh`,
          '--rot': `${[0, -7, 6, -4][adancime]}deg`,
          '--adancime': adancime,
          '--marime': `${Math.min(2.9, 22 / Math.max(cuvant.length, 6))}rem`,
        } as CSSProperties;
        return (
          <div key={i} className={`carte${deasupra ? ' carte--sus' : ''}`} style={stil}>
            <Cuvant cuvant={cuvant} />
            {deasupra && (
              <>
                <span className="carte__autor">{joc.jucatori.find((j) => j.id === m.jucatorId)?.nume}</span>
                <IntreabaCuvant cuvant={cuvant} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CuvintelePartidei({ joc }: { joc: StareJoc }) {
  const deschide = useJoc((s) => s.deschideDefinitie);
  const caiet = useJoc((s) => s.profil.caiet);
  const cuvinte = [...new Set(joc.istoric.filter((m) => m.cuvant && m.jucatorId !== EU).map((m) => m.cuvant!))].slice(-12);
  if (!cuvinte.length) return null;
  return (
    <div className="final__cuvinte">
      <p>Ai dat de un cuvânt necunoscut? Apasă pe el.</p>
      <ul>
        {cuvinte.map((c) => (
          <li key={c}>
            <button className={`chip${esteInCaiet(caiet, c) ? ' chip--stiut' : ''}`} onClick={() => deschide(c)}>
              {c}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Final({ joc }: { joc: StareJoc }) {
  const { inca, ridicaTe, loc, rezumat, profil } = useJoc();
  const amCastigat = joc.castigatorId === EU;
  const butonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => butonRef.current?.focus(), []);
  const { rang, urmator, progres } = rangDupaNuci(profil.nuci);
  const urcat = rezumat && rezumat.rangDupa > rezumat.rangInainte;
  return (
    <div className="final" role="dialog" aria-modal="true" aria-labelledby="final-titlu">
      <div className="final__panou">
        <h2 id="final-titlu" className="final__titlu">
          {amCastigat ? 'Ai câștigat partida.' : 'Ai rămas fazan.'}
        </h2>
        {rezumat && rezumat.total > 0 ? (
          <>
            <ul className="socoteala">
              {rezumat.linii.map((l) => (
                <li key={l.motiv}>
                  <span>{l.motiv}</span>
                  <span>+{l.nuci}</span>
                </li>
              ))}
              <li className="socoteala__total">
                <span>Ai strâns</span>
                <span>
                  {rezumat.total} <Nuca />
                </span>
              </li>
            </ul>
            {rezumat.insigne.length > 0 && (
              <p className="final__insigne">
                Insigne noi: {rezumat.insigne.map((i) => i.nume).join(', ')}.
              </p>
            )}
          </>
        ) : (
          <p className="final__detaliu">De data asta n-ai strâns nuci. Fiecare cuvânt spus aduce cel puțin una.</p>
        )}
        <CuvintelePartidei joc={joc} />
        <div className="final__rang">
          <span>
            {urcat ? `Ai urcat la ${RANGURI[rezumat!.rangDupa].nume}.` : `${rang.nume}.`}
            {urmator ? ` Încă ${urmator.prag - profil.nuci} nuci până la ${urmator.nume}.` : ''}
          </span>
          <div className="punga__bara">
            <span style={{ transform: `scaleX(${progres})` }} />
          </div>
        </div>
        <div className="final__butoane">
          <button ref={butonRef} className="buton buton--principal" onClick={inca}>
            Încă o partidă la {loc?.nume.toLowerCase()}
          </button>
          <button className="buton buton--secundar" onClick={ridicaTe}>
            Înapoi pe uliță
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Masa() {
  const { joc, loc, gandeste, seVerifica, mesaj, trimite, renuntEu, ridicaTe, tick } = useJoc();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const activ = !!joc && joc.status !== 'terminat';
  const acum = useAcum(activ && joc?.termenLimita !== null);
  const randulMeu = activ && joc!.jucatori[joc!.randul].id === EU;

  useEffect(() => {
    if (activ) tick();
  }, [acum, activ, tick]);

  useEffect(() => {
    if (randulMeu) inputRef.current?.focus();
  }, [randulMeu, joc?.istoric.length]);

  if (!joc || !loc) return null;

  const poz = pozitii(joc);
  const total = joc.setari.secundePeTura * 1000;
  const ramasMs = joc.termenLimita !== null ? Math.min(total, Math.max(0, joc.termenLimita - acum)) : null;

  const trimiteText = async () => {
    if (!text.trim() || seVerifica) return;
    if (await trimite(text)) setText('');
    else inputRef.current?.focus();
  };

  return (
    <section className={`joc joc--${loc.suprafata}`}>
      <header className="joc__bara">
        <button
          className="buton buton--text"
          onClick={() => {
            if (joc.status === 'terminat' || confirm('Te ridici de la joc? Partida se pierde.')) ridicaTe();
          }}
        >
          Ridică-te
        </button>
        <span className="joc__loc">{loc.nume}</span>
        <NuciPartida />
      </header>

      <div className="masa">
        <div className={`covor covor--${loc.suprafata}`}>
          <div className="covor__camp">
            <Pachet joc={joc} poz={poz} />
          </div>
        </div>
        {joc.jucatori.map((j, i) => {
          const laRand = activ && joc.randul === i;
          return (
            <Scaun
              key={j.id}
              j={j}
              poz={poz.get(j.id)!}
              laRand={laRand}
              gandeste={gandeste === j.id}
              ramas={laRand && ramasMs !== null ? ramasMs / total : null}
              secunde={laRand && ramasMs !== null ? Math.ceil(ramasMs / 1000) : null}
            />
          );
        })}
      </div>

      <p className={`mesaj${mesaj ? ` mesaj--${mesaj.tip}` : ''}`} role="status" aria-live="polite" key={mesaj?.id}>
        {mesaj?.text ?? '\u00a0'}
      </p>

      <form
        className="intrare"
        onSubmit={(e) => {
          e.preventDefault();
          trimiteText();
        }}
      >
        <button className="buton buton--secundar intrare__renunt" type="button" onClick={renuntEu} disabled={!randulMeu}>
          Renunț
        </button>
        <div className={`intrare__camp${randulMeu ? '' : ' intrare__camp--blocat'}`}>
          {joc.terminatie && <span className="intrare__veriga" aria-hidden="true">{joc.terminatie}</span>}
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!randulMeu}
            placeholder={randulMeu ? (joc.terminatie ? 'continuă' : 'un cuvânt') : 'așteaptă'}
            aria-label={joc.terminatie ? `Cuvânt care începe cu ${joc.terminatie}` : 'Cuvânt'}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="send"
          />
        </div>
        <button className="buton buton--principal" type="submit" disabled={!randulMeu || !text.trim() || seVerifica}>
          Spune
        </button>
      </form>

      {joc.status === 'terminat' && <Final joc={joc} />}
    </section>
  );
}
