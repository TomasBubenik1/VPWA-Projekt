# Convo – VPWA semestrálny projekt

Convo je webová aplikácia na textovú komunikáciu v kanáloch podľa [zadania VPWA27](https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md). Autori: Dávid Boldog (`xboldog@stuba.sk`) a Tomáš Bubeník (`xbubenik@stuba.sk`). Klient už používa skutočné HTTP API a WebSocket. PWA je druhá etapa po prvej prezentácii a potvrdení jej rozsahu; manifest ani service worker zatiaľ nie sú implementované.

## Funkcie

- Registrácia, prihlásenie a odhlásenie používateľov.
- Vytváranie, vyhľadávanie, opúšťanie a rušenie verejných a súkromných kanálov.
- Prijímanie pozvánok a správa členov vrátane príkazov na pozvanie, odobratie, hlasovanie o vylúčení a obnovenie prístupu.
- Odosielanie správ a príkazov, adresovanie používateľov pomocou `@nickname` a postupné načítavanie histórie.
- Upozornenia na správy alebo iba na zmienky, stavy online, nerušiť a offline, zoznam členov a živý náhľad písania.

## Technológie a štruktúra

Frontend používa Vue 3, Quasar a TypeScript. Serverové API a komunikáciu v reálnom čase zabezpečuje AdonisJS. Údaje sa ukladajú do SQLite. Projekt používa jeden koreňový `package-lock.json` a npm workspaces.

- `src/` – obrazovky, komponenty a klientský stav.
- `server/` – API, autentifikácia, komunikácia v reálnom čase a databázové migrácie.
- `docs/dokumentacia/` – projektová dokumentácia v LaTeX-e, diagramy (zdroje Mermaid a SVG v `diagramy/`) a [fyzický dátový model](docs/dokumentacia/assets/fyzicky-model.png).
- `tests/` – testy klientského správania; serverové testy sú v `server/tests/`.
- `src/services/api.ts` – spoločný HTTP klient, Bearer token, validácia a vypršanie relácie.
- `src/stores/workspace.ts` – reaktívny stav účtu a kanálov, história, príkazy a obnova WebSocketu.

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

Frontend otvorte na `http://localhost:9000`. Vývojový server smeruje `/api` a `/socket` na AdonisJS. Dve oddelené karty majú vlastný token v `sessionStorage`; testovať možno aj v dvoch profiloch prehliadača. Klient nemá demo účty. Na začiatku si vytvorte dva vlastné testovacie účty. V PowerShelli používajte `npm.cmd`, ak politika systému blokuje `npm.ps1`.

Produkčné SPA vytvorí `npm run build` v `dist/spa`. Predvolená adresa API je `/api/v1`; hostiteľ musí smerovať `/api` a WebSocket `/socket` na server. Pri oddelenom hostovaní nastavte pred zostavením `QCLI_API_URL=https://server.example/api/v1` (napríklad v koreňovom `.env`) a `CORS_ORIGIN` na serveri. WebSocket používa pôvod adresy API. Token zostáva iba v relácii prehliadača, heslá ani správy klient lokálne neukladá. Rozpísané texty zostávajú len v pamäti do odhlásenia alebo obnovenia stránky.

## Napojenie klienta na server

HTTP API beží na `http://localhost:3333/api/v1`. Registrácia a prihlásenie vracajú `{ user, token }`. Chránené požiadavky posielajú `Authorization: Bearer <token>`. Všetky endpointy vracajú priamo objekt alebo pole; odhlásenie, opustenie, zrušenie a odobratie vracajú stav `204` bez tela. Chyba má tvar `{ message }` alebo pri validácii `{ errors: [{ field, message }] }`. Časy sú v tvare ISO 8601 s časovou zónou.

| Operácia                             | HTTP endpoint                                                                                                                                       | Vstup alebo výsledok                                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Registrácia, prihlásenie, odhlásenie | `POST /auth/signup`, `/auth/login`, `/account/logout`                                                                                               | Registrácia: `firstName`, `lastName`, `nickname`, `email`, `password`, `passwordConfirmation`; prihlásenie: `email`, `password`. |
| Profil a stav                        | `GET/PATCH /account/profile`                                                                                                                        | `presence`: `online`, `dnd`, `offline`; `notificationMode`: `all`, `mentionsOnly`.                                               |
| Kanály                               | `GET /channels`, `GET /channels/discover`, `POST /channels`, `POST /channels/join`                                                                  | Vytvorenie: `{ name, type }`; `/join`: `{ name, type? }`, predvolene verejný.                                                    |
| Členstvo a moderovanie               | `POST /channels/:id/join`, `POST /channels/:id/leave`, `DELETE /channels/:id`, `DELETE /channels/:id/members/:nickname`, `POST /channels/:id/kicks` | Vylúčenie: `{ nickname }`; `/kicks` vracia `{ votes, banned }`.                                                                  |
| Pozvánky a členovia                  | `GET /invitations`, `POST /channels/:id/invitations`, `POST /invitations/:id/accept`, `POST /invitations/:id/decline`, `GET /channels/:id/members`  | Pozvanie: `{ nickname }`; prijatie vracia `{ channelId }`.                                                                       |
| Správy                               | `GET/POST /channels/:id/messages`                                                                                                                   | Odoslanie: `{ content }`, najviac 4 000 znakov. História: `?before=<id>&limit=<1..50>`, výsledok `{ messages, nextCursor }`.     |

`/quit` zodpovedá zrušeniu kanála, `/cancel` opusteniu a `/list` načítaniu členov. Príkazy sa parsujú v klientovi a volajú uvedené endpointy. Deštruktívne príkazy čakajú na potvrdenie. Klient používa priamo číselné ID a serverové polia `type`, `ownerId`, `content`, `createdAt`, `firstName`, `lastName` a `mentions`. Prijatie a odmietnutie pozvánky používa jej vlastné ID. `/revoke` odoberá členstvo, neodvoláva čakajúcu pozvánku.

Pred otvorením WebSocketu treba cez autorizované API zavolať `POST /account/socket-ticket`. Odpoveď `{ ticket, expiresIn: 30 }` sa použije v adrese `ws://localhost:3333/socket?ticket=<ticket>`. Na odbery a udalosti slúži `Socket` z `@rlanz/socket/client`: vytvoriť ho s `url: 'http://localhost:3333?ticket=<ticket>'` a `autoReconnect: false`, potom zavolať `connect()`, `channel('channels/123')` (s číselným ID kanála) a `subscribe()`. Lístok platí len na jedno spojenie; pri výpadku treba získať nový, vytvoriť nové spojenie, obnoviť odbery a cez HTTP načítať zmeškané správy. Pri návrate zo stavu offline najprv nastaviť `presence: 'online'` cez `PATCH /account/profile`; server offline používateľovi WebSocket nepripojí. Automatické opätovné pripojenie s pôvodnou URL preto nestačí.

Odber `users/:id` doručuje udalosť `invitation`. Odber `channels/:id` vyžaduje členstvo a doručuje `message`, `membership`, `deleted`, `typing` a `draft`. Klient posiela `typing` (boolean) a `draft` (text do 4 000 znakov) cez daný kanál; správu ukladá cez HTTP. Zmena stavu `presence` sa vysiela na úrovni spojenia. Presné cesty a typy udalostí sú v `server/start/routes.ts` a `server/app/channels/`. Notifikácie klient zobrazí iba pri skrytej stránke, podľa `notificationMode`, stavu `dnd` a poľa `mentions` v správe.

Pri nasadení klienta na inú adresu než server nastavte v `server/.env` premennú `CORS_ORIGIN` na adresu klienta. Viac adries možno oddeliť čiarkou; platia pre HTTP aj WebSocket.

Klient odoberá osobný kanál a všetky svoje členské kanály. Po strate spojenia získa nový jednorazový lístok a doplní aj viac strán zmeškaných správ. Pripojenie sa označí ako obnovené až po dokončení synchronizácie. Objavené kanály a pozvánky sa navyše obnovujú každých 15 sekúnd, pretože ich niektoré zmeny server globálne nevysiela. Sieťový výpadok má samostatný oznam; používateľský stav offline odpojí živé spojenie.

Systémové upozornenia možno povoliť tlačidlom v nastaveniach. Nová živá správa vyvolá upozornenie iba pri skrytej aplikácii, od iného autora, pri stave online a podľa filtra zmienok. Staršia história upozornenia nevyvoláva. Zamietnuté alebo nepodporované povolenie sa vysvetlí v nastaveniach. Mobilné upozornenia cez service worker patria do neskoršej PWA etapy.

## Overenie

Z koreňového priečinka:

```bash
npm run typecheck
npm test
npm run lint:check
npm run build
npm run typecheck -w convo-server
npm test -w convo-server
npm run lint -w convo-server
npm run build -w convo-server
```

Počas behu lokálneho servera možno spustiť aj `npm run test:integration`. Skúška vytvorí dva jedinečné testovacie účty a overí skutočné HTTP aj WebSocket spojenie vrátane 65 zmeškaných správ, pozvánok, moderovania a obnovenia odberov. Vytvorené kanály pri úspechu zruší; testovacie účty zostávajú v lokálnej databáze. Používajte lokálnu testovaciu databázu. Voliteľná premenná `CONVO_TEST_API` určuje inú adresu testovacieho API.

`npm run test:restart` spustí samostatný lokálny server na porte 3344, uloží správu, reštartuje tento server a overí perzistenciu, nový socket aj obnovenie účtu z tokenu. Vyžaduje pripravený `server/.env` a migrácie; používa lokálnu SQLite databázu a zanechá jeden testovací účet. Spustený vývojový server na porte 3333 nemení.

Výsledok priechodu aplikáciou s tromi používateľmi, vrátane mobilnej šírky, oboch motívov a upozornení, a snímky obrazovky sú v [dokumentácii](docs/dokumentacia/main.tex). PWA sa ešte netestovala.
