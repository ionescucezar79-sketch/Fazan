# Fazan (solo contra botului)

React 18 + Vite + Zustand, PWA. Motorul jocului e în `src/engine` (TypeScript pur, testat).

## Pornire
```
npm install
npm run dev        # http://localhost:5173
npm test           # 21 de teste (reguli, bot, dicționarul real)
npm run build      # dist/ gata pentru Firebase Hosting
firebase deploy --only hosting
```

## Structură
- `src/engine/` – reguli (`fazan.ts`), dicționar (`dictionar.ts`), bot (`bot.ts`)
- `src/store/joc.ts` – store Zustand: meci, botul, timer, preferințe și statistici (persistate)
- `src/locuri.ts` – locurile de pe „uliță” (ca mesele de poker): nume, suprafață, nivel, timp, cine stă acolo
- `src/components/Ulita.tsx` – lobby-ul: alegi unde te așezi
- `src/components/Masa.tsx` – partida: scoarța, scaunele cu inel de timp, cărțile cu cuvinte, intrarea
- `public/dict/` – dicționarul jucabil pe prefixe (generat cu `npm run imparte -- lista.tsv public/dict`)

## Offline
Aplicația intră în precache (~400 KB). Dicționarul nu: fiecare fișier de prefix se salvează
în cache la prima folosire (Workbox, CacheFirst). Butonul „Descarcă dicționarul” de pe ecranul
de start le descarcă pe toate (~3 MB transfer). Când regenerezi dicționarul, schimbă
`cacheName` din `vite.config.ts` (ex. `fazan-dictionar-v2`).

## Cum se joacă
Jucătorul scrie doar continuarea după literele cerute (arătate în câmp), dar e acceptat și
cuvântul întreg. Diacriticele sunt opționale.

## Recompense (`src/recompense.ts`)
- **Nuci** (moneda jocului, nu se pierd niciodată): 1 pe cuvânt, +1..3 pentru cuvinte lungi (9+ litere),
  +3 cuvânt rar, +2 răspuns sub 3 secunde, +5 închidere, +5 la fiecare serie de 5 cuvinte.
  La victorie: premiul locului (20 / 40 / 80), +20 fără nicio literă, bonusul primei victorii de azi (10 × zile la rând, maxim 50).
- **Ranguri**: Ucenic (0), Vorbăreț (150), Iscusit (450), Meșter de vorbe (1000), Vătaful jocului (2000).
  Covorul din tindă se deschide la Vorbăreț, masa de sub nuc la Iscusit.
- **Lada de zestre**: 12 insigne, fiecare cu nuci în plus. Se adaugă ușor în lista `INSIGNE`.
- Profilul se păstrează în localStorage (`fazan-solo`). La modul online trebuie mutat în Firestore
  și calculat în Cloud Function, altfel se poate trișa.

## Definiții („Ce înseamnă?”)
- Sursă: **DEX '98 și DEX '96** din dump-ul dexonline, singurele surse marcate `canDistribute` (licență GPL).
  Celelalte dicționare din dump au textul trunchiat și nu pot fi redistribuite. Acoperire: ~66% din formele jucabile.
- Pentru restul, foaia arată gratuit un link spre dexonline.ro (link, nu interogare automată).
- Generare: `python scripts/extrage_tabele.py` (TSV-uri din dump) apoi `python scripts/genereaza_definitii.py public/def`.
  Fișierele sunt pe primele 3 litere (~2 500 de fișiere, ~6 MB comprimat) și se descarcă doar la cerere.
- Cost: 3 nuci din pungă prima dată; cuvântul intră în **caiet** și se recitește gratis.
  Dacă spui apoi cuvântul într-o partidă primești +2 nuci (o singură dată). Definițiile lipsă nu costă nimic.
- „Nucile strânse” (rangul) și „nucile din pungă” (se cheltuie) sunt separate, ca rangul să nu scadă.
- Atribuire obligatorie: fiecare definiție afișează „Din DEX '98, prin dexonline.ro”.
