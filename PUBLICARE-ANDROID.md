# Publicarea Fazan în Google Play (TWA)

Aplicația Android e un „ambalaj” (Trusted Web Activity) peste PWA-ul găzduit pe Firebase Hosting.
Actualizările jocului ajung la jucători prin `firebase deploy`, fără o versiune nouă în Play Store.
Un AAB nou trimiți doar când schimbi iconița, numele sau pachetul.

## 0. Ce trebuie hotărât o singură dată
- **Numele pachetului:** acum e `yo.da.fazan`, în `public/.well-known/assetlinks.json`. După
  prima publicare nu se mai poate schimba. Dacă vrei alt nume, schimbă-l acum, peste tot.
- **Adresa de contact:** înlocuiește `ADRESA_DE_CONTACT` în `public/confidentialitate.html`.

## 1. Firebase Hosting
```
npm i -g firebase-tools
firebase login
firebase use --add            # alegi sau creezi proiectul, de ex. „fazan-joc”
npm run build
firebase deploy --only hosting
```
Verifică:
- `https://<proiect>.web.app/` se deschide jocul
- `https://<proiect>.web.app/.well-known/assetlinks.json` întoarce JSON-ul
- `https://<proiect>.web.app/confidentialitate.html` se vede politica

> GitHub Pages (`…github.io/fazan/`) nu merge pentru TWA, pentru că `assetlinks.json` trebuie să fie
> la rădăcina domeniului. Pages poate rămâne pentru teste.

## 2. Generarea pachetului Android
Cea mai simplă variantă: https://www.pwabuilder.com → introduci URL-ul `web.app` → Package for stores
→ Android → Package ID `yo.da.fazan`. Primești:
- `app-release-bundle.aab` (îl urci în Play)
- `signing.keystore` + parolele. **Păstrează-le în siguranță, în afara repo-ului.**
- `assetlinks.json` cu amprenta cheii tale

Alternativa în linie de comandă: `npx @bubblewrap/cli init --manifest https://<proiect>.web.app/manifest.webmanifest`
și apoi `npx @bubblewrap/cli build`.

## 3. Play Console
1. Creezi contul (taxă unică de 25 $, cu verificarea identității).
2. Create app → nume „Fazan”, limba română, Joc, Gratuit.
3. Activezi **Play App Signing** (implicit). Din *Setup → App signing* copiezi **SHA-256** al cheii
   de semnare a aplicației și îl pui în `public/.well-known/assetlinks.json`, în locul
   `INLOCUIESTE_CU_AMPRENTA_SHA256_DIN_PLAY_CONSOLE`. Poți lăsa în listă și amprenta cheii de upload
   de la PWABuilder. Apoi `firebase deploy --only hosting`.
   Fără acest pas, aplicația se deschide cu bara de adresă a browserului.
4. Urci AAB-ul în **Testare închisă** și adaugi cel puțin 12 testeri (prin adresele lor Gmail sau un
   Google Group). Ei trebuie să rămână înscriși 14 zile. Abia apoi poți cere acces în Producție.

## 4. Fișa din magazin
- **Politică de confidențialitate:** `https://<proiect>.web.app/confidentialitate.html`
- **Data safety:** „Nu se colectează date” și „Nu se partajează date” (fără conturi, fără analytics,
  progresul stă local).
- **Reclame:** Nu. **Public țintă:** 13+ sau toate vârstele (dacă alegi sub 13 ani, intri în Families
  Policy, cu cerințe suplimentare).
- **Clasificare de conținut:** chestionarul IARC (un joc de cuvinte, fără violență, fără chat).
- **Grafică:** iconiță 512×512 (`public/icons/icon-512.png`), feature graphic 1024×500 și cel puțin
  2 capturi de ecran de telefon.
- **Descriere:** menționează sursa definițiilor: „Definiții din DEX '98 și DEX '96, prin dexonline.ro (licență GPL)”.

## Când vine modul online
Politica și secțiunea Data safety trebuie actualizate (conturi, Firestore, Firebase Auth) **înainte**
de lansarea versiunii online.
