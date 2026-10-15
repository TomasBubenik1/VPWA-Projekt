# Convo – logický dátový model

Model pre prvú fázu podľa [zadania VPWA27](https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md#dátový-model). Ide o návrh budúcej relačnej databázy; aktuálny frontend naďalej používa lokálne demo dáta.

- [Mermaid zdroj](data-model.mmd) – vložiť celý obsah do [Mermaid Live Editora](https://mermaid.live/).
- [JPG na odovzdanie](data-model.jpg).
- [SVG na zväčšovanie](data-model.svg).

Použitá je [UML notácia Mermaid classDiagram](https://mermaid.js.org/syntax/classDiagram.html). PK označuje primárny kľúč, FK odkaz na id inej entity, UQ unikátnosť. Model používa konkrétne databázové typy a názvy stĺpcov v snake_case, aby bol blízky budúcim migráciám. Stále ide o návrh, nie o vytvorenú databázu; frontend sa nemení.

## Databázové typy

- `INT`: automaticky generované id a všetky cudzie kľúče. Referenčný aj cieľový stĺpec majú rovnaký typ.
- `VARCHAR(n)`: text s maximálnou dĺžkou. Meno a priezvisko majú po 100 znakov, nickname 32, e-mail 254, hash hesla 255 a názov kanála 64. Limity prezývky a názvu kanála zodpovedajú existujúcej validácii; ostatné sú návrhové limity pre backend.
- `TEXT`: obsah správy.
- `TIMESTAMP`: čas vytvorenia, vstupu alebo odpovede; časy spracúvame a ukladáme jednotne v UTC. `created_at` a `joined_at` majú predvolenú hodnotu aktuálny čas, `responded_at` má predvolenú hodnotu `NULL`.
- `ENUM`: iba jedna z explicitne uvedených hodnôt. Nejde o ľubovoľný text ani o samostatnú tabuľku. Nepoužívame vlastné abstraktné názvy ako PresenceMode.

Všetky stĺpce sú `NOT NULL`, iba `Invitation.responded_at` môže byť `NULL`. Zápis `#40;` a `#41;` v Mermaid zdroji vykreslí zátvorky, napríklad `VARCHAR(32)`, bez toho, aby ich Mermaid považoval za UML metódu.

Konkrétny databázový systém ešte nie je vybraný. Pri [MySQL](https://dev.mysql.com/doc/refman/8.4/en/enum.html) možno ENUM definovať priamo pri stĺpci; [PostgreSQL](https://www.postgresql.org/docs/current/datatype-enum.html) pre natívny ENUM vyžaduje vytvoriť pomenovaný typ a priradiť ho stĺpcu. Hodnoty a význam zostanú rovnaké. Presná SQL syntax, generovanie id a časové typy sa prispôsobia vybranému systému v migráciách.

## Entity a väzby

| Entita            | Význam                                                 |
| ----------------- | ------------------------------------------------------ |
| User              | Účet, hash hesla a používateľské nastavenia.           |
| Channel           | Verejný alebo súkromný kanál s jedným správcom.        |
| ChannelMembership | Aktuálne členstvo používateľa v kanáli.                |
| Message           | Správa v kanáli s autorom a časom odoslania.           |
| MessageMention    | Jeden adresát označený v správe cez @nickname.         |
| Invitation        | Pozvánka do kanála, jej odosielateľ, príjemca a stav.  |
| KickVote          | Jeden hlas aktuálneho člena za vyradenie iného člena.  |
| ChannelBan        | Trvalý zákaz vstupu používateľa do konkrétneho kanála. |

Každá entita má vlastné id. Členstvo realizuje vzťah M:N medzi používateľmi a kanálmi; MessageMention realizuje M:N medzi správami a označenými používateľmi. Všetky cudzie kľúče majú v diagrame pomenovanú väzbu s násobnosťou. Existujúci kanál má aspoň jedného člena, pretože jeho správca je vždy členom; odchod správcu kanál ruší.

## ENUM hodnoty a unikátnosť

| Stĺpec                 | Povolené hodnoty ENUM                  | Predvolená hodnota |
| ---------------------- | -------------------------------------- | ------------------ |
| User.preferred_status  | online, dnd, offline                   | online             |
| User.notification_mode | all, mentions_only                     | all                |
| Channel.type           | public, private                        | public             |
| Invitation.status      | pending, accepted, declined, cancelled | pending            |

- nickname, email a názov existujúceho kanála sú unikátne. Jedinečný e-mail je návrhové rozhodnutie pre prihlasovanie. Identifikátory sa pred porovnávaním normalizujú; rozdiel vo veľkosti písmen nevytvorí nový účet alebo kanál.
- ChannelMembership: jedinečný pár user_id + channel_id.
- MessageMention: jedinečný pár message_id + user_id, aj keď sa rovnaký nick v texte opakuje.
- KickVote: jedinečná trojica channel_id + voter_id + target_user_id.
- ChannelBan: jedinečný pár channel_id + user_id.
- Invitation: najviac jedna pending pozvánka pre channel_id + invitee_id. Vybavené pozvánky môžu zostať v histórii; nejde o bezpodmienečnú unikátnosť tohto páru.

## Pravidlá životného cyklu

1. Pri vytvorení kanála sa tvorca stane správcom aj členom. Správca je určený cez owner_id; rolu neopakujeme v členstve.
2. Do verejného kanála vstúpi používateľ bez banu cez /join. Do súkromného pozýva iba správca, do verejného môže pozývať každý člen. Pozývať seba alebo aktuálneho člena nemá význam a aplikácia takú pozvánku nevytvorí.
3. Prijatie pending pozvánky vytvorí členstvo, nastaví accepted a responded_at. Odmietnutie nastaví declined a responded_at. Stav cancelled znamená zneplatnenie pozvánky, napríklad pri samostatnom vstupe do verejného kanála alebo pri udelení banu; responded_at zostane prázdny. Nevytvárame tým nový príkaz ani UI funkciu.
4. /revoke odoberie člena súkromného kanála na pokyn správcu. Nevytvára trvalý ban a nesúvisí so stavom cancelled pozvánky. Správca seba neodoberá cez /revoke; použije /cancel alebo /quit.
5. Správu odošle iba aktuálny člen kanála. Označenie sa pri odoslaní viaže na existujúceho člena rovnakého kanála. Ukladá sa jeho id, aby zmena prezývky nestratila väzbu. Autor aj adresát môžu neskôr odísť; historické správy a označenia zostávajú.
6. Hlasovať za vyradenie možno iba vo verejnom kanáli. Hlasujúci aj cieľ musia byť aktuálni členovia, nemôže ísť o tú istú osobu a cieľ nesmie byť správca. Tri hlasy rôznych aktuálnych členov spôsobia vznik banu a odstránenie členstva cieľa. Správca verejného kanála môže cez /kick udeliť ban priamo.
7. Pri ukončení členstva z akéhokoľvek dôvodu sa v danom kanáli odstránia hlasy od odchádzajúceho používateľa aj hlasy proti nemu. Po návrate sa staré hlasovanie neobnoví. Toto aj ochrana správcu sú doplňujúce návrhové pravidlá.
8. Ban blokuje /join aj prijatie staršej pozvánky. Pri jeho udelení sa pending pozvánky cieľa zneplatnia. Správca verejného kanála môže cez /invite ban odstrániť a vystaviť novú pozvánku; bežný člen ban neobíde. Členstvo a ban pre rovnaký pár používateľ–kanál nesmú existovať súčasne.
9. /cancel bežného člena zruší jeho členstvo a ponechá správy. /cancel správcu a /quit správcu fyzicky odstránia kanál. Rovnaké odstránenie nastane po viac než 30 dňoch bez novej správy. Aktivita sa počíta z posledného Message.created_at, pri prázdnom kanáli z Channel.created_at; vstup, pozvánka ani písanie čas neobnovujú.
10. S kanálom sa odstránia jeho správy, členstvá, pozvánky, hlasy a bany; so správami aj ich MessageMention. Používateľské účty ostávajú. Názov kanála sa uvoľní a prípadný nový kanál dostane nové id. Fyzické mazanie je zvolený spôsob splnenia zániku kanála zo zadania.
11. V druhej fáze musia súvisiace zmeny prebehnúť atomicky: napríklad prijatie pozvánky s vytvorením členstva, dosiahnutie troch hlasov s banom alebo zrušenie kanála. Pravidlá medzi viacerými entitami nemožno zabezpečiť iba jednotlivými cudzími kľúčmi.

## Dočasné údaje a nastavenia

preferred_status je zvolený režim, nie dôkaz aktívneho pripojenia. Skutočnú dostupnosť určuje aj pripojenie k serveru. Offline znamená odpojenie od doručovania správ; po návrate sa história načíta z Message. DND potláča notifikácie, ale umožňuje doručovanie správ. notification_mode určuje, či sa upozorňuje na všetky správy alebo iba adresované. Upozornenie sa vystaví iba pri skrytej aplikácii a pri povolenom režime.

Informácia o písaní a živý rozpísaný text sú dočasný stav komunikácie cez socket. Model nepotrebuje tabuľky pre ne, pre príkazy, workspace ani pre históriu systémových notifikácií. Spôsob autentifikácie, relácie alebo tokeny sa vyberú pri implementácii backendu.

## Pokrytie zadania

| Prípad použitia                              | Opora v modeli                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1. Registrácia, prihlásenie, odhlásenie      | User; autentifikačná relácia je detail druhej fázy.                                     |
| 2. Zoznam a správa kanálov                   | Channel, ChannelMembership, Invitation.                                                 |
| 3. Správy a príkazy                          | Message a operácie nad príslušnými entitami.                                            |
| 4. Vytvorenie, pozvanie, vyradenie, zrušenie | Channel, ChannelMembership, Invitation, KickVote, ChannelBan.                           |
| 5. Opustenie kanála                          | ChannelMembership a pravidlo odchodu správcu.                                           |
| 6. Adresovanie správ                         | MessageMention.                                                                         |
| 7. História                                  | Message s created_at a id na stabilné stránkovanie.                                     |
| 8. Notifikácie                               | User.notification_mode, Message, MessageMention; viditeľnosť aplikácie je dočasný stav. |
| 9. Online, DND, offline                      | User.preferred_status a aktuálne pripojenie.                                            |
| 10. Zoznam členov                            | ChannelMembership a User.                                                               |
| 11. Písanie a živý náhľad                    | Dočasný stav socketu, bez perzistentnej entity.                                         |

## Obnovenie exportov

Z koreňa projektu s nainštalovaným Node.js:

```sh
npm exec --yes --package=@mermaid-js/mermaid-cli@12.0.0 -- mmdc -i docs/data-model.mmd -o docs/data-model.svg -b white
npm exec --yes --package=@mermaid-js/mermaid-cli@12.0.0 -- mmdc -i docs/data-model.mmd -o docs/data-model.png -b white --size 2400 -s 2
sips -s format jpeg -s formatOptions 95 docs/data-model.png --out docs/data-model.jpg
```

Posledný príkaz používa macOS sips. Na inom systéme skonvertujte PNG na JPEG v grafickom editore. Mermaid CLI je nástroj na dokumentáciu spustený cez npm cache, nie závislosť aplikácie. Zdrojový .mmd súbor je hlavný podklad; pri jeho zmene treba obnoviť aj exporty.
