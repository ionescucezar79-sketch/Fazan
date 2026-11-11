#!/usr/bin/env node
// Imparte lista de cuvinte in fisiere per prefix (primele 2 litere, fara diacritice).
// Utilizare: node scripts/imparte-lista.mjs <lista.tsv|lista.txt[.gz]> [director_iesire]
// Intrare: un cuvant pe linie, optional "cuvant<TAB>frecventa".
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';

const [, , intrare, iesire = 'public/dict'] = process.argv;
if (!intrare) {
  console.error('Utilizare: node scripts/imparte-lista.mjs <lista> [director_iesire]');
  process.exit(1);
}

const DIA = { ă: 'a', â: 'a', î: 'i', ș: 's', ț: 't' };
const normalizeaza = (s) => s.toLowerCase().replace(/[ăâîșț]/g, (c) => DIA[c]);
const VALID = /^[a-zăâîșț]{3,}$/;

let stream = fs.createReadStream(intrare);
if (intrare.endsWith('.gz')) stream = stream.pipe(zlib.createGunzip());
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

const grupe = new Map(); // prefix -> [[cuvant, frecventa]]
const terminatii = new Map(); // terminatie -> cate cuvinte se termina asa
let total = 0;

for await (const linie of rl) {
  const [brut, fr] = linie.split('\t');
  const cuvant = (brut || '').trim().toLowerCase();
  if (!VALID.test(cuvant)) continue;
  const n = normalizeaza(cuvant);
  const p = n.slice(0, 2);
  if (!grupe.has(p)) grupe.set(p, []);
  grupe.get(p).push([cuvant, Number(fr) || 0]);
  const t = n.slice(-2);
  terminatii.set(t, (terminatii.get(t) || 0) + 1);
  total++;
}

fs.mkdirSync(iesire, { recursive: true });
const continuari = {};
for (const [p, lista] of grupe) {
  // descrescator dupa frecventa: botul "usor" alege din capul listei
  lista.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ro'));
  fs.writeFileSync(path.join(iesire, `${p}.json`), JSON.stringify(lista.map((x) => x[0])));
  continuari[p] = lista.length;
}

const inchid = [...terminatii.keys()].filter((t) => !continuari[t]).sort();
const index = {
  versiune: new Date().toISOString().slice(0, 10),
  total,
  continuari, // prefix -> cate cuvinte incep asa
  inchid, // terminatii fara nicio continuare
};
fs.writeFileSync(path.join(iesire, 'index.json'), JSON.stringify(index));
console.log(`${total} cuvinte, ${grupe.size} fisiere de prefix, ${inchid.length} terminatii care inchid -> ${iesire}`);
