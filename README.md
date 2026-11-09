# Convo – VPWA semestrálny projekt

Convo je progresívna webová aplikácia na textovú komunikáciu v kanáloch podľa [zadania VPWA27](https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md). Autori: Dávid Boldog (`xboldog@stuba.sk`) a Tomáš Bubeník (`xbubenik@stuba.sk`).

## Funkcie

- Registrácia, prihlásenie a odhlásenie používateľov.
- Vytváranie, vyhľadávanie, opúšťanie a rušenie verejných a súkromných kanálov.
- Prijímanie pozvánok a správa členov vrátane príkazov na pozvanie, odobratie, hlasovanie o vylúčení a obnovenie prístupu.
- Odosielanie správ a príkazov, adresovanie používateľov pomocou `@nickname` a postupné načítavanie histórie.
- Upozornenia na správy alebo iba na zmienky, stavy online, nerušiť a offline, zoznam členov a živý náhľad písania.
- Inštalácia aplikácie ako PWA a používanie jej rozhrania aj bez sieťového spojenia.

## Technológie a štruktúra

Frontend používa Vue 3, Quasar a TypeScript. Serverové API a komunikáciu v reálnom čase zabezpečuje AdonisJS. Údaje sa ukladajú do SQLite. Projekt používa jeden koreňový `package-lock.json` a npm workspaces.

- `src/` – obrazovky, komponenty a klientský stav.
- `server/` – API, autentifikácia, komunikácia v reálnom čase a databázové migrácie.
- `docs/` – [dátový model](docs/data-model.md) a projektová dokumentácia.
- `tests/` – testy klientského správania.

## Inštalácia a spustenie

Potrebný je Node.js 24 alebo novší. V koreňovom priečinku nainštalujte závislosti a spustite frontend:

```bash
npm ci
npm run dev
```

Pri prvom spustení servera vytvorte lokálnu konfiguráciu, vygenerujte kľúč a spustite migrácie. Server potom spustite v druhom termináli:

```bash
cp server/.env.example server/.env
cd server
node ace generate:key
node ace migration:run
npm run dev
```

Server počúva na `http://localhost:3333` a databázu SQLite ukladá do `server/tmp/db.sqlite3`.

## Overenie

Z koreňového priečinka:

```bash
npm run typecheck
npm test
npm run lint:check
npm run build
npm run build -w convo-server
npm run lint -w convo-server
```
