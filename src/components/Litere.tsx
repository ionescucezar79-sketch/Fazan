import { CUVANT_FAZAN } from '../engine';

/** Cele cinci jetoane F-A-Z-A-N; cele primite sunt intoarse. */
export default function Litere({ penalizari, mic = false }: { penalizari: number; mic?: boolean }) {
  return (
    <span className={`litere${mic ? ' litere--mic' : ''}`} aria-label={`${penalizari} din 5 litere`}>
      {[...CUVANT_FAZAN].map((l, i) => (
        <span key={i} className={`litera${i < penalizari ? ' litera--primita' : ''}`} aria-hidden="true">
          {l}
        </span>
      ))}
    </span>
  );
}
