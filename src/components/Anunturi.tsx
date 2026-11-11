import { useEffect } from 'react';
import { useJoc } from '../store/joc';

/** Anunturile de insigne si ranguri, unul cate unul, sus pe ecran. */
export default function Anunturi() {
  const anunt = useJoc((s) => s.anunturi[0]);
  const inchide = useJoc((s) => s.inchideAnunt);
  useEffect(() => {
    if (!anunt) return;
    const t = setTimeout(() => inchide(anunt.id), 3800);
    return () => clearTimeout(t);
  }, [anunt, inchide]);
  if (!anunt) return null;
  return (
    <div className="anunt-loc" role="status" aria-live="polite">
      <button key={anunt.id} className={`anunt anunt--${anunt.tip}`} onClick={() => inchide(anunt.id)}>
        <span className="anunt__semn" aria-hidden="true">{anunt.tip === 'rang' ? '▲' : '✦'}</span>
        <span>
          <strong className="anunt__titlu">{anunt.titlu}</strong>
          <span className="anunt__text">{anunt.text}</span>
        </span>
      </button>
    </div>
  );
}
