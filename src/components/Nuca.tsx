/** Nuca: moneda jocului. */
export default function Nuca({ className = '' }: { className?: string }) {
  return (
    <svg className={`nuca ${className}`} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <ellipse cx="10" cy="10.5" rx="7.2" ry="8" fill="#b8844a" />
      <ellipse cx="10" cy="10.5" rx="7.2" ry="8" fill="none" stroke="#6e4a26" strokeWidth="1.2" />
      <path d="M10 2.6v15.8" stroke="#6e4a26" strokeWidth="1.3" />
      <path d="M5.2 7c1.4.8 1.4 2 0 2.8M5 12.2c1.5.7 1.5 2 0 2.6M14.8 7c-1.4.8-1.4 2 0 2.8M15 12.2c-1.5.7-1.5 2 0 2.6" fill="none" stroke="#6e4a26" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
