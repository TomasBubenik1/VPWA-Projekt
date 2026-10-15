# Convo – VPWA semestrálny projekt

Klikateľný prototyp aplikácie na textovú komunikáciu podľa [zadania VPWA27](https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md). Fáza 1 sa sústreďuje na responzívne používateľské rozhranie pre všetkých 11 prípadov použitia a UML návrh logického dátového modelu. Prototyp používa lokálne demo dáta.

## Fáza 1 – frontendový prototyp

1. **Účty a základná štruktúra:** registrácia, prihlásenie, odhlásenie a responzívny pracovný priestor.
2. **Kanály a členstvo:** zoznam, vytvorenie, verejné pripojenie, súkromné pozvánky, opustenie a zrušenie kanála.
3. **Konverzácia a nastavenia:** správy a príkazy, adresovanie, história, notifikácie, stav používateľa, členovia a písanie.

UML logický model v JPG/JPEG treba doplniť ako samostatný výstup prvej fázy.

## Spustenie prototypu

```bash
npm install
```

### Start the app in development mode (HMR, error reporting, etc.)

```bash
npm run dev
```

Všetky ukážkové úkony prebiehajú lokálne v prehliadači. Prihlásenie má predvyplnený demo účet. V paneli **Vyskúšať scenáre** môžete prepínať demo účty, doručovať správy, simulovať skrytú aplikáciu a spustiť živý náhľad písania. Prototyp neobsahuje serverovú autentifikáciu; heslá sa neukladajú.

## Overenie

```bash
npm run typecheck
npm test
npm run lint:check
npm run build
```

## Technológie

- Quasar, Vue 3, TypeScript

## Stav prototypu

Zdieľaný stav používa Vue `reactive()` bez ďalšej knižnice. Komponenty ho získajú cez
`usePrototypeStore()`. Rovnaká inštancia zabezpečuje okamžité aktualizácie celej aplikácie.

- `src/stores/prototype.ts`: reaktívny stav, účty, kanály, príkazy a demo komunikácia.
- `src/stores/prototype-model.ts`: dátové typy, stavy používateľov a vytváranie záznamov.
- `src/stores/prototype-demo.ts`: úvodné demo účty, kanály a správy.

Ukladanie používa pôvodné kľúče a formát, takže existujúce demo dáta zostávajú dostupné.
Testy vytvárajú samostatné inštancie cez `createPrototypeStore()` a po použití ich uvoľnia
pomocou `dispose()`.

Zachované sú scenáre 1–11 zadania: účty, zoznam a správa kanálov, správy a príkazy,
verejné/súkromné členstvo a moderovanie, opustenie kanála, adresovanie správ, história,
notifikácie, online/DND/offline, zoznam členov a živý náhľad písania. Pre prvú fázu ide
o lokálnu simuláciu; backend, databáza a nasadenie PWA patria do finálnej fázy.
