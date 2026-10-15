# Convo – logický dátový model

Model pre prvú fázu podľa [zadania VPWA27](https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md#dátový-model). Zachytáva hlavné pojmy aplikácie a ich vzťahy v UML class diagrame. Databázové kľúče, typy stĺpcov a spojovacie tabuľky sa určia až pri návrhu fyzického modelu v druhej fáze.

- [Mermaid zdroj](data-model.mmd) – možno otvoriť v [Mermaid Live Editore](https://mermaid.live/).
- [JPG na odovzdanie](data-model.jpg).
- [SVG na zväčšovanie](data-model.svg).

## Čo diagram vyjadruje

Používateľ môže byť členom viacerých kanálov, no každý kanál má jedného správcu, ktorý ho vytvoril. Kanál obsahuje správy od svojich členov. Správa môže cez `@nickname` osloviť viacerých používateľov. Pozvánka patrí ku kanálu, má odosielateľa, príjemcu a stav. Kardinality pri čiarach vyjadrujú počet možných účastníkov vzťahu.

Stav používateľa má hodnoty `online`, `dnd`, `offline`; nastavenie upozornení má hodnoty `all`, `mentionsOnly`. Kanál je `public` alebo `private` a pozvánka je `pending`, `accepted` alebo `declined`. Tieto hodnoty sú v diagrame poznámkami, nie samostatnými tabuľkami.

Verejný kanál umožňuje vstup ďalším používateľom. Po troch hlasoch členov môže byť používateľ trvalo vylúčený; správca ho môže vylúčiť priamo alebo mu obnoviť prístup. Diagram ukazuje zákaz vstupu ako vzťah používateľa a kanála. Podrobnosti hlasovania, prihlasovacích relácií a ukladania rozpracovaných správ patria do ďalšej fázy. Kanál zaniká po viac než 30 dňoch bez novej správy a jeho názov sa môže opäť použiť.

## Obnovenie obrázkov

Z koreňa projektu s nainštalovaným Node.js:

```sh
npm exec --yes --package=@mermaid-js/mermaid-cli@12.0.0 -- mmdc -i docs/data-model.mmd -o docs/data-model.svg -b white
npm exec --yes --package=@mermaid-js/mermaid-cli@12.0.0 -- mmdc -i docs/data-model.mmd -o docs/data-model.png -b white --size 2400 -s 2
sips -s format jpeg -s formatOptions 95 docs/data-model.png --out docs/data-model.jpg
```
