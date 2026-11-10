import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { ref, nextTick } from 'vue';
import { createWorkspaceStore } from '../src/stores/workspace.ts';
import { useChannelAction } from '../src/composables/useChannelAction.ts';
import { useWorkspaceDialogs } from '../src/composables/useWorkspaceDialogs.ts';
import { shouldNotify } from '../src/services/notifications.ts';

const stores = [];
afterEach(() => stores.splice(0).forEach((store) => store.dispose()));
const message = (id, channelId = 10) => ({
  id,
  channelId,
  authorId: 2,
  authorNickname: 'mira',
  authorName: 'Mira Test',
  content: `Správa ${id}`,
  createdAt: new Date().toISOString(),
  mentions: [],
});
async function eventually(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail('Stav sa neustálil v limite.');
}
function fixture(presence = 'offline') {
  let user = {
    id: 1,
    firstName: 'Alex',
    lastName: 'Test',
    nickname: 'alex',
    email: 'alex@example.test',
    presence,
    notificationMode: 'all',
  };
  let joined = [
    { id: 10, name: 'general', type: 'public', ownerId: 1 },
    { id: 20, name: 'design', type: 'private', ownerId: 2 },
  ];
  let invitations = [
    {
      id: 91,
      channelId: 44,
      channelName: 'secret',
      channelType: 'private',
      inviterNickname: 'mira',
    },
  ];
  let messages = [message(1), message(2)];
  const calls = [];
  const sockets = [];
  const values = new Map();
  let override;
  let subscribeHook;
  const fetch = async (url, options) => {
    const path = new URL(url).pathname.replace('/api/v1', '') + new URL(url).search;
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ path, method: options.method, body, headers: options.headers });
    const result = await override?.(path, options, body);
    if (result) return result;
    if (path.startsWith('/auth/')) return Response.json({ user, token: 'test-token' });
    if (path === '/account/logout') return new Response(null, { status: 204 });
    if (path === '/account/profile') {
      if (body) user = { ...user, ...body };
      return Response.json(user);
    }
    if (path === '/account/socket-ticket')
      return Response.json({
        ticket: `ticket-${calls.filter((c) => c.path.endsWith('socket-ticket')).length}`,
      });
    if (path === '/channels') return Response.json(joined);
    if (path === '/channels/discover')
      return Response.json([{ id: 30, name: 'open', type: 'public', ownerId: 2 }]);
    if (path === '/invitations') return Response.json(invitations);
    if (/\/members$/.test(path))
      return Response.json([
        user,
        { id: 2, firstName: 'Mira', lastName: 'Test', nickname: 'mira', presence: 'online' },
      ]);
    if (/\/messages(?:\?|$)/.test(path)) {
      const id = Number(path.split('/')[2]);
      if (options.method === 'POST') return Response.json(message(999, id), { status: 201 });
      const cursor = Number(new URL(url).searchParams.get('before')) || Infinity;
      const rows = messages.filter((m) => m.channelId === id && m.id < cursor);
      return Response.json({
        messages: rows.slice(-30),
        nextCursor: rows.length > 30 ? rows.at(-30).id : null,
      });
    }
    if (path === '/invitations/91/decline') {
      invitations = [];
      return new Response(null, { status: 204 });
    }
    if (path.endsWith('/leave')) {
      joined = joined.filter((c) => c.id !== Number(path.split('/')[2]));
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 204 });
  };
  function socketFactory(url) {
    const channels = new Map();
    const stateListeners = [];
    const global = new Map();
    const socket = {
      url,
      connected: false,
      onStateChange(fn) {
        stateListeners.push(fn);
      },
      on(name, fn) {
        global.set(name, fn);
      },
      async connect() {
        this.connected = true;
        stateListeners.forEach((fn) => fn('connected'));
      },
      disconnect() {
        this.connected = false;
        stateListeners.forEach((fn) => fn('disconnected'));
      },
      channel(name) {
        if (!channels.has(name)) {
          const listeners = new Map();
          const channel = {
            listeners,
            active: false,
            sent: [],
            listen(event, fn) {
              listeners.set(event, fn);
              return this;
            },
            async subscribe() {
              this.active = true;
              subscribeHook?.(name, this);
              return this;
            },
            send(event, data) {
              this.sent.push([event, data]);
              return this;
            },
          };
          channels.set(name, channel);
        }
        return channels.get(name);
      },
      async leave(name) {
        channels.delete(name);
      },
      channels,
      global,
    };
    sockets.push(socket);
    return socket;
  }
  const store = createWorkspaceStore({
    baseUrl: 'http://localhost:3333/api/v1',
    fetch,
    socketFactory,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  stores.push(store);
  return {
    store,
    calls,
    sockets,
    values,
    setMessages(value) {
      messages = value;
    },
    setOverride(fn) {
      override = fn;
    },
    setSubscribeHook(fn) {
      subscribeHook = fn;
    },
  };
}

test('prihlásenie načíta reálny profil a uchová iba token; odhlásenie vyčistí stav', async () => {
  const { store, calls, values } = fixture();
  await store.signIn('alex@example.test', 'password');
  assert.equal(store.user.id, 1);
  assert.equal(store.activeChannel.id, 10);
  assert.ok(calls.some((c) => c.path === '/account/profile'));
  assert.deepEqual([...values], [['convo-access-token', 'test-token']]);
  store.updateDraft('tajný text');
  await store.signOut();
  assert.equal(store.user, null);
  assert.equal(store.channels.length, 0);
  assert.deepEqual(store.drafts, {});
  assert.equal(values.size, 0);
});

test('história stránkuje kurzorom a HTTP/WS správy sa nezduplikujú', async () => {
  const { store, calls, sockets, setMessages } = fixture();
  setMessages(Array.from({ length: 65 }, (_, i) => message(i + 1)));
  await store.signIn('', '');
  assert.equal(store.activeChannel.messages.length, 30);
  assert.equal(store.activeChannel.nextCursor, 36);
  await store.loadHistory(10, true);
  await store.loadHistory(10, true);
  assert.equal(store.activeChannel.messages.length, 65);
  assert.equal(store.activeChannel.nextCursor, null);
  const before = calls.length;
  await store.loadHistory(10, true);
  assert.equal(calls.length, before);
  await store.setStatus('online');
  await eventually(() => store.connection === 'connected');
  const latest = message(999);
  sockets[0].channel('channels/10').listeners.get('message')(latest);
  await store.sendMessage('hotová správa');
  assert.equal(store.activeChannel.messages.filter((m) => m.id === latest.id).length, 1);
});

test('príkazy moderovania čakajú na potvrdenie a používajú prezývku v URL', async () => {
  const { store, calls } = fixture();
  await store.signIn('', '');
  assert.equal(await store.processChannelCommand('/kick mira'), 'kick');
  assert.equal(await store.processChannelCommand('/revoke mira'), 'revoke');
  assert.equal(await store.processChannelCommand('/cancel'), 'leave');
  assert.ok(
    !calls.some(
      (c) => c.path.includes('/kicks') || c.method === 'DELETE' || c.path.endsWith('/leave'),
    ),
  );
  await store.moderate('@mira', 'revoke', 20);
  assert.ok(calls.some((c) => c.path === '/channels/20/members/mira' && c.method === 'DELETE'));
  await assert.rejects(store.processChannelCommand('/list extra'), /nemá argumenty/);
  await assert.rejects(store.processChannelCommand('/unknown'), /Neznámy/);
});

test('pozvánka sa odmieta podľa vlastného ID a odchod zachová iný aktívny kanál', async () => {
  const { store, calls } = fixture();
  await store.signIn('', '');
  const action = ref({ kind: 'decline', channelId: 44, invitationId: 91 });
  const dialog = useChannelAction(action, store);
  assert.match(dialog.details.value.message, /secret/);
  assert.equal(await dialog.confirm(), true);
  assert.ok(calls.some((c) => c.path === '/invitations/91/decline'));
  action.value = { kind: 'leave', channelId: 20 };
  await nextTick();
  assert.equal(await dialog.confirm(), true);
  assert.equal(store.activeChannelId, 10);
});

test('401 odstráni reláciu a neúspešné odoslanie zachová draft', async () => {
  const { store, setOverride } = fixture();
  await store.signIn('', '');
  await store.setStatus('online');
  await eventually(() => store.connection === 'connected');
  store.updateDraft('nestratiť');
  setOverride((path, options) =>
    path.endsWith('/messages') && options.method === 'POST'
      ? Response.json({ message: 'Chyba servera' }, { status: 500 })
      : undefined,
  );
  await assert.rejects(store.sendMessage('nestratiť'), /Chyba servera/);
  assert.equal(store.drafts[10], 'nestratiť');
  setOverride(() => Response.json({ message: 'Relácia vypršala' }, { status: 401 }));
  await assert.rejects(store.refresh(), /Relácia vypršala/);
  assert.equal(store.user, null);
  assert.deepEqual(store.drafts, {});
});

test('socket odoberá všetky členstvá, offline ho zavrie a návrat použije nový lístok', async () => {
  const { store, sockets } = fixture('online');
  await store.signIn('', '');
  await eventually(() => store.connection === 'connected');
  assert.deepEqual([...sockets[0].channels.keys()], ['users/1', 'channels/10', 'channels/20']);
  sockets[0].channel('channels/20').listeners.get('message')(message(80, 20));
  assert.ok(store.joinedChannels.find((c) => c.id === 20).messages.some((m) => m.id === 80));
  sockets[0].channel('channels/10').listeners.get('draft')({ userId: 2, content: 'rozpísaná' });
  assert.equal(store.typing.body, 'rozpísaná');
  await store.setStatus('offline');
  assert.equal(sockets[0].connected, false);
  assert.equal(store.typing, null);
  await store.setStatus('online');
  await eventually(() => sockets.length === 2 && store.connection === 'connected');
  assert.notEqual(sockets[0].url, sockets[1].url);
});

test('reconnect obnoví viac zmeškaných stránok aj pri súbežnej živej správe', async () => {
  const { store, sockets, setMessages, setSubscribeHook } = fixture('online');
  await store.signIn('', '');
  await eventually(() => store.connection === 'connected');
  sockets[0].disconnect();
  setMessages(Array.from({ length: 100 }, (_, i) => message(i + 1)));
  setSubscribeHook((name, channel) => {
    if (name === 'channels/10') channel.listeners.get('message')(message(100));
  });
  await eventually(() => sockets.length === 2 && store.connection === 'connected');
  assert.equal(store.activeChannel.messages.length, 100);
  assert.deepEqual(
    store.activeChannel.messages.map((m) => m.id),
    Array.from({ length: 100 }, (_, i) => i + 1),
  );
});

test('notifikácie rešpektujú viditeľnosť, vlastného autora, DND, offline a serverové zmienky', () => {
  const user = { id: 1, nickname: 'alex', presence: 'online', notificationMode: 'all' };
  assert.equal(shouldNotify(user, message(1), false), true);
  assert.equal(shouldNotify(user, message(1), true), false);
  assert.equal(shouldNotify(user, { ...message(1), authorId: 1 }, false), false);
  for (const presence of ['dnd', 'offline'])
    assert.equal(shouldNotify({ ...user, presence }, message(1), false), false);
  assert.equal(
    shouldNotify({ ...user, notificationMode: 'mentionsOnly' }, message(1), false),
    false,
  );
  assert.equal(
    shouldNotify(
      { ...user, notificationMode: 'mentionsOnly' },
      { ...message(1), mentions: ['alex'] },
      false,
    ),
    true,
  );
});

test('mobilný dialóg počká na zatvorenie navigácie', () => {
  const navigation = useWorkspaceDialogs(ref(true));
  navigation.sidebarOpen.value = true;
  navigation.open('settings');
  assert.equal(navigation.sidebarOpen.value, false);
  assert.equal(navigation.dialogs.settings, false);
  navigation.afterSidebarHide();
  assert.equal(navigation.dialogs.settings, true);
  navigation.reset();
  assert.ok(Object.values(navigation.dialogs).every((value) => !value));
});
