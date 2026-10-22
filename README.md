# Web Lab — Laboratorio di sviluppo web

Web Lab è un prototipo didattico in italiano per esercitarsi con HTML e CSS direttamente nel browser.

## Cosa include
- 5 sezioni tematiche: HTML, CSS, Debugging, Replica grafica, Sfide di progettazione.
- 14 esercizi iniziali, con consegne, requisiti e suggerimenti.
- Editor HTML/CSS con anteprima live isolata in un iframe sandbox.
- Verifica di alcuni requisiti tecnici, salvataggio locale, ripristino e download dei file.
- Area docente dimostrativa per aggiungere esercizi personalizzati nel browser corrente.

## Requisiti
- Node.js 20 o successivo consigliato.
- Connessione Internet per scaricare le dipendenze al primo avvio. Il font esterno è facoltativo.

## Avvio sul computer
1. Estrai lo ZIP in una cartella.
2. Installa Node.js da https://nodejs.org se non è già installato.
3. Apri il terminale nella cartella `web-lab`.
4. Esegui:

   ```bash
   npm install
   npm run dev
   ```

5. Apri nel browser l'indirizzo locale mostrato nel terminale, di solito `http://localhost:5173`.

## Pubblicazione su Vercel
Metodo semplice:
1. Crea un account su https://vercel.com.
2. Crea un nuovo repository GitHub e carica i file di questa cartella (puoi usare il sito GitHub, senza usare comandi Git).
3. In Vercel scegli **Add New → Project**, importa il repository.
4. Vercel rileva Vite. Controlla:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Premi **Deploy**. Al termine Vercel fornisce un URL pubblico da condividere con gli studenti.

## Limiti importanti
- I lavori, i progressi e gli esercizi aggiunti dall'area docente sono salvati nel `localStorage` del browser e dispositivo in uso. Non sono inviati alla docente e non si sincronizzano tra dispositivi.
- Gli studenti possono scaricare `index.html` e, se presente, `style.css` e inviarteli per e-mail. Se il browser scarica i due file in una cartella diversa, devono restare insieme per mantenere il collegamento al CSS.
- L'area docente usa un PIN dimostrativo (`1234`), visibile anche nell'interfaccia. **Non è sicura e non protegge davvero i contenuti.** Non inserire dati riservati.
- La verifica automatica è indicativa e non sostituisce la revisione del codice da parte del docente.
- La versione attuale non usa un database, account studente o consegna centralizzata.
- I controlli CSS sono semplici verifiche didattiche; non sono un validatore completo.

## Come aggiungere esercizi
Per questa prima versione, gli esercizi di esempio si trovano in `src/exercises.js`. L'area docente permette di aggiungere tracce personalizzate salvate nel browser corrente. Per rendere un nuovo esercizio disponibile a tutti gli studenti che visitano il sito pubblicato, aggiungilo al file `src/exercises.js` e pubblica nuovamente il progetto.

## Struttura
- `src/App.jsx`: interfaccia e comportamento.
- `src/exercises.js`: sezioni ed esercizi iniziali.
- `src/style.css`: stile responsive.
- `index.html`, `package.json`, `vite.config.js`: configurazione Vite.
