import { normalizeaza } from '../engine';

/** Cuvantul cu ultimele doua litere evidentiate (veriga lantului). */
export default function Cuvant({ cuvant, className = '' }: { cuvant: string; className?: string }) {
  const n = cuvant.length;
  // Terminatia are mereu 2 litere (si fara diacritice tot 2), deci putem taia direct.
  const inceput = cuvant.slice(0, n - 2);
  const veriga = cuvant.slice(n - 2);
  return (
    <span className={`cuvant ${className}`} data-terminatie={normalizeaza(veriga)}>
      {inceput}
      <span className="veriga">{veriga}</span>
    </span>
  );
}
