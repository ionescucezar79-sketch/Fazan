import { useState } from 'react';
import { LOCURI, NUME_NIVEL } from '../locuri';
import { INSIGNE, RANGURI, rangDupaNuci } from '../recompense';
import { useJoc } from '../store/joc';
import Lada from './Lada';
import Caiet from './Caiet';
import Nuca from './Nuca';

function Punga() {
  const profil = useJoc((s) => s.profil);
  const [lada, setLada] = useState(false);
  const [caiet, setCaiet] = useState(false);
  const cuvinte = Object.keys(profil.caiet).length;
  const { rang, urmator, progres } = rangDupaNuci(profil.nuci);
  const insigne = INSIGNE.filter((i) => profil.insigne[i.id]).length;
  return (
    <div className="punga">
      <div className="punga__rand">
        <span className="punga__nuci">
          <Nuca /> {profil.sold} {profil.sold === 1 ? 'nucă' : 'nuci'}
        </span>
        <span className="punga__butoane">
          <button className="buton buton--secundar punga__lada" onClick={() => setCaiet(true)}>
            Caietul ({cuvinte})
          </button>
          <button className="buton buton--secundar punga__lada" onClick={() => setLada(true)}>
            Lada de zestre ({insigne}/{INSIGNE.length})
          </button>
        </span>
      </div>
      <p className="punga__rang">
        <strong>{rang.nume}</strong>, {profil.nuci} nuci strânse în total
        {urmator ? <span>. Încă {urmator.prag - profil.nuci} până la {urmator.nume}.</span> : <span>. Ai cel mai înalt rang.</span>}
      </p>
      <div className="punga__bara" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progres * 100)} aria-label="Progres spre rangul următor">
        <span style={{ transform: `scaleX(${progres})` }} />
      </div>
      {profil.zile.serie > 1 && <p className="punga__zile">Joci de {profil.zile.serie} zile la rând.</p>}
      {lada && <Lada onInchide={() => setLada(false)} />}
      {caiet && <Caiet onInchide={() => setCaiet(false)} />}
    </div>
  );
}

function Locuri({ ocupate }: { ocupate: string[] }) {
  return (
    <span className="scaune" aria-label={`${ocupate.length + 1} locuri, unul liber pentru tine`}>
      {ocupate.map((n) => (
        <span key={n} className="scaun scaun--ocupat" title={n}>
          {n.replace(/^(Nea|Tanti|Popa|Domnu’)\s/, '')[0]}
        </span>
      ))}
      <span className="scaun scaun--liber" title="Locul tău" />
    </span>
  );
}

export default function Ulita() {
  const { nume, setNume, staiJos, dictionar, profil, offline, descarcaOffline } = useJoc();
  const rangul = rangDupaNuci(profil.nuci).index;

  return (
    <section className="ulita">
      <header className="ulita__cap">
        <h1 className="ulita__titlu">Fazan</h1>
        <p className="ulita__regula">
          Spui un cuvânt care începe cu ultimele două litere ale celui de dinainte. Cine nu găsește primește o literă.
          Cine adună FAZAN se ridică de la joc.
        </p>
        <label className="ulita__nume">
          <span>Cum te strigă lumea</span>
          <input type="text" value={nume} maxLength={16} placeholder="Tu" autoComplete="given-name" onChange={(e) => setNume(e.target.value)} />
        </label>
        <Punga />
      </header>

      <h2 className="ulita__sectiune">Unde te așezi?</h2>
      <ul className="locuri">
        {LOCURI.map((l) => {
          const deschis = rangul >= l.rangNecesar;
          return (
          <li key={l.id} className={`loc loc--${l.suprafata}${deschis ? '' : ' loc--inchis'}`}>
            <div className="loc__mostra" aria-hidden="true">
              <div className={`covor covor--${l.suprafata} covor--mic`}>
                <div className="covor__camp" />
              </div>
            </div>
            <div className="loc__text">
              <h3 className="loc__nume">{l.nume}</h3>
              <p className="loc__descriere">{l.descriere}</p>
              <p className="loc__detalii">
                {NUME_NIVEL[l.nivel]}, {l.secundePeTura} secunde pe tură
              </p>
              <p className="loc__jucatori">
                <Locuri ocupate={l.boti} />
                <span>{l.boti.join(', ')}</span>
              </p>
            </div>
            {deschis ? (
              <button className="buton buton--principal loc__buton" onClick={() => staiJos(l.id)} disabled={dictionar !== 'gata'}>
                Stai jos
              </button>
            ) : (
              <p className="loc__lacat">Se deschide când ajungi {RANGURI[l.rangNecesar].nume}.</p>
            )}
          </li>
          );
        })}
      </ul>

      <footer className="ulita__subsol">
        {dictionar === 'se_incarca' && <p>Se încarcă dicționarul…</p>}
        {dictionar === 'eroare' && (
          <p className="eroare" role="alert">
            Dicționarul nu s-a încărcat. Verifică conexiunea și reîncarcă pagina.
          </p>
        )}
        {profil.partide > 0 && (
          <p>
            Până acum: {profil.victorii} din {profil.partide} {profil.partide === 1 ? 'partidă câștigată' : 'partide câștigate'}, {profil.cuvinte}{' '}
            {profil.cuvinte === 1 ? 'cuvânt spus' : 'cuvinte spuse'}.
          </p>
        )}
        {offline.status === 'gata' ? (
          <p>Dicționarul e salvat pe telefon. Poți juca și fără internet.</p>
        ) : offline.status === 'se_descarca' ? (
          <p aria-live="polite">
            Se descarcă dicționarul: {Math.round(offline.progres * 100)}%
            <progress max={1} value={offline.progres} />
          </p>
        ) : (
          <button className="buton buton--text" type="button" onClick={descarcaOffline} disabled={dictionar !== 'gata'}>
            Descarcă dicționarul ca să joci fără internet (aprox. 3 MB)
          </button>
        )}
      </footer>
    </section>
  );
}
