#!/usr/bin/env node
// Reface index-v2.json din fisierele de prefix existente (fara lista sursa).
// Utilizare: node scripts/reindexeaza.mjs [director=public/dict]
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'public/dict';
const continuari = {};
const terminatii = new Set();
let total = 0;
for (const f of fs.readdirSync(dir)) {
  if (!/^[a-z]{2}\.json$/.test(f)) continue;
  for (const c of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
    const p = c.slice(0, 2);
    continuari[p] = (continuari[p] || 0) + 1;
    terminatii.add(c.slice(-2));
    total++;
  }
}
const inchid = [...terminatii].filter((t) => !continuari[t]).sort();
const index = { versiune: new Date().toISOString().slice(0, 10), total, continuari, inchid };
fs.writeFileSync(path.join(dir, 'index-v2.json'), JSON.stringify(index));
console.log(`${total} cuvinte, ${Object.keys(continuari).length} prefixe exacte, ${inchid.length} terminatii care inchid`);
