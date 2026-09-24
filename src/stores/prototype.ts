import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface PrototypeUser {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
}

export interface PrototypeChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  owner: string;
  members: string[];
  messages: PrototypeMessage[];
  lastActivity: number;
}

export interface PrototypeMessage {
  id: string;
  nickname: string;
  body: string;
  sentAt: number;
}

interface Invitation {
  channelId: string;
  from: string;
}

const userStorageKey = 'vpwa-phase-one-user';
const appStorageKey = 'vpwa-phase-one-workspace';
const seedChannelData = (): PrototypeChannel[] => [
  { id: 'c-general', name: 'general', isPrivate: false, owner: 'alex', members: ['alex', 'mira', 'jules', 'nina'], lastActivity: Date.now(), messages: [] },
  { id: 'c-design', name: 'design-team', isPrivate: true, owner: 'mira', members: ['alex', 'mira', 'jules'], lastActivity: Date.now(), messages: [] },
  { id: 'c-launch', name: 'launch-week', isPrivate: true, owner: 'jules', members: ['jules', 'nina'], lastActivity: Date.now(), messages: [] },
  { id: 'c-openlab', name: 'open-lab', isPrivate: false, owner: 'nina', members: ['nina', 'jules'], lastActivity: Date.now(), messages: [] },
  { id: 'c-coffee', name: 'coffee-break', isPrivate: false, owner: 'mira', members: ['mira'], lastActivity: Date.now(), messages: [] },
];

function readWorkspace() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(appStorageKey);
    return stored ? JSON.parse(stored) as { channels: PrototypeChannel[]; activeId: string; invitations: Invitation[] } : null;
  } catch {
    return null;
  }
}

function readUser(): PrototypeUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const stored = localStorage.getItem(userStorageKey);
    return stored ? (JSON.parse(stored) as PrototypeUser) : null;
  } catch {
    return null;
  }
}

export const usePrototypeStore = defineStore('prototype', () => {
  const user = ref<PrototypeUser | null>(readUser());
  const savedWorkspace = readWorkspace();
  const channels = ref<PrototypeChannel[]>(savedWorkspace?.channels ?? seedChannelData());
  const activeChannelId = ref(savedWorkspace?.activeId ?? 'c-general');
  const invitations = ref<Invitation[]>(savedWorkspace?.invitations ?? [{ channelId: 'c-launch', from: 'jules' }]);
  const feedback = ref('');

  const channelNameIsTaken = (name: string) => channels.value.some((channel) => channel.name.toLowerCase() === name.trim().toLowerCase());
  const saveWorkspace = () => localStorage.setItem(appStorageKey, JSON.stringify({ channels: channels.value, activeId: activeChannelId.value, invitations: invitations.value }));

  function expireInactiveChannels() {
    const expiry = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const expiredIds = new Set(channels.value.filter((channel) => channel.lastActivity < expiry).map((channel) => channel.id));
    if (expiredIds.size === 0) return;
    channels.value = channels.value.filter((channel) => !expiredIds.has(channel.id));
    invitations.value = invitations.value.filter((invite) => !expiredIds.has(invite.channelId));
    if (expiredIds.has(activeChannelId.value)) activeChannelId.value = channels.value.find((channel) => channel.members.includes(user.value?.nickname ?? 'alex'))?.id ?? '';
    saveWorkspace();
  }

  function createChannel(name: string, isPrivate = false) {
    const cleanedName = name.trim().replace(/^#/, '');
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{2,63}$/.test(cleanedName)) throw new Error('Názov musí mať 3 až 64 znakov a začínať písmenom.');
    if (channelNameIsTaken(cleanedName)) throw new Error(`Kanál #${cleanedName} už existuje.`);
    const nickname = user.value?.nickname ?? 'alex';
    const channel: PrototypeChannel = { id: `c-${crypto.randomUUID()}`, name: cleanedName, isPrivate, owner: nickname, members: [nickname], messages: [], lastActivity: Date.now() };
    channels.value.push(channel);
    activeChannelId.value = channel.id;
    saveWorkspace();
    return channel;
  }

  function joinPublic(channelId: string) {
    const channel = channels.value.find((item) => item.id === channelId);
    if (!channel) throw new Error('Kanál sa už nepodarilo nájsť.');
    if (channel.isPrivate) throw new Error('Do súkromného kanála sa možno pripojiť iba cez pozvánku.');
    const nickname = user.value?.nickname ?? 'alex';
    if (!channel.members.includes(nickname)) channel.members.push(nickname);
    activeChannelId.value = channel.id;
    saveWorkspace();
  }

  function acceptInvitation(channelId: string) {
    const invitation = invitations.value.find((item) => item.channelId === channelId);
    const channel = channels.value.find((item) => item.id === channelId);
    if (!invitation || !channel) throw new Error('Pozvánka už nie je platná.');
    const nickname = user.value?.nickname ?? 'alex';
    if (!channel.members.includes(nickname)) channel.members.push(nickname);
    invitations.value = invitations.value.filter((item) => item.channelId !== channelId);
    activeChannelId.value = channel.id;
    saveWorkspace();
  }

  function declineInvitation(channelId: string) {
    invitations.value = invitations.value.filter((item) => item.channelId !== channelId);
    saveWorkspace();
  }

  function leaveChannel(channelId: string) {
    const channel = channels.value.find((item) => item.id === channelId);
    if (!channel) return;
    const nickname = user.value?.nickname ?? 'alex';
    if (channel.owner === nickname) channels.value = channels.value.filter((item) => item.id !== channelId);
    else channel.members = channel.members.filter((member) => member !== nickname);
    if (activeChannelId.value === channelId) activeChannelId.value = channels.value.find((item) => item.members.includes(nickname))?.id ?? '';
    saveWorkspace();
  }

  function destroyChannel(channelId: string) {
    const channel = channels.value.find((item) => item.id === channelId);
    if (!channel || channel.owner !== (user.value?.nickname ?? 'alex')) throw new Error('Kanál môže zrušiť iba jeho správca.');
    leaveChannel(channelId);
  }

  function processChannelCommand(command: string) {
    const [name, argument, modifier] = command.trim().split(/\s+/);
    if (name === '/join' && argument) {
      if (modifier && modifier !== 'private') throw new Error('Použite /join názov [private].');
      const normalized = argument.replace(/^#/, '');
      const existing = channels.value.find((channel) => channel.name.toLowerCase() === normalized.toLowerCase());
      if (existing) {
        if (modifier === 'private') throw new Error('Tento názov kanála už existuje.');
        joinPublic(existing.id);
      } else {
        createChannel(normalized, modifier === 'private');
      }
      return;
    }
    const channel = channels.value.find((item) => item.id === activeChannelId.value);
    if (name === '/cancel' && channel) { leaveChannel(channel.id); return; }
    if (name === '/quit' && channel) { destroyChannel(channel.id); return; }
    throw new Error('Zatiaľ sú dostupné príkazy /join, /cancel a /quit.');
  }

  function signIn(email: string, password: string) {
    if (!email.trim() || !password) throw new Error('Zadajte e-mail a heslo.');
    const stored = readUser();
    user.value = stored?.email.toLowerCase() === email.trim().toLowerCase()
      ? stored
      : {
          id: email.trim().toLowerCase(),
          email: email.trim(),
          fullName: email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Demo používateľ',
          nickname: email.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '') || 'demo',
        };
    localStorage.setItem(userStorageKey, JSON.stringify(user.value));
  }

  function signUp(input: { fullName: string; nickname: string; email: string; password: string; confirmation: string }) {
    if (input.fullName.trim().length < 2) throw new Error('Zadajte meno a priezvisko.');
    if (!/^[a-zA-Z][a-zA-Z0-9_]{2,31}$/.test(input.nickname)) {
      throw new Error('Prezývka musí mať 3 až 32 znakov.');
    }
    if (!input.email.includes('@')) throw new Error('Zadajte platný e-mail.');
    if (input.password.length < 8) throw new Error('Heslo musí mať aspoň 8 znakov.');
    if (input.password !== input.confirmation) throw new Error('Heslá sa nezhodujú.');
    user.value = {
      id: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      nickname: input.nickname,
      email: input.email.trim(),
    };
    localStorage.setItem(userStorageKey, JSON.stringify(user.value));
  }

  function signOut() {
    user.value = null;
    localStorage.removeItem(userStorageKey);
  }

  return {
    user,
    channels,
    activeChannelId,
    invitations,
    feedback,
    createChannel,
    joinPublic,
    acceptInvitation,
    declineInvitation,
    leaveChannel,
    destroyChannel,
    processChannelCommand,
    expireInactiveChannels,
    signIn,
    signUp,
    signOut,
    saveWorkspace,
  };
});
