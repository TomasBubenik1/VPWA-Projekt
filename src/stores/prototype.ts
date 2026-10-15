import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

// Frontend-only simulation of the VPWA rules, not authentication or a server.
// Source: https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md
export type Presence = 'online' | 'dnd' | 'offline';
export const presenceLabels: Record<Presence, string> = {
  online: 'Online',
  dnd: 'Nerušiť',
  offline: 'Offline',
};
export const presenceColors: Record<Presence, string> = {
  online: 'green-5',
  dnd: 'amber-7',
  offline: 'grey-6',
};
export interface PrototypeUser {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
}
export interface PrototypeMessage {
  id: string;
  nickname: string;
  body: string;
  sentAt: number;
}
export interface PrototypeChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  owner: string;
  members: string[];
  messages: PrototypeMessage[];
  lastActivity: number;
  banned: string[];
  votes: Record<string, string[]>;
}
interface Invitation {
  channelId: string;
  from: string;
  to: string;
}
interface PendingMessage {
  channelId: string;
  to: string;
  message: PrototypeMessage;
}
interface Notice {
  id: string;
  channelId: string;
  from: string;
  body: string;
  sentAt: number;
}
interface Snapshot {
  users: PrototypeUser[];
  channels: PrototypeChannel[];
  invitations: Invitation[];
  statuses: Record<string, Presence>;
  directOnly: Record<string, boolean>;
  pending: PendingMessage[];
  activeId: string;
}

const storageKey = 'convo-prototype-v2';
const sessionKey = 'convo-prototype-session';
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

function seed(): Snapshot {
  const now = Date.now();
  const channels: PrototypeChannel[] = [
    {
      id: 'c-general',
      name: 'general',
      isPrivate: false,
      owner: 'alex',
      members: ['alex', 'mira', 'jules', 'nina'],
      messages: conversation.map(([nickname, body], i) => ({
        id: `seed-${i}`,
        nickname: nickname ?? 'mira',
        body: body ?? '',
        sentAt: now - (conversation.length - i) * 8 * 60_000,
      })),
      lastActivity: now,
      banned: [],
      votes: {},
    },
    {
      id: 'c-design',
      name: 'design-team',
      isPrivate: true,
      owner: 'mira',
      members: ['alex', 'mira', 'jules'],
      messages: [
        {
          id: 'design-1',
          nickname: 'mira',
          body: 'Sem posielajte pripomienky k rozhraniu. Stačí napísať obrazovku a čo by ste zmenili.',
          sentAt: now - 3_600_000,
        },
      ],
      lastActivity: now,
      banned: [],
      votes: {},
    },
    {
      id: 'c-launch',
      name: 'launch-week',
      isPrivate: true,
      owner: 'jules',
      members: ['jules', 'nina'],
      messages: [],
      lastActivity: now,
      banned: [],
      votes: {},
    },
    {
      id: 'c-openlab',
      name: 'open-lab',
      isPrivate: false,
      owner: 'nina',
      members: ['nina', 'mira', 'jules'],
      messages: [],
      lastActivity: now,
      banned: [],
      votes: {},
    },
    {
      id: 'c-coffee',
      name: 'coffee-break',
      isPrivate: false,
      owner: 'mira',
      members: ['mira'],
      messages: [],
      lastActivity: now,
      banned: [],
      votes: {},
    },
  ];
  return {
    users: demoUsers.map((account) => ({ ...account })),
    channels,
    invitations: [{ channelId: 'c-launch', from: 'jules', to: 'alex' }],
    statuses: { alex: 'online', mira: 'online', jules: 'dnd', nina: 'offline' },
    directOnly: {},
    pending: [],
    activeId: 'c-general',
  };
}

function readSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const value = JSON.parse(raw) as Snapshot;
      if (
        Array.isArray(value.users) &&
        Array.isArray(value.channels) &&
        Array.isArray(value.pending) &&
        value.statuses &&
        value.directOnly &&
        Array.isArray(value.invitations)
      )
        return value;
    }
  } catch {
    /* Storage can be unavailable; the prototype still works in memory. */
  }
  return seed();
}
export function mentions(body: string, nickname: string) {
  return (body.match(/@[a-zA-Z][a-zA-Z0-9_]*/g) ?? []).some(
    (item) => item.slice(1).toLowerCase() === nickname.toLowerCase(),
  );
}

export const usePrototypeStore = defineStore('prototype', () => {
  const data = ref(readSnapshot());
  const session = ref('');
  try {
    session.value = sessionStorage.getItem(sessionKey) ?? '';
  } catch {
    /* memory only */
  }
  const user = computed(() => data.value.users.find((item) => item.id === session.value) ?? null);
  const nickname = computed(() => user.value?.nickname ?? '');
  const channels = computed(() => data.value.channels);
  const joinedChannels = computed(() =>
    channels.value.filter((c) => c.members.includes(nickname.value)),
  );
  const activeChannelId = computed({
    get: () => data.value.activeId,
    set: (id: string) => {
      data.value.activeId = id;
    },
  });
  const activeChannel = computed(() =>
    joinedChannels.value.find((c) => c.id === activeChannelId.value),
  );
  const invitations = computed(() => data.value.invitations.filter((i) => i.to === nickname.value));
  const status = computed(() => data.value.statuses[nickname.value] ?? 'online');
  const directOnly = computed({
    get: () => data.value.directOnly[nickname.value] ?? false,
    set: (value: boolean) => {
      data.value.directOnly[nickname.value] = value;
    },
  });
  const notices = ref<Notice[]>([]);
  const feedback = ref('');
  const storageWarning = ref('');
  const typing = ref<{ channelId: string; nickname: string; body: string } | null>(null);
  const drafts = ref<Record<string, string>>({});

  watch(
    data,
    () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data.value));
      } catch {
        storageWarning.value = 'Zmeny zostávajú iba v pamäti. Prehliadač ich nedokáže uložiť.';
      }
    },
    { deep: true },
  );

  function selectChannel(id: string) {
    activeChannelId.value = id;
    typing.value = null;
  }
  function requireUser() {
    if (!user.value) throw new Error('Najprv sa prihláste.');
    return nickname.value;
  }
  function requireChannel(id = activeChannelId.value) {
    const actor = requireUser();
    const channel = channels.value.find((c) => c.id === id && c.members.includes(actor));
    if (!channel) throw new Error('Najprv sa pripojte ku kanálu.');
    return channel;
  }
  function repairSelection() {
    if (!activeChannel.value) activeChannelId.value = joinedChannels.value[0]?.id ?? '';
  }
  function removeChannel(id: string) {
    data.value.channels = channels.value.filter((c) => c.id !== id);
    data.value.invitations = data.value.invitations.filter((i) => i.channelId !== id);
    data.value.pending = data.value.pending.filter((p) => p.channelId !== id);
    typing.value = null;
    repairSelection();
  }
  function expireInactiveChannels() {
    channels.value
      .filter((c) => c.lastActivity < Date.now() - 30 * 86400_000)
      .forEach((c) => removeChannel(c.id));
  }
  function createChannel(name: string, isPrivate = false) {
    const actor = requireUser();
    expireInactiveChannels();
    const clean = name.trim().replace(/^#/, '').toLowerCase();
    if (!/^[a-z][a-z0-9_-]{2,63}$/.test(clean))
      throw new Error('Názov musí mať 3 až 64 znakov, začínať písmenom a neobsahovať medzery.');
    if (channels.value.some((c) => c.name.toLowerCase() === clean))
      throw new Error('Tento názov kanála je už obsadený.');
    const channel: PrototypeChannel = {
      id: crypto.randomUUID(),
      name: clean,
      isPrivate,
      owner: actor,
      members: [actor],
      messages: [],
      lastActivity: Date.now(),
      banned: [],
      votes: {},
    };
    data.value.channels.push(channel);
    selectChannel(channel.id);
    return channel;
  }
  function joinPublic(id: string) {
    const actor = requireUser();
    expireInactiveChannels();
    const channel = channels.value.find((c) => c.id === id);
    if (!channel) throw new Error('Kanál už neexistuje.');
    if (channel.banned.includes(actor))
      throw new Error('Máte zakázaný prístup. Obnoviť ho môže správca pozvánkou.');
    if (!channel.members.includes(actor)) {
      if (channel.isPrivate) throw new Error('Do súkromného kanála potrebujete pozvánku.');
      channel.members.push(actor);
    }
    selectChannel(id);
  }
  function inviteMember(target: string, id = activeChannelId.value) {
    const channel = requireChannel(id);
    const to = target.replace(/^@/, '').trim().toLowerCase();
    if (!data.value.users.some((u) => u.nickname === to))
      throw new Error('Používateľ s touto prezývkou neexistuje.');
    if (channel.isPrivate && channel.owner !== nickname.value)
      throw new Error('Pozývať môže iba správca súkromného kanála.');
    if (channel.members.includes(to)) throw new Error('Používateľ už je členom kanála.');
    if (channel.banned.includes(to)) {
      if (channel.owner !== nickname.value) throw new Error('Ban môže zrušiť iba správca.');
      channel.banned = channel.banned.filter((n) => n !== to);
      delete channel.votes[to];
    }
    if (data.value.invitations.some((i) => i.channelId === id && i.to === to))
      throw new Error('Pozvánka už čaká na prijatie.');
    data.value.invitations.push({ channelId: id, from: nickname.value, to });
    feedback.value = `Pozvánka pre @${to} je pripravená.`;
  }
  function acceptInvitation(id: string) {
    expireInactiveChannels();
    const invite = invitations.value.find((i) => i.channelId === id);
    const channel = channels.value.find((c) => c.id === id);
    if (!invite || !channel || channel.banned.includes(nickname.value))
      throw new Error('Pozvánka už nie je platná.');
    if (!channel.members.includes(nickname.value)) channel.members.push(nickname.value);
    declineInvitation(id);
    selectChannel(id);
  }
  function declineInvitation(id: string) {
    data.value.invitations = data.value.invitations.filter(
      (i) => i.channelId !== id || i.to !== nickname.value,
    );
  }
  function leaveChannel(id: string) {
    const channel = requireChannel(id);
    if (channel.owner === nickname.value) removeChannel(id);
    else {
      channel.members = channel.members.filter((n) => n !== nickname.value);
      repairSelection();
    }
  }
  function moderate(target: string, kind: 'kick' | 'revoke') {
    const channel = requireChannel();
    const to = target.replace(/^@/, '').toLowerCase();
    if (to === nickname.value) throw new Error('Na opustenie kanála použite /cancel.');
    if (to === channel.owner) throw new Error('Správcu kanála nie je možné vyradiť.');
    if (kind === 'revoke' && (!channel.isPrivate || channel.owner !== nickname.value))
      throw new Error('/revoke môže použiť iba správca súkromného kanála.');
    if (kind === 'kick' && channel.isPrivate)
      throw new Error('V súkromnom kanáli použite /revoke.');
    if (!channel.members.includes(to)) {
      if (
        kind === 'revoke' &&
        data.value.invitations.some((i) => i.channelId === channel.id && i.to === to)
      ) {
        data.value.invitations = data.value.invitations.filter(
          (i) => i.channelId !== channel.id || i.to !== to,
        );
        feedback.value = `Pozvánka pre @${to} bola odobratá.`;
        return;
      }
      throw new Error('Používateľ nie je členom tohto kanála.');
    }
    if (kind === 'kick' && channel.owner !== nickname.value) {
      const votes = channel.votes[to] ?? [];
      if (votes.includes(nickname.value))
        throw new Error('Za vyradenie tohto člena ste už hlasovali.');
      channel.votes[to] = [...votes, nickname.value];
      if (channel.votes[to].length < 3) {
        feedback.value = `Hlas uložený: ${channel.votes[to].length} z 3 pre @${to}.`;
        return;
      }
    }
    channel.members = channel.members.filter((n) => n !== to);
    if (kind === 'kick') channel.banned.push(to);
    data.value.invitations = data.value.invitations.filter(
      (i) => i.channelId !== channel.id || i.to !== to,
    );
    if (typing.value?.nickname === to) typing.value = null;
    feedback.value =
      kind === 'kick' ? `@${to} má zakázaný prístup do kanála.` : `Členstvo @${to} bolo odobraté.`;
  }
  function sendMessage(body: string) {
    const channel = requireChannel();
    if (status.value === 'offline') throw new Error('Na odoslanie správy sa prepnite online.');
    const clean = body.trim();
    if (!clean) return;
    if (clean.length > 4000) throw new Error('Správa môže mať najviac 4 000 znakov.');
    channel.messages.push({
      id: crypto.randomUUID(),
      nickname: nickname.value,
      body: clean,
      sentAt: Date.now(),
    });
    channel.lastActivity = Date.now();
    drafts.value[channel.id] = '';
  }
  function receiveDemoMessage(from: string, body: string, visible: boolean) {
    const channel = requireChannel();
    if (!channel.members.includes(from) || from === nickname.value)
      throw new Error('Vyberte iného člena kanála.');
    if (!body.trim()) throw new Error('Zadajte text ukážkovej správy.');
    const message = {
      id: crypto.randomUUID(),
      nickname: from,
      body: body.trim(),
      sentAt: Date.now(),
    };
    channel.lastActivity = message.sentAt;
    if (status.value === 'offline') {
      data.value.pending.push({ channelId: channel.id, to: nickname.value, message });
      return 'Správa čaká na návrat online.';
    }
    channel.messages.push(message);
    if (visible) return 'Správa doručená. Viditeľná aplikácia nevystavuje notifikáciu.';
    if (status.value === 'dnd') return 'Správa doručená. DND potlačil notifikáciu.';
    if (directOnly.value && !mentions(body, nickname.value))
      return 'Správa doručená. Filter potlačil neadresovanú notifikáciu.';
    notices.value.unshift({
      id: message.id,
      channelId: channel.id,
      from,
      body: message.body.slice(0, 120),
      sentAt: message.sentAt,
    });
    return 'Upozornenie zobrazené.';
  }
  function setStatus(value: Presence) {
    requireUser();
    data.value.statuses[nickname.value] = value;
    if (value === 'offline') typing.value = null;
    if (value !== 'offline') {
      const waiting = data.value.pending.filter((p) => p.to === nickname.value);
      waiting.forEach((p) => {
        const c = joinedChannels.value.find((c) => c.id === p.channelId);
        if (c) c.messages.push(p.message);
      });
      data.value.pending = data.value.pending.filter((p) => p.to !== nickname.value);
      if (waiting.length)
        feedback.value = `Kanály aktualizované. Doručené správy: ${waiting.length}.`;
    }
  }
  function setDemoDraft(from: string, body: string) {
    const channel = requireChannel();
    if (status.value === 'offline' || !channel.members.includes(from) || from === nickname.value) {
      typing.value = null;
      return;
    }
    typing.value = body ? { channelId: channel.id, nickname: from, body } : null;
  }
  function processChannelCommand(command: string): 'members' | 'leave' | 'destroy' | 'done' {
    const [name, argument, modifier, extra] = command.trim().split(/\s+/);
    if (name === '/join') {
      if (!argument || extra || (modifier && modifier !== 'private'))
        throw new Error('Použite /join názov [private].');
      expireInactiveChannels();
      const clean = argument.replace(/^#/, '').toLowerCase();
      const existing = channels.value.find((c) => c.name.toLowerCase() === clean);
      if (existing) {
        if (modifier) throw new Error('Názov kanála už existuje.');
        joinPublic(existing.id);
      } else createChannel(clean, modifier === 'private');
      return 'done';
    }
    const channel = requireChannel();
    if (['/list', '/cancel', '/quit'].includes(name ?? '')) {
      if (argument) throw new Error('Tento príkaz nemá argumenty.');
      if (name === '/list') return 'members';
      if (name === '/quit' && channel.owner !== nickname.value)
        throw new Error('Kanál môže zrušiť iba správca.');
      return name === '/quit' ? 'destroy' : 'leave';
    }
    if (!argument || modifier)
      throw new Error('Použite /invite prezývka, /revoke prezývka alebo /kick prezývka.');
    if (name === '/invite') inviteMember(argument);
    else if (name === '/revoke' || name === '/kick')
      moderate(argument, name === '/kick' ? 'kick' : 'revoke');
    else throw new Error('Neznámy príkaz. Otvorte prehľad príkazov pod poľom správy.');
    return 'done';
  }
  function activate(account: PrototypeUser) {
    session.value = account.id;
    try {
      sessionStorage.setItem(sessionKey, account.id);
    } catch {
      /* memory only */
    }
    typing.value = null;
    notices.value = [];
    drafts.value = {};
    feedback.value = '';
    expireInactiveChannels();
    repairSelection();
    setStatus(data.value.statuses[account.nickname] ?? 'online');
  }
  function signIn(email: string, password: string) {
    if (password.length < 8) throw new Error('Pre prototyp zadajte aspoň 8 znakov hesla.');
    const account = data.value.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!account) throw new Error('Účet neexistuje. Zaregistrujte sa alebo použite demo účet.');
    activate(account);
  }
  function signUp(input: {
    fullName: string;
    nickname: string;
    email: string;
    password: string;
    confirmation: string;
  }) {
    if (input.fullName.trim().split(/\s+/).length < 2)
      throw new Error('Zadajte meno aj priezvisko.');
    if (!/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/.test(input.nickname))
      throw new Error('Prezývka musí mať 3 až 32 znakov a začínať písmenom.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Zadajte platný e-mail.');
    if (
      data.value.users.some(
        (u) =>
          u.nickname === input.nickname.toLowerCase() ||
          u.email.toLowerCase() === input.email.toLowerCase(),
      )
    )
      throw new Error('Prezývka alebo e-mail je už obsadený.');
    if (input.password.length < 8) throw new Error('Heslo musí mať aspoň 8 znakov.');
    if (input.password !== input.confirmation) throw new Error('Heslá sa nezhodujú.');
    const account = {
      id: crypto.randomUUID(),
      fullName: input.fullName.trim(),
      nickname: input.nickname.toLowerCase(),
      email: input.email.trim(),
    };
    // Deliberately never persist passwords in a frontend prototype.
    data.value.users.push(account);
    activate(account);
  }
  function signOut() {
    session.value = '';
    typing.value = null;
    drafts.value = {};
    notices.value = [];
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      /* memory only */
    }
  }
  return {
    data,
    user,
    nickname,
    channels,
    joinedChannels,
    activeChannelId,
    activeChannel,
    invitations,
    status,
    directOnly,
    notices,
    feedback,
    storageWarning,
    typing,
    drafts,
    selectChannel,
    createChannel,
    joinPublic,
    inviteMember,
    acceptInvitation,
    declineInvitation,
    leaveChannel,
    moderate,
    sendMessage,
    receiveDemoMessage,
    setStatus,
    setDemoDraft,
    processChannelCommand,
    expireInactiveChannels,
    signIn,
    signUp,
    signOut,
    activate,
  };
});
