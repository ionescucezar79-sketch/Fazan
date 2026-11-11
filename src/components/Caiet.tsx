import { useEffect, useRef } from 'react';
import { useJoc } from '../store/joc';

/** Caietul de cuvinte: definitiile aflate, recitite gratis. */
export default function Caiet({ onInchide }: { onInchide: () => void }) {
  const caiet = useJoc((s) => s.profil.caiet);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const intrari = Object.entries(caiet).sort((a, b) => b[1].data.localeCompare(a[1].data) || a[0].localeCompare(b[0], 'ro'));
  return (
    <div className="final" role="dialog" aria-modal="true" aria-labelledby="caiet-titlu" onClick={onInchide}>
      <div className="final__panou lada" onClick={(e) => e.stopPropagation()}>
        <h2 id="caiet-titlu" className="final__titlu">Caietul de cuvinte</h2>
        {intrari.length === 0 ? (
          <p className="final__detaliu">
            E gol deocamdată. În timpul jocului, apasă pe cartea din mijloc și alege „Ce înseamnă?” ca să afli un cuvânt nou.
          </p>
        ) : (
          <>
            <p className="final__detaliu">
              {intrari.length} {intrari.length === 1 ? 'cuvânt aflat' : 'cuvinte aflate'}. Cele spuse deja într-o partidă sunt bifate.
            </p>
            <ul className="caiet">
              {intrari.map(([lema, i]) => (
                <li key={lema}>
                  <details>
                    <summary>
                      <span className="caiet__lema">{lema}</span>
                      {i.folosit && <span className="caiet__bifa">folosit</span>}
                    </summary>
                    {i.categorie && <p className="foaie__categorie">{i.categorie}</p>}
                    <p className="caiet__text">{i.text}</p>
                    <p className="foaie__sursa">Din {i.sursa}, prin dexonline.ro</p>
                  </details>
                </li>
              ))}
            </ul>
          </>
        )}
        <button ref={ref} className="buton buton--secundar" onClick={onInchide}>
          Închide caietul
        </button>
      </div>
    </div>
  );
}
