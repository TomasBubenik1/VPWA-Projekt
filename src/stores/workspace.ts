import { reactive } from 'vue';
import { Socket } from '@rlanz/socket/client';
import { createApi } from '../services/api.ts';
import type {
  Channel,
  ChannelPayload,
  Invitation,
  LiveDraft,
  Member,
  Message,
  MessagePage,
  NotificationMode,
  Presence,
  Signup,
  User,
} from './models.ts';
export { presenceLabels, presenceColors } from './models.ts';
export type { Channel, Message, Presence } from './models.ts';

const sessionKey = 'convo-access-token';
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Akciu sa nepodarilo dokončiť.';
export const fullName = (user: Pick<Member, 'firstName' | 'lastName'> | null) =>
  user ? `${user.firstName} ${user.lastName}` : '';

export function createWorkspaceStore(
  options: {
    baseUrl?: string;
    fetch?: typeof fetch;
    storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
    socketFactory?: (url: string) => Socket;
  } = {},
) {
  const baseUrl = options.baseUrl ?? '/api/v1';
  const storage =
    options.storage ?? (typeof sessionStorage === 'undefined' ? undefined : sessionStorage);
  let token = '';
  try {
    token = storage?.getItem(sessionKey) ?? '';
  } catch {
    /* Memory session. */
  }
  let generation = 0;
  let socket: Socket | null = null;
  let connecting: Promise<void> | null = null;
  let refreshing: Promise<void> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = 1000;
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const subscriptions = new Set<number>();
  const incoming = new Set<(message: Message) => void>();
  const state = reactive({
    user: null as User | null,
    initializing: true,
    initializationError: '',
    joinedChannels: [] as Channel[],
    discoverChannels: [] as Channel[],
    invitations: [] as Invitation[],
    activeChannelId: null as number | null,
    drafts: {} as Record<string, string>,
    liveDrafts: {} as Record<string, LiveDraft>,
    feedback: '',
    connection: 'disconnected' as 'disconnected' | 'connecting' | 'connected',
    networkOnline: typeof navigator === 'undefined' || navigator.onLine,
    get sessionId(): number | null {
      return state.user?.id ?? null;
    },
    get nickname(): string {
      return state.user?.nickname ?? '';
    },
    get status(): Presence {
      return state.user?.presence ?? 'offline';
    },
    get directOnly(): boolean {
      return state.user?.notificationMode === 'mentionsOnly';
    },
    get channels(): Channel[] {
      return [...state.joinedChannels, ...state.discoverChannels];
    },
    get activeChannel(): Channel | undefined {
      return state.joinedChannels.find((c) => c.id === state.activeChannelId);
    },
    get typingUsers(): LiveDraft[] {
      return Object.values(state.liveDrafts).filter(
        (d) => d.channelId === state.activeChannelId && d.active,
      );
    },
    get typing(): LiveDraft | null {
      return state.typingUsers[0] ?? null;
    },
  });
  const api = createApi({
    baseUrl,
    token: () => token,
    unauthorized: clearSession,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  function persistToken(value: string) {
    token = value;
    try {
      if (value) storage?.setItem(sessionKey, value);
      else storage?.removeItem(sessionKey);
    } catch {
      /* Memory session. */
    }
  }
  function stopRealtime() {
    clearTimeout(retryTimer);
    clearTimeout(draftTimer);
    clearTimeout(idleTimer);
    retryTimer = undefined;
    const old = socket;
    socket = null;
    old?.disconnect();
    subscriptions.clear();
    state.liveDrafts = {};
    state.connection = 'disconnected';
  }
  function clearSession() {
    generation++;
    stopRealtime();
    persistToken('');
    state.user = null;
    state.joinedChannels = [];
    state.discoverChannels = [];
    state.invitations = [];
    state.activeChannelId = null;
    state.drafts = {};
    state.initializationError = '';
    state.feedback = '';
    refreshing = null;
    connecting = null;
  }
  function report(error: unknown) {
    state.feedback = errorText(error);
  }
  function requireChannel(id = state.activeChannelId) {
    const channel = state.joinedChannels.find((c) => c.id === id);
    if (!state.user || !channel) throw new Error('Najprv sa pripojte ku kanálu.');
    return channel;
  }
  function makeChannel(payload: ChannelPayload): Channel {
    return {
      ...payload,
      members: [],
      messages: [],
      nextCursor: null,
      loaded: false,
      loading: false,
      historyError: '',
    };
  }
  function mergeMessages(channel: Channel, messages: Message[]) {
    const map = new Map(channel.messages.map((m) => [m.id, m]));
    messages.forEach((m) => map.set(m.id, m));
    channel.messages = [...map.values()].sort((a, b) => a.id - b.id);
  }
  async function loadMembers(id: number) {
    const channel = requireChannel(id);
    const version = generation;
    const members = await api<Member[]>(`/channels/${id}/members`);
    if (version === generation && state.joinedChannels.includes(channel)) channel.members = members;
  }
  async function loadHistory(id: number, older = false) {
    const channel = requireChannel(id);
    if (channel.loading || (older && (!channel.loaded || channel.nextCursor === null))) return;
    const version = generation;
    const boundary = channel.messages.at(-1)?.id;
    channel.loading = true;
    channel.historyError = '';
    try {
      let before = older ? channel.nextCursor : null;
      let page: MessagePage;
      do {
        page = await api<MessagePage>(
          `/channels/${id}/messages${before ? `?before=${before}` : ''}`,
        );
        if (version !== generation || !state.joinedChannels.includes(channel)) return;
        mergeMessages(channel, page.messages);
        if (older || !channel.loaded) channel.nextCursor = page.nextCursor;
        before = page.nextCursor;
        // On reconnect, walk back to the newest known message, even across many missed pages.
      } while (
        !older &&
        channel.loaded &&
        boundary &&
        before &&
        !page.messages.some((m) => m.id <= boundary)
      );
      channel.loaded = true;
    } catch (error) {
      channel.historyError = errorText(error);
      throw error;
    } finally {
      channel.loading = false;
    }
  }
  async function refresh() {
    if (refreshing) return refreshing;
    const version = generation;
    const job = (async () => {
      const [joined, discover, invitations] = await Promise.all([
        api<ChannelPayload[]>('/channels'),
        api<ChannelPayload[]>('/channels/discover'),
        api<Invitation[]>('/invitations'),
      ]);
      if (version !== generation) return;
      const known = new Map(state.channels.map((c) => [c.id, c]));
      const materialize = (payload: ChannelPayload) =>
        Object.assign(known.get(payload.id) ?? makeChannel(payload), payload);
      state.joinedChannels = joined.map(materialize);
      state.discoverChannels = discover.map(materialize);
      state.invitations = invitations;
      const ids = new Set(joined.map((c) => c.id));
      for (const key of Object.keys(state.drafts))
        if (key !== '_none' && !ids.has(Number(key))) delete state.drafts[key];
      for (const [key, value] of Object.entries(state.liveDrafts))
        if (!ids.has(value.channelId)) delete state.liveDrafts[key];
      if (!state.activeChannel) state.activeChannelId = state.joinedChannels[0]?.id ?? null;
      await syncSubscriptions();
      if (state.activeChannel) {
        await Promise.all([
          loadMembers(state.activeChannel.id),
          ...(state.activeChannel.loaded ? [] : [loadHistory(state.activeChannel.id)]),
        ]);
      }
    })();
    refreshing = job;
    try {
      await job;
    } finally {
      if (refreshing === job) refreshing = null;
    }
  }
  async function selectChannel(id: number) {
    requireChannel(id);
    clearTyping();
    state.activeChannelId = id;
    await Promise.all([loadMembers(id), ...(requireChannel(id).loaded ? [] : [loadHistory(id)])]);
  }
  async function initialize() {
    state.initializing = true;
    state.initializationError = '';
    try {
      if (token) {
        const version = generation;
        const user = await api<User>('/account/profile');
        if (version !== generation) return;
        state.user = user;
        await refresh();
        void connectRealtime();
      }
    } catch (error) {
      if (token) state.initializationError = errorText(error);
    } finally {
      state.initializing = false;
    }
  }
  async function authenticate(path: string, input: unknown) {
    const result = await api<{ user: User; token: string }>(path, 'POST', input);
    clearSession();
    persistToken(result.token);
    // Profile is the canonical source for presence and notification preferences.
    state.user = await api<User>('/account/profile');
    try {
      await refresh();
    } catch (error) {
      state.initializationError = errorText(error);
    }
    void connectRealtime();
  }
  async function signOut() {
    clearTyping();
    stopRealtime();
    try {
      await api('/account/logout', 'POST');
    } finally {
      clearSession();
    }
  }
  async function setStatus(presence: Presence) {
    const previous = state.status;
    state.user = await api<User>('/account/profile', 'PATCH', { presence });
    if (presence === 'offline') stopRealtime();
    else if (previous === 'offline' || !socket?.connected) {
      await refresh();
      void connectRealtime();
    }
  }
  async function setNotificationMode(notificationMode: NotificationMode) {
    state.user = await api<User>('/account/profile', 'PATCH', { notificationMode });
  }
  async function createChannel(name: string, isPrivate = false) {
    const channel = await api<ChannelPayload>('/channels', 'POST', {
      name: name.trim().replace(/^#/, ''),
      type: isPrivate ? 'private' : 'public',
    });
    await refresh();
    await selectChannel(channel.id);
    return channel;
  }
  async function joinPublic(id: number) {
    await api(`/channels/${id}/join`, 'POST');
    await refresh();
    await selectChannel(id);
  }
  async function acceptInvitation(id: number) {
    const result = await api<{ channelId: number }>(`/invitations/${id}/accept`, 'POST');
    await refresh();
    await selectChannel(result.channelId);
  }
  async function declineInvitation(id: number) {
    await api(`/invitations/${id}/decline`, 'POST');
    await refresh();
  }
  async function inviteMember(nickname: string, id = state.activeChannelId) {
    requireChannel(id);
    await api(`/channels/${id}/invitations`, 'POST', {
      nickname: nickname.trim().replace(/^@/, ''),
    });
    state.feedback = `Pozvánka pre @${nickname.replace(/^@/, '')} bola odoslaná.`;
    await refresh();
  }
  async function leaveChannel(id: number) {
    await api(`/channels/${id}/leave`, 'POST');
    await refresh();
  }
  async function destroyChannel(id: number) {
    await api(`/channels/${id}`, 'DELETE');
    await refresh();
  }
  async function moderate(nickname: string, kind: 'kick' | 'revoke', id = state.activeChannelId) {
    requireChannel(id);
    const clean = nickname.replace(/^@/, '');
    if (kind === 'revoke')
      await api(`/channels/${id}/members/${encodeURIComponent(clean)}`, 'DELETE');
    else {
      const result = await api<{ votes: number; banned: boolean }>(
        `/channels/${id}/kicks`,
        'POST',
        { nickname: clean },
      );
      state.feedback = result.banned
        ? `@${clean} má zakázaný prístup.`
        : `Hlas uložený: ${result.votes} z 3 pre @${clean}.`;
    }
    await refresh();
    if (state.joinedChannels.some((c) => c.id === id)) await loadMembers(id!);
  }
  async function sendMessage(content: string) {
    const channel = requireChannel();
    if (state.status === 'offline') throw new Error('Na odoslanie správy sa prepnite online.');
    const version = generation;
    const message = await api<Message>(`/channels/${channel.id}/messages`, 'POST', { content });
    if (version === generation && state.joinedChannels.includes(channel))
      mergeMessages(channel, [message]);
  }
  async function processChannelCommand(
    command: string,
  ): Promise<'members' | 'leave' | 'destroy' | 'kick' | 'revoke' | 'done'> {
    const [name, argument, modifier, extra] = command.trim().split(/\s+/);
    if (name === '/join') {
      if (!argument || extra || (modifier && modifier !== 'private'))
        throw new Error('Použite /join názov [private].');
      const channel = await api<ChannelPayload>('/channels/join', 'POST', {
        name: argument.replace(/^#/, ''),
        ...(modifier ? { type: 'private' } : {}),
      });
      await refresh();
      await selectChannel(channel.id);
      return 'done';
    }
    const channel = requireChannel();
    if (['/list', '/cancel', '/quit'].includes(name ?? '')) {
      if (argument) throw new Error('Tento príkaz nemá argumenty.');
      if (name === '/list') {
        await loadMembers(channel.id);
        return 'members';
      }
      if (name === '/quit' && channel.ownerId !== state.user?.id)
        throw new Error('Kanál môže zrušiť iba správca.');
      return name === '/quit' ? 'destroy' : 'leave';
    }
    if (!['/invite', '/revoke', '/kick'].includes(name ?? ''))
      throw new Error('Neznámy príkaz. Otvorte prehľad príkazov.');
    if (!argument || modifier) throw new Error('Za príkazom zadajte jednu prezývku.');
    if (name === '/invite') {
      await inviteMember(argument);
      return 'done';
    }
    return name === '/kick' ? 'kick' : 'revoke';
  }
  function receiveMessage(message: Message) {
    const channel = state.joinedChannels.find((c) => c.id === message.channelId);
    if (!channel || channel.messages.some((m) => m.id === message.id)) return;
    mergeMessages(channel, [message]);
    delete state.liveDrafts[`${message.channelId}:${message.authorId}`];
    incoming.forEach((listener) => listener(message));
  }
  function receiveDraft(
    channelId: number,
    userId: number,
    patch: { active?: boolean; content?: string },
  ) {
    if (userId === state.user?.id) return;
    const key = `${channelId}:${userId}`;
    if (patch.active === false || patch.content === '') {
      delete state.liveDrafts[key];
      return;
    }
    const member = state.joinedChannels
      .find((c) => c.id === channelId)
      ?.members.find((m) => m.id === userId);
    state.liveDrafts[key] = {
      channelId,
      userId,
      nickname: member?.nickname ?? String(userId),
      body: '',
      ...state.liveDrafts[key],
      ...('content' in patch ? { body: patch.content ?? '' } : {}),
      active: true,
      updatedAt: Date.now(),
    };
  }
  async function syncSubscriptions() {
    const connection = socket;
    if (!connection?.connected) return;
    for (const id of subscriptions)
      if (!state.joinedChannels.some((c) => c.id === id)) {
        subscriptions.delete(id);
        await connection.leave(`channels/${id}`);
      }
    for (const channel of state.joinedChannels) {
      if (subscriptions.has(channel.id)) continue;
      subscriptions.add(channel.id);
      try {
        await connection
          .channel(`channels/${channel.id}`)
          .listen<Message>('message', receiveMessage)
          .listen('membership', () => {
            void refresh().catch(report);
          })
          .listen('deleted', () => {
            void refresh().catch(report);
          })
          .listen<{ userId: number; active: boolean }>('typing', (event) =>
            receiveDraft(channel.id, event.userId, event),
          )
          .listen<{ userId: number; content: string }>('draft', (event) =>
            receiveDraft(channel.id, event.userId, event),
          )
          .subscribe();
      } catch (error) {
        subscriptions.delete(channel.id);
        throw error;
      }
    }
  }
  function scheduleReconnect() {
    if (
      disposed ||
      !token ||
      !state.user ||
      state.status === 'offline' ||
      !state.networkOnline ||
      retryTimer
    )
      return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void connectRealtime();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 15000);
  }
  async function connectRealtime() {
    if (
      disposed ||
      !token ||
      !state.user ||
      state.status === 'offline' ||
      !state.networkOnline ||
      socket?.connected
    )
      return;
    if (connecting) return connecting;
    const version = generation;
    const job = (async () => {
      state.connection = 'connecting';
      try {
        // Refresh profile before each ticket: another tab may have chosen offline.
        const user = await api<User>('/account/profile');
        if (version !== generation) return;
        state.user = user;
        if (user.presence === 'offline') {
          stopRealtime();
          return;
        }
        await refresh();
        const { ticket } = await api<{ ticket: string }>('/account/socket-ticket', 'POST');
        if (version !== generation || state.status === 'offline') return;
        const origin = new URL(
          baseUrl,
          typeof location === 'undefined' ? 'http://localhost:3333' : location.href,
        ).origin;
        const connection =
          options.socketFactory?.(`${origin}?ticket=${encodeURIComponent(ticket)}`) ??
          new Socket({
            url: `${origin}?ticket=${encodeURIComponent(ticket)}`,
            autoReconnect: false,
          });
        socket = connection;
        connection.onStateChange((value) => {
          if (socket !== connection) return;
          state.connection = value;
          if (value === 'disconnected') {
            socket = null;
            subscriptions.clear();
            state.liveDrafts = {};
            scheduleReconnect();
          }
        });
        connection.on<{ userId: number; presence: Presence }>('presence', (event) => {
          state.joinedChannels.forEach((c) =>
            c.members.forEach((m) => {
              if (m.id === event.userId) m.presence = event.presence;
            }),
          );
          if (state.user?.id === event.userId) {
            state.user.presence = event.presence;
            if (event.presence === 'offline') stopRealtime();
          }
          if (event.presence === 'offline')
            for (const [key, draft] of Object.entries(state.liveDrafts))
              if (draft.userId === event.userId) delete state.liveDrafts[key];
        });
        await connection.connect();
        if (version !== generation || socket !== connection) {
          connection.disconnect();
          return;
        }
        await connection
          .channel(`users/${state.user!.id}`)
          .listen('invitation', () => {
            void refresh().catch(report);
          })
          .subscribe();
        await syncSubscriptions();
        // Subscribe first, then recover HTTP history, closing the reconnect race.
        await Promise.all(
          state.joinedChannels.flatMap((c) => [loadMembers(c.id), loadHistory(c.id)]),
        );
        retryDelay = 1000;
        state.connection = 'connected';
      } catch (error) {
        if (version !== generation) return;
        stopRealtime();
        report(error);
        scheduleReconnect();
      }
    })();
    connecting = job;
    try {
      await job;
    } finally {
      if (connecting === job) connecting = null;
    }
  }
  function publishDraft(id: number, content: string) {
    if (!socket?.connected || !subscriptions.has(id)) return;
    socket
      .channel(`channels/${id}`)
      .send('typing', !!content && !content.startsWith('/'))
      .send('draft', content.startsWith('/') ? '' : content);
  }
  function clearTyping() {
    clearTimeout(draftTimer);
    clearTimeout(idleTimer);
    if (state.activeChannelId) publishDraft(state.activeChannelId, '');
  }
  function updateDraft(content: string) {
    const id = state.activeChannelId;
    state.drafts[id ?? '_none'] = content;
    clearTimeout(draftTimer);
    clearTimeout(idleTimer);
    if (!id) return;
    draftTimer = setTimeout(() => publishDraft(id, content), 180);
    idleTimer = setTimeout(() => publishDraft(id, ''), 5000);
  }
  function memberByNickname(nickname: string) {
    return state.user?.nickname === nickname
      ? state.user
      : state.joinedChannels.flatMap((c) => c.members).find((m) => m.nickname === nickname);
  }
  function onIncoming(listener: (message: Message) => void) {
    incoming.add(listener);
    return () => incoming.delete(listener);
  }
  function online() {
    state.networkOnline = true;
    void initialize();
  }
  function offline() {
    state.networkOnline = false;
    stopRealtime();
  }
  const expiryTimer = setInterval(() => {
    for (const [key, draft] of Object.entries(state.liveDrafts))
      if (Date.now() - draft.updatedAt > 10000) delete state.liveDrafts[key];
  }, 2000);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
  }
  function dispose() {
    disposed = true;
    clearSession();
    clearInterval(expiryTimer);
    incoming.clear();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    }
  }
  return Object.assign(state, {
    initialize,
    selectChannel,
    refresh,
    loadHistory,
    loadMembers,
    signIn: (email: string, password: string) => authenticate('/auth/login', { email, password }),
    signUp: (input: Signup) => authenticate('/auth/signup', input),
    signOut,
    setStatus,
    setNotificationMode,
    createChannel,
    joinPublic,
    acceptInvitation,
    declineInvitation,
    inviteMember,
    leaveChannel,
    destroyChannel,
    moderate,
    sendMessage,
    processChannelCommand,
    updateDraft,
    clearTyping,
    memberByNickname,
    onIncoming,
    report,
    dispose,
  });
}
let sharedStore: ReturnType<typeof createWorkspaceStore> | undefined;
export function useWorkspaceStore() {
  return (sharedStore ??= createWorkspaceStore());
}
