# Convo – VPWA semestrálny projekt

Convo je progresívna webová aplikácia na textovú komunikáciu v kanáloch podľa [zadania VPWA27](https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md). Autori: Dávid Boldog (`xboldog@stuba.sk`) a Tomáš Bubeník (`xbubenik@stuba.sk`).

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

`/quit` zodpovedá zrušeniu kanála, `/cancel` opusteniu a `/list` načítaniu členov. Príkazy sa parsujú v klientovi a volajú uvedené endpointy. Server používa číselné ID; prototyp frontendu používa reťazcové ID a iné názvy polí (`isPrivate` namiesto `type`, `body` namiesto `content`, `sentAt` namiesto `createdAt`, `fullName` namiesto `firstName` a `lastName`). Pri napojení treba tieto tvary zosúladiť.

Pred otvorením WebSocketu treba cez autorizované API zavolať `POST /account/socket-ticket`. Odpoveď `{ ticket, expiresIn: 30 }` sa použije v adrese `ws://localhost:3333/socket?ticket=<ticket>`. Na odbery a udalosti slúži `Socket` z `@rlanz/socket/client`: vytvoriť ho s `url: 'http://localhost:3333?ticket=<ticket>'` a `autoReconnect: false`, potom zavolať `connect()`, `channel('channels/123')` (s číselným ID kanála) a `subscribe()`. Lístok platí len na jedno spojenie; pri výpadku treba získať nový, vytvoriť nové spojenie, obnoviť odbery a cez HTTP načítať zmeškané správy. Pri návrate zo stavu offline najprv nastaviť `presence: 'online'` cez `PATCH /account/profile`; server offline používateľovi WebSocket nepripojí. Automatické opätovné pripojenie s pôvodnou URL preto nestačí.

Odber `users/:id` doručuje udalosť `invitation`. Odber `channels/:id` vyžaduje členstvo a doručuje `message`, `membership`, `deleted`, `typing` a `draft`. Klient posiela `typing` (boolean) a `draft` (text do 4 000 znakov) cez daný kanál; správu ukladá cez HTTP. Zmena stavu `presence` sa vysiela na úrovni spojenia. Presné cesty a typy udalostí sú v `server/start/routes.ts` a `server/app/channels/`. Notifikácie klient zobrazí iba pri skrytej stránke, podľa `notificationMode`, stavu `dnd` a poľa `mentions` v správe.

Pri nasadení klienta na inú adresu než server nastavte v `server/.env` premennú `CORS_ORIGIN` na adresu klienta. Viac adries možno oddeliť čiarkou; platia pre HTTP aj WebSocket.

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
