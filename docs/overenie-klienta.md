# Overenie klienta Convo – 10. 11. 2026

Klientská implementácia bloku A je pridaná; manuálne prijatie pred prvou prezentáciou ešte nie je uzavreté. PWA čaká na potvrdený rozsah po prvej prezentácii. Automatické výsledky nižšie overujú klientský stav a jeho komunikáciu; nenahrádzajú vizuálne prijatie rozhrania.

## Vykonané skúšky

- Klient: `npm test` – 14 úspešných testov API, relácie, kurzorov, deduplikácie, príkazov, pozvánok, odberov, obnovy, upozornení a mobilných dialógov. Zahŕňa obnovenie účtu z uloženého tokenu a ochranu pred oneskoreným PATCH po odhlásení.
- `npm run test:integration` – úspešný priechod s dvoma nezávislými inštanciami skutočného klientského stavu proti lokálnemu AdonisJS serveru. Použitá rovnaká knižnica Socket ako v prehliadači, žiadna lokálna simulácia správ.
- Server: `npm test -w convo-server` – 10 úspešných testov vrátane trojhlasného vylúčenia a perzistentnej histórie.
- `npm run test:restart` – úspešný reštart samostatného servera na porte 3344, obnovenie socketu s novým lístkom, nová inštancia klienta s uloženým tokenom a načítanie pôvodnej správy zo SQLite po reštarte.
- Klient aj server: typová kontrola, lint a produkčné zostavenie prešli.
- LaTeX dokumentácia sa skompilovala cez `pdflatex`; všetkých 12 strán bolo vyrenderovaných a skontrolovaných. Päť runtime snímok aplikácie zostáva nepriložených.

| Prípad                    | Automatický dôkaz                                                                            | Manuálna skúška rozhrania                                        |
| ------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1. Účet a relácia         | Registrácia, profil, nové prihlásenie, odhlásenie, 401 a vyčistenie tokenu                   | Neoverené                                                        |
| 2. Kanály                 | Vytvorenie verejného/súkromného, objavenie, vstup, odchod a zrušenie                         | Neoverené                                                        |
| 3. Správy a príkazy       | HTTP zápis a živý príjem; parser čaká pri deštruktívnych akciách na potvrdenie               | Neoverené                                                        |
| 4. Pozvanie a moderovanie | Živá pozvánka, prijatie, revoke, kick správcom, obnovenie prístupu; tri hlasy testuje server | Neoverené                                                        |
| 5. Ukončenie členstva     | Odchod člena a zrušenie kanála; odchod správcu overuje server                                | Neoverené                                                        |
| 6. Zmienky                | Serverové pole mentions, prenos cez WebSocket a filter upozornení                            | Neoverené zvýraznenie                                            |
| 7. História               | Kurzorové stránky, koniec pri null, deduplikácia a obnova 65 zmeškaných správ                | Neoverená poloha pri posune                                      |
| 8. Upozornenia            | Pravidlá viditeľnosti, vlastného autora, DND a zmienok                                       | Neoverené skutočné systémové upozornenie a zamietnutie povolenia |
| 9. Dostupnosť             | Offline zavrie socket; online obnoví odbery a dočíta správy; DND zostane pripojené           | Neoverené ovládacie prvky                                        |
| 10. Členovia              | Členovia zo servera a živá zmena členstva                                                    | Neoverené zobrazenie                                             |
| 11. Písanie               | Skutočný draft/typing medzi dvoma účtami, vyčistenie pri skončení a offline                  | Neoverený dialóg náhľadu                                         |

## Zostávajúce kontroly pred prvou prezentáciou

Browserové ovládanie zlyhalo pri navigácii chybou `Cannot read properties of undefined (reading 'timeoutMs')`. Windows Computer Use po obnove hlásil `native pipe is unavailable` (os error 2). Žiadna aktuálna snímka finálneho rozhrania preto nevznikla. Vizuálny výsledok je **neoverený**.

V dvoch oddelených profiloch prejsť celú tabuľku, obnoviť stránku so zachovaním účtu, reštartovať server počas konverzácie a overiť opätovné spojenie. Overiť prepínanie kanálov, zachovanie textu pri chybe a polohy pri načítaní starších správ. Skontrolovať šírku 390 px, desktop, svetlý aj tmavý režim. Povoliť desktopové upozornenia, skryť kartu a overiť autora aj úryvok; zopakovať s DND, filtrom zmienok a zamietnutým povolením.

Do `docs/dokumentacia/assets/` zachytiť päť skutočných snímok: `prihlasenie.png`, `kanaly.png`, `konverzacia.png`, `clenovia.png`, `nastavenia.png`. Dokumentácia už obsahuje ich miesta. Bez čerstvých runtime snímok nemožno potvrdiť zachovanie vzhľadu a responzivity.

## PWA a prezentácia

PWA režim, manifest ani service worker nepridané. Na prvej prezentácii potvrdiť rozsah používania bez siete, správanie po obnove siete, aktualizáciu aplikácie a požadované dôkazy. Výsledky zapísať pred začatím bloku B. Netvrdiť, že používateľský stav offline poskytuje offline PWA.
