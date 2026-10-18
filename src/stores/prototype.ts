import { effectScope, reactive, watch } from 'vue';
import { createDemoSnapshot } from './prototype-demo.ts';
import { makeChannel, makeMessage } from './prototype-model.ts';
import type {
  Presence,
  PrototypeUser,
  PrototypeChannel,
  Invitation,
  Notice,
  Snapshot,
} from './prototype-model.ts';

export { demoUsers } from './prototype-demo.ts';
export { presenceLabels, presenceColors } from './prototype-model.ts';
export type {
  Presence,
  PrototypeUser,
  PrototypeMessage,
  PrototypeChannel,
} from './prototype-model.ts';

// Frontend simulation for phase 1; authentication and networking belong to the backend.
// Requirements: https://github.com/kurice/vpwa27/blob/main/semestralny-projekt/readme.md
// Vue shared state: https://vuejs.org/guide/scaling-up/state-management.html#simple-state-management-with-reactivity-api
const storageKey = 'convo-prototype-v2';
const sessionKey = 'convo-prototype-session';
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
  return createDemoSnapshot();
}
export function mentions(body: string, nickname: string) {
  return (body.match(/@[a-zA-Z][a-zA-Z0-9_]*/g) ?? []).some(
    (item) => item.slice(1).toLowerCase() === nickname.toLowerCase(),
  );
}

export function createPrototypeStore() {
  let sessionId = '';
  try {
    sessionId = sessionStorage.getItem(sessionKey) ?? '';
  } catch {
    // The demo also works without browser storage.
  }
  const drafts: Record<string, string> = {};
  const state = reactive({
    data: readSnapshot(),
    sessionId,
    notices: [] as Notice[],
    feedback: '',
    storageWarning: '',
    typing: null as { channelId: string; nickname: string; body: string } | null,
    drafts,
    get user(): PrototypeUser | null {
      return state.data.users.find((user) => user.id === state.sessionId) ?? null;
    },
    get nickname(): string {
      return state.user?.nickname ?? '';
    },
    get channels(): PrototypeChannel[] {
      return state.data.channels;
    },
    get joinedChannels(): PrototypeChannel[] {
      return state.channels.filter((channel) => channel.members.includes(state.nickname));
    },
    get activeChannelId(): string {
      return state.data.activeId;
    },
    set activeChannelId(id: string) {
      state.data.activeId = id;
    },
    get activeChannel(): PrototypeChannel | undefined {
      return state.joinedChannels.find((channel) => channel.id === state.activeChannelId);
    },
    get invitations(): Invitation[] {
      return state.data.invitations.filter((invite) => invite.to === state.nickname);
    },
    get status(): Presence {
      return state.data.statuses[state.nickname] ?? 'online';
    },
    get directOnly(): boolean {
      return state.data.directOnly[state.nickname] ?? false;
    },
    set directOnly(value: boolean) {
      state.data.directOnly[state.nickname] = value;
    },
  });

  // The shared store survives page unmounts; tests can dispose their own instance.
  const scope = effectScope(true);
  scope.run(() =>
    watch(
      () => state.data,
      () => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(state.data));
        } catch {
          state.storageWarning = 'Zmeny zostávajú iba v pamäti. Prehliadač ich nedokáže uložiť.';
        }
      },
      { deep: true },
    ),
  );

  function selectChannel(id: string) {
    state.activeChannelId = id;
    state.typing = null;
  }
  function requireUser() {
    if (!state.user) throw new Error('Najprv sa prihláste.');
    return state.nickname;
  }
  function requireChannel(id = state.activeChannelId) {
    const actor = requireUser();
    const channel = state.channels.find((c) => c.id === id && c.members.includes(actor));
    if (!channel) throw new Error('Najprv sa pripojte ku kanálu.');
    return channel;
  }
  function repairSelection() {
    if (!state.activeChannel) state.activeChannelId = state.joinedChannels[0]?.id ?? '';
  }
  function removeChannel(id: string) {
    state.data.channels = state.channels.filter((c) => c.id !== id);
    state.data.invitations = state.data.invitations.filter((i) => i.channelId !== id);
    state.data.pending = state.data.pending.filter((p) => p.channelId !== id);
    state.typing = null;
    repairSelection();
  }
  function expireInactiveChannels() {
    state.channels
      .filter((c) => c.lastActivity < Date.now() - 30 * 86400_000)
      .forEach((c) => removeChannel(c.id));
  }
  function createChannel(name: string, isPrivate = false) {
    const actor = requireUser();
    expireInactiveChannels();
    const clean = name.trim().replace(/^#/, '').toLowerCase();
    if (!/^[a-z][a-z0-9_-]{2,63}$/.test(clean))
      throw new Error('Názov musí mať 3 až 64 znakov, začínať písmenom a neobsahovať medzery.');
    if (state.channels.some((c) => c.name.toLowerCase() === clean))
      throw new Error('Tento názov kanála je už obsadený.');
    const channel = makeChannel(clean, actor, isPrivate);
    state.data.channels.push(channel);
    selectChannel(channel.id);
    return channel;
  }
  function joinPublic(id: string) {
    const actor = requireUser();
    expireInactiveChannels();
    const channel = state.channels.find((c) => c.id === id);
    if (!channel) throw new Error('Kanál už neexistuje.');
    if (channel.banned.includes(actor))
      throw new Error('Máte zakázaný prístup. Obnoviť ho môže správca pozvánkou.');
    if (!channel.members.includes(actor)) {
      if (channel.isPrivate) throw new Error('Do súkromného kanála potrebujete pozvánku.');
      channel.members.push(actor);
    }
    selectChannel(id);
  }
  function inviteMember(target: string, id = state.activeChannelId) {
    const channel = requireChannel(id);
    const to = target.replace(/^@/, '').trim().toLowerCase();
    if (!state.data.users.some((u) => u.nickname === to))
      throw new Error('Používateľ s touto prezývkou neexistuje.');
    if (channel.isPrivate && channel.owner !== state.nickname)
      throw new Error('Pozývať môže iba správca súkromného kanála.');
    if (channel.members.includes(to)) throw new Error('Používateľ už je členom kanála.');
    if (channel.banned.includes(to)) {
      if (channel.owner !== state.nickname) throw new Error('Ban môže zrušiť iba správca.');
      channel.banned = channel.banned.filter((n) => n !== to);
      delete channel.votes[to];
    }
    if (state.data.invitations.some((i) => i.channelId === id && i.to === to))
      throw new Error('Pozvánka už čaká na prijatie.');
    state.data.invitations.push({ channelId: id, from: state.nickname, to });
    state.feedback = `Pozvánka pre @${to} je pripravená.`;
  }
  function acceptInvitation(id: string) {
    expireInactiveChannels();
    const invite = state.invitations.find((i) => i.channelId === id);
    const channel = state.channels.find((c) => c.id === id);
    if (!invite || !channel || channel.banned.includes(state.nickname))
      throw new Error('Pozvánka už nie je platná.');
    if (!channel.members.includes(state.nickname)) channel.members.push(state.nickname);
    declineInvitation(id);
    selectChannel(id);
  }
  function declineInvitation(id: string) {
    state.data.invitations = state.data.invitations.filter(
      (i) => i.channelId !== id || i.to !== state.nickname,
    );
  }
  function removeMemberVotes(channel: PrototypeChannel, nickname: string) {
    delete channel.votes[nickname];
    for (const [target, voters] of Object.entries(channel.votes)) {
      const remaining = voters.filter((voter) => voter !== nickname);
      if (remaining.length) channel.votes[target] = remaining;
      else delete channel.votes[target];
    }
  }
  function leaveChannel(id: string) {
    const channel = requireChannel(id);
    if (channel.owner === state.nickname) removeChannel(id);
    else {
      channel.members = channel.members.filter((n) => n !== state.nickname);
      removeMemberVotes(channel, state.nickname);
      repairSelection();
    }
  }
  function moderate(target: string, kind: 'kick' | 'revoke') {
    const channel = requireChannel();
    const to = target.replace(/^@/, '').toLowerCase();
    if (to === state.nickname) throw new Error('Na opustenie kanála použite /cancel.');
    if (to === channel.owner) throw new Error('Správcu kanála nie je možné vyradiť.');
    if (kind === 'revoke' && (!channel.isPrivate || channel.owner !== state.nickname))
      throw new Error('/revoke môže použiť iba správca súkromného kanála.');
    if (kind === 'kick' && channel.isPrivate)
      throw new Error('V súkromnom kanáli použite /revoke.');
    if (!channel.members.includes(to)) {
      if (
        kind === 'revoke' &&
        state.data.invitations.some((i) => i.channelId === channel.id && i.to === to)
      ) {
        state.data.invitations = state.data.invitations.filter(
          (i) => i.channelId !== channel.id || i.to !== to,
        );
        state.feedback = `Pozvánka pre @${to} bola odobratá.`;
        return;
      }
      throw new Error('Používateľ nie je členom tohto kanála.');
    }
    if (kind === 'kick' && channel.owner !== state.nickname) {
      const votes = (channel.votes[to] ?? []).filter((voter) => channel.members.includes(voter));
      if (votes.includes(state.nickname))
        throw new Error('Za vyradenie tohto člena ste už hlasovali.');
      channel.votes[to] = [...votes, state.nickname];
      if (channel.votes[to].length < 3) {
        state.feedback = `Hlas uložený: ${channel.votes[to].length} z 3 pre @${to}.`;
        return;
      }
    }
    channel.members = channel.members.filter((n) => n !== to);
    removeMemberVotes(channel, to);
    if (kind === 'kick') channel.banned.push(to);
    state.data.invitations = state.data.invitations.filter(
      (i) => i.channelId !== channel.id || i.to !== to,
    );
    if (state.typing?.nickname === to) state.typing = null;
    state.feedback =
      kind === 'kick' ? `@${to} má zakázaný prístup do kanála.` : `Členstvo @${to} bolo odobraté.`;
  }
  function sendMessage(body: string) {
    const channel = requireChannel();
    if (state.status === 'offline') throw new Error('Na odoslanie správy sa prepnite online.');
    const clean = body.trim();
    if (!clean) return;
    const message = makeMessage(state.nickname, clean);
    channel.messages.push(message);
    channel.lastActivity = message.sentAt;
    state.drafts[channel.id] = '';
  }
  function receiveDemoMessage(from: string, body: string, visible: boolean) {
    const channel = requireChannel();
    if (!channel.members.includes(from) || from === state.nickname)
      throw new Error('Vyberte iného člena kanála.');
    if (!body.trim()) throw new Error('Zadajte text ukážkovej správy.');
    const message = makeMessage(from, body);
    channel.lastActivity = message.sentAt;
    if (state.status === 'offline') {
      state.data.pending.push({ channelId: channel.id, to: state.nickname, message });
      return 'Správa čaká na návrat online.';
    }
    channel.messages.push(message);
    if (visible) return 'Správa doručená. Viditeľná aplikácia nevystavuje notifikáciu.';
    if (state.status === 'dnd') return 'Správa doručená. DND potlačil notifikáciu.';
    if (state.directOnly && !mentions(body, state.nickname))
      return 'Správa doručená. Filter potlačil neadresovanú notifikáciu.';
    state.notices.unshift({
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
    state.data.statuses[state.nickname] = value;
    if (value === 'offline') state.typing = null;
    if (value !== 'offline') {
      const waiting = state.data.pending.filter((p) => p.to === state.nickname);
      waiting.forEach((p) => {
        const c = state.joinedChannels.find((c) => c.id === p.channelId);
        if (c) c.messages.push(p.message);
      });
      state.data.pending = state.data.pending.filter((p) => p.to !== state.nickname);
      if (waiting.length)
        state.feedback = `Kanály aktualizované. Doručené správy: ${waiting.length}.`;
    }
  }
  function setDemoDraft(from: string, body: string) {
    const channel = requireChannel();
    if (state.status === 'offline' || !channel.members.includes(from) || from === state.nickname) {
      state.typing = null;
      return;
    }
    state.typing = body ? { channelId: channel.id, nickname: from, body } : null;
  }
  function processChannelCommand(command: string): 'members' | 'leave' | 'destroy' | 'done' {
    const [name, argument, modifier, extra] = command.trim().split(/\s+/);
    if (name === '/join') {
      if (!argument || extra || (modifier && modifier !== 'private'))
        throw new Error('Použite /join názov [private].');
      expireInactiveChannels();
      const clean = argument.replace(/^#/, '').toLowerCase();
      const existing = state.channels.find((c) => c.name.toLowerCase() === clean);
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
      if (name === '/quit' && channel.owner !== state.nickname)
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
  function resetSession(account: PrototypeUser | null) {
    state.sessionId = account?.id ?? '';
    state.typing = null;
    state.notices = [];
    state.drafts = {};
    state.feedback = '';
    try {
      if (account) sessionStorage.setItem(sessionKey, account.id);
      else sessionStorage.removeItem(sessionKey);
    } catch {
      // Signing in and out still works in memory when storage is unavailable.
    }
  }
  function activate(account: PrototypeUser) {
    resetSession(account);
    expireInactiveChannels();
    repairSelection();
    setStatus(state.data.statuses[account.nickname] ?? 'online');
  }
  function signIn(email: string, password: string) {
    if (password.length < 8) throw new Error('Pre prototyp zadajte aspoň 8 znakov hesla.');
    const account = state.data.users.find(
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
      state.data.users.some(
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
    state.data.users.push(account);
    activate(account);
  }
  function signOut() {
    resetSession(null);
  }
  return Object.assign(state, {
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
    dispose: () => scope.stop(),
  });
}

let prototype: ReturnType<typeof createPrototypeStore> | undefined;
export function usePrototypeStore() {
  return (prototype ??= createPrototypeStore());
}
