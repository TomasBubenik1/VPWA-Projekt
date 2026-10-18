import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick, ref } from 'vue';
import { createPrototypeStore } from '../src/stores/prototype.ts';
import { useMessageWindow } from '../src/composables/useMessageWindow.ts';
import { useWorkspaceDialogs } from '../src/composables/useWorkspaceDialogs.ts';
import { useChannelAction } from '../src/composables/useChannelAction.ts';

let scope;
let store;
beforeEach(() => {
  for (const key of ['localStorage', 'sessionStorage']) {
    const values = new Map();
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: {
        getItem: (name) => values.get(name) ?? null,
        setItem: (name, value) => values.set(name, value),
        removeItem: (name) => values.delete(name),
      },
    });
  }
  scope = effectScope();
  store = createPrototypeStore();
  store.signIn('alex@convo.app', 'convo-demo');
});
afterEach(() => {
  scope.stop();
  store.dispose();
});

test('nové správy nevytlačia načítané správy z histórie', () => {
  const channel = ref(store.activeChannel);
  const history = scope.run(() => useMessageWindow(channel));
  const initialIds = history.visible.value.map((message) => message.id);
  assert.equal(initialIds.length, 12);
  store.receiveDemoMessage('mira', 'nová správa počas čítania', true);
  assert.deepEqual(
    history.visible.value.slice(0, 12).map((message) => message.id),
    initialIds,
  );
  assert.equal(history.visible.value.length, 13);
  history.loadOlder();
  assert.equal(history.visible.value.length, 25);
  assert.equal(history.hasOlder.value, false);
  store.sendMessage('ďalšia správa');
  assert.equal(history.visible.value.length, 26);
});

test('história zachová hranicu pri staršej doručenej správe a resetuje ju pre iný kanál', () => {
  const channel = ref(store.activeChannel);
  const history = scope.run(() => useMessageWindow(channel));
  const first = history.visible.value[0];
  channel.value.messages.push({
    id: 'delayed',
    nickname: 'mira',
    body: 'oneskorená',
    sentAt: first.sentAt - 1,
  });
  assert.equal(history.visible.value[0].id, first.id);
  history.loadOlder();
  assert.ok(history.visible.value.some((message) => message.id === 'delayed'));
  store.selectChannel('c-design');
  channel.value = store.activeChannel;
  assert.equal(history.visible.value.length, 1);
  assert.equal(history.hasOlder.value, false);
  store.sendMessage('prvá odpoveď');
  assert.equal(history.visible.value.length, 2);
});

test('prázdny kanál zobrazí prvú správu', () => {
  const channel = ref(store.createChannel('empty-history'));
  const history = scope.run(() => useMessageWindow(channel));
  assert.deepEqual(history.visible.value, []);
  store.sendMessage('prvá');
  assert.equal(history.visible.value[0].body, 'prvá');
});

test('mobilný dialóg čaká na zatvorenie draweru a zatváranie starého neovplyvní nový', () => {
  const navigation = useWorkspaceDialogs(ref(true));
  navigation.sidebarOpen.value = true;
  navigation.open('channelAction');
  assert.equal(navigation.sidebarOpen.value, false);
  assert.equal(navigation.dialogs.channelAction, false);
  navigation.afterSidebarHide();
  assert.equal(navigation.dialogs.channelAction, true);
  navigation.open('settings');
  navigation.dialogs.channelAction = false;
  assert.equal(navigation.dialogs.settings, true);
  assert.equal(navigation.dialogs.channelAction, false);
});

test('desktop ponechá sidebar otvorený a reset zruší aj čakajúci mobilný dialóg', () => {
  const mobile = ref(false);
  const navigation = useWorkspaceDialogs(mobile);
  navigation.sidebarOpen.value = true;
  navigation.open('create');
  assert.equal(navigation.dialogs.create, true);
  assert.equal(navigation.sidebarOpen.value, true);
  mobile.value = true;
  navigation.open('settings');
  navigation.reset();
  navigation.afterSidebarHide();
  assert.ok(Object.values(navigation.dialogs).every((value) => value === false));
});

test('opustenie neaktívneho kanála nemení otvorenú konverzáciu', () => {
  const request = ref({ kind: 'leave', channelId: 'c-design' });
  const action = scope.run(() => useChannelAction(request, store));
  assert.match(action.details.value.message, /design-team/);
  assert.equal(action.confirm(), true);
  assert.equal(store.activeChannelId, 'c-general');
  assert.ok(!store.joinedChannels.some((channel) => channel.id === 'c-design'));
  assert.equal(store.feedback, 'Opustili ste kanál.');
});

test('odchod správcu hlási zrušenie podľa pôvodného kanála', () => {
  const request = ref({ kind: 'leave', channelId: 'c-general' });
  const action = scope.run(() => useChannelAction(request, store));
  assert.equal(action.confirm(), true);
  assert.equal(store.activeChannelId, 'c-design');
  assert.equal(store.feedback, 'Kanál bol zrušený.');
});

test('neúspešné potvrdenie zachová cieľ a zobrazí chybu; ďalší cieľ ju vyčistí', async () => {
  const request = ref({ kind: 'destroy', channelId: 'c-design' });
  const action = scope.run(() => useChannelAction(request, store));
  assert.equal(action.confirm(), false);
  assert.match(action.error.value, /správca/);
  assert.equal(request.value.channelId, 'c-design');
  request.value = { kind: 'join', channelId: 'missing' };
  await nextTick();
  assert.equal(action.error.value, '');
  assert.equal(action.confirm(), false);
  assert.match(action.error.value, /neexistuje/);
});

test('pripojenie a odmietnutie pozvánky pracujú s cieľom zo sidebaru', () => {
  const request = ref({ kind: 'join', channelId: 'c-openlab' });
  const action = scope.run(() => useChannelAction(request, store));
  assert.equal(action.confirm(), true);
  assert.equal(store.activeChannelId, 'c-openlab');
  request.value = { kind: 'decline', channelId: 'c-launch' };
  assert.equal(action.confirm(), true);
  assert.equal(store.invitations.length, 0);
  assert.equal(action.confirm(), false);
  assert.match(action.error.value, /platná/);
});
