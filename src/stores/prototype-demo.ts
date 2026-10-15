import { makeChannel } from './prototype-model.ts';
import type { PrototypeUser, Snapshot } from './prototype-model';

export const demoUsers: PrototypeUser[] = [
  { id: 'alex', fullName: 'Alex Kováč', nickname: 'alex', email: 'alex@convo.app' },
  { id: 'mira', fullName: 'Mira Novotná', nickname: 'mira', email: 'mira@convo.app' },
  { id: 'jules', fullName: 'Júlia Šimková', nickname: 'jules', email: 'jules@convo.app' },
  { id: 'nina', fullName: 'Nina Poláková', nickname: 'nina', email: 'nina@convo.app' },
];
const conversation = [
  ['mira', 'Ahojte, návrh rozhrania je pripravený na spoločné prejdenie.'],
  ['jules', 'Pozrela som mobilnú verziu. Zoznam kanálov by som nechala v bočnom paneli.'],
  ['alex', 'Súhlasím. Správy tak budú mať viac miesta.'],
  ['nina', 'K registrácii som doplnila chybové stavy a potvrdenie hesla.'],
  ['mira', 'V súkromných kanáloch ešte skontrolujme oprávnenia správcu.'],
  ['alex', 'Doplním aj dialóg pred zrušením kanála.'],
  ['jules', 'História by mala pri načítaní starších správ zostať na rovnakom mieste.'],
  ['nina', 'Vyskúšala som to na telefóne. Pole na správu zostáva dostupné.'],
  ['mira', 'Zajtra môžeme prejsť scenáre k odovzdaniu.'],
  ['alex', 'Pripravím zoznam príkazov priamo v aplikácii.'],
  ['jules', 'Na prezentácii ukážme aj rozdiel medzi DND a offline.'],
  ['nina', 'A pozvánku do súkromného kanála, tú sa oplatí predviesť.'],
  ['alex', 'Dnes sa sústreďme na posledné detaily prototypu.'],
  ['mira', 'Zjednotila som medzery a veľkosti textu. Na mobile sa to číta oveľa lepšie.'],
  ['jules', 'Dátový model prejdem poobede. Máme tam aj hlasy na vyradenie člena?'],
  ['nina', 'Áno, tri hlasy od rôznych členov. Správca môže prístup odobrať hneď.'],
  ['mira', '@alex pozrieš ešte klávesnicu a odosielanie cez Enter?'],
  ['alex', 'Jasné. Shift + Enter nechám na nový riadok.'],
  ['jules', 'Pridala som pripomienky do kanála design-team.'],
  ['nina', 'Poďme to zajtra skúsiť celé, od registrácie po poslednú správu.'],
  ['mira', 'Dohodnuté. Stretneme sa o 10:00 v škole?'],
  ['jules', 'Za mňa platí, donesiem aj poznámky z cvičenia.'],
  ['nina', '@alex keď budeš mať hotové príkazy, napíš sem. Prejdem ich s tebou.'],
  ['mira', 'Zatiaľ ďakujem všetkým. Máme to pekne rozdelené.'],
];

export function createDemoSnapshot(): Snapshot {
  const now = Date.now();
  return {
    users: demoUsers.map((user) => ({ ...user })),
    channels: [
      {
        ...makeChannel('general', 'alex', false, 'c-general'),
        members: demoUsers.map((user) => user.nickname),
        messages: conversation.map(([nickname, body], index) => ({
          id: `seed-${index}`,
          nickname: nickname ?? 'mira',
          body: body ?? '',
          sentAt: now - (conversation.length - index) * 8 * 60_000,
        })),
      },
      {
        ...makeChannel('design-team', 'mira', true, 'c-design'),
        members: ['alex', 'mira', 'jules'],
        messages: [
          {
            id: 'design-1',
            nickname: 'mira',
            body: 'Sem posielajte pripomienky k rozhraniu. Stačí napísať obrazovku a čo by ste zmenili.',
            sentAt: now - 3_600_000,
          },
        ],
      },
      { ...makeChannel('launch-week', 'jules', true, 'c-launch'), members: ['jules', 'nina'] },
      {
        ...makeChannel('open-lab', 'nina', false, 'c-openlab'),
        members: ['nina', 'mira', 'jules'],
      },
      makeChannel('coffee-break', 'mira', false, 'c-coffee'),
    ],
    invitations: [{ channelId: 'c-launch', from: 'jules', to: 'alex' }],
    statuses: { alex: 'online', mira: 'online', jules: 'dnd', nina: 'offline' },
    directOnly: {},
    pending: [],
    activeId: 'c-general',
  };
}
