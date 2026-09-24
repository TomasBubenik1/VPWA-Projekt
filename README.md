# Convo – VPWA semestrálny projekt

Klikateľný prototyp aplikácie na textovú komunikáciu podľa [zadania VPWA27](https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md). Fáza 1 sa sústreďuje na responzívne používateľské rozhranie pre všetkých 11 prípadov použitia a UML návrh logického dátového modelu. Prototyp používa lokálne demo dáta.

## Fáza 1 – frontendový prototyp

1. **Účty a základná štruktúra:** registrácia, prihlásenie, odhlásenie a responzívny pracovný priestor.
2. **Kanály a členstvo:** zoznam, vytvorenie, verejné pripojenie, súkromné pozvánky, opustenie a zrušenie kanála.
3. **Konverzácia a nastavenia:** správy a príkazy, adresovanie, história, notifikácie, stav používateľa, členovia a písanie.

Detaily dátového modelu a diagram sú v `docs/`.

## Spustenie prototypu

```bash
npm install
```

### Start the app in development mode (HMR, error reporting, etc.)

```bash
npm run dev
```

Všetky ukážkové úkony prebiehajú lokálne v prehliadači. Prihlásenie má predvyplnený demo účet.

## Technológie

- Quasar, Vue 3, TypeScript, Pinia
