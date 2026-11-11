import { useEffect, useRef } from 'react';
import { linkDexonline } from '../definitii';
import { PRET_DEFINITIE } from '../recompense';
import { EU, useJoc } from '../store/joc';
import Nuca from './Nuca';

/** Foaia de jos cu definitia unui cuvant; costa nuci prima data, apoi ramane in caiet. */
export default function DefinitieFoaie() {
  const d = useJoc((s) => s.definitie);
  const sold = useJoc((s) => s.profil.sold);
  const randulMeu = useJoc((s) => !!s.joc && s.joc.status !== 'terminat' && s.joc.jucatori[s.joc.randul].id === EU);
  const { cumparaDefinitie, inchideDefinitie } = useJoc();
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [d?.faza]);
  useEffect(() => {
    if (!d) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && inchideDefinitie();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [d, inchideDefinitie]);
  if (!d) return null;

  const link = (
    <a className="foaie__link" href={linkDexonline(d.cuvant)} target="_blank" rel="noopener noreferrer">
      Toate definițiile pe dexonline.ro
    </a>
  );

  return (
    <div className="foaie-fond" onClick={inchideDefinitie}>
      <div className="foaie" role="dialog" aria-modal="true" aria-labelledby="foaie-titlu" onClick={(e) => e.stopPropagation()}>
        <h2 id="foaie-titlu" className="foaie__cuvant">{d.cuvant}</h2>

        {d.faza === 'se_incarca' && <p className="foaie__text">Se caută în dicționar…</p>}

        {d.faza === 'intrebare' && (
          <>
            <p className="foaie__text">
              Afli ce înseamnă pentru {PRET_DEFINITIE} nuci. Cuvântul intră în caietul tău, îl poți reciti oricând fără
              plată, iar dacă îl spui într-o partidă primești nuci înapoi.
            </p>
            <p className="foaie__sold">
              Ai <Nuca /> {sold} în pungă.
            </p>
            {randulMeu && <p className="foaie__atentie">E rândul tău: timpul curge în continuare.</p>}
            <div className="foaie__butoane">
              <button ref={ref} className="buton buton--principal" onClick={cumparaDefinitie}>
                Află pentru {PRET_DEFINITIE} nuci
              </button>
              <button className="buton buton--secundar" onClick={inchideDefinitie}>
                Lasă
              </button>
            </div>
          </>
        )}

        {d.faza === 'fara_nuci' && (
          <>
            <p className="foaie__text">
              Îți mai trebuie {PRET_DEFINITIE - sold} {PRET_DEFINITIE - sold === 1 ? 'nucă' : 'nuci'}. Fiecare cuvânt spus aduce
              cel puțin una.
            </p>
            <div className="foaie__butoane">
              <button ref={ref} className="buton buton--secundar" onClick={inchideDefinitie}>
                Înapoi la joc
              </button>
            </div>
          </>
        )}

        {d.faza === 'gata' && (
          <>
            {d.rezultate.map((r) => (
              <section key={r.lema} className="foaie__sens">
                {r.lema !== d.cuvant && (
                  <p className="foaie__forma">
                    Formă a cuvântului <strong>{r.lema}</strong>
                  </p>
                )}
                {r.categorie && <p className="foaie__categorie">{r.categorie}</p>}
                <p className="foaie__text">{r.text}</p>
                <p className="foaie__sursa">Din {r.sursa}, prin dexonline.ro</p>
              </section>
            ))}
            {d.dinCaiet && <p className="foaie__sursa">Din caietul tău.</p>}
            {link}
            <div className="foaie__butoane">
              <button ref={ref} className="buton buton--secundar" onClick={inchideDefinitie}>
                Închide
              </button>
            </div>
          </>
        )}

        {(d.faza === 'lipsa' || d.faza === 'eroare') && (
          <>
            <p className="foaie__text">
              {d.faza === 'lipsa'
                ? 'Nu avem definiția acestui cuvânt în joc, dar o găsești pe dexonline. Nu te costă nimic.'
                : 'Definițiile nu s-au putut încărca. Verifică conexiunea.'}
            </p>
            {link}
            <div className="foaie__butoane">
              <button ref={ref} className="buton buton--secundar" onClick={inchideDefinitie}>
                Închide
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
