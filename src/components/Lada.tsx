import { useEffect, useRef } from 'react';
import { INSIGNE } from '../recompense';
import { useJoc } from '../store/joc';

/** Lada de zestre: toate insignele, castigate si de castigat. */
export default function Lada({ onInchide }: { onInchide: () => void }) {
  const profil = useJoc((s) => s.profil);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const castigate = INSIGNE.filter((i) => profil.insigne[i.id]).length;
  return (
    <div className="final" role="dialog" aria-modal="true" aria-labelledby="lada-titlu" onClick={onInchide}>
      <div className="final__panou lada" onClick={(e) => e.stopPropagation()}>
        <h2 id="lada-titlu" className="final__titlu">Lada de zestre</h2>
        <p className="final__detaliu">
          {castigate} din {INSIGNE.length} insigne. Fiecare insignă aduce nuci în plus.
        </p>
        <ul className="insigne">
          {INSIGNE.map((i) => {
            const are = !!profil.insigne[i.id];
            return (
              <li key={i.id} className={`insigna${are ? ' insigna--are' : ''}`}>
                <span className="insigna__semn" aria-hidden="true">{are ? '✦' : '·'}</span>
                <span className="insigna__text">
                  <strong>{i.nume}</strong>
                  <span>{i.descriere}</span>
                </span>
                <span className="insigna__nuci">{are ? 'primită' : `+${i.nuci}`}</span>
              </li>
            );
          })}
        </ul>
        <button ref={ref} className="buton buton--secundar" onClick={onInchide}>
          Închide lada
        </button>
      </div>
    </div>
  );
}
