import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { usePrototypeStore, mentions } from '../src/stores/prototype.ts';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
let store;
const login = (name) => store.signIn(`${name}@convo.app`, 'convo-demo');
beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: memoryStorage(),
    configurable: true,
  });
  setActivePinia(createPinia());
  store = usePrototypeStore();
  login('alex');
});

test('registrácia overuje unikátnosť a neukladá heslo', async () => {
  const input = {
    fullName: 'Adam Hruška',
    nickname: 'adam',
    email: 'adam@example.test',
    password: 'test-heslo',
    confirmation: 'test-heslo',
  };
  store.signUp(input);
  assert.equal(store.nickname, 'adam');
  assert.throws(() => store.signUp(input), /obsadený/);
  await nextTick();
  assert.ok(!localStorage.getItem('convo-prototype-v2').includes('test-heslo'));
  store.signOut();
  assert.equal(store.user, null);
});
test('join vytvorí kanál a názvy sú unikátne bez ohľadu na veľkosť písmen', () => {
  store.processChannelCommand('/join Test-channel private');
  assert.equal(store.activeChannel.isPrivate, true);
  assert.throws(() => store.createChannel('TEST-channel'), /obsadený/);
  assert.throws(() => store.processChannelCommand('/join x private extra'), /Použite/);
});
test('súkromnú pozvánku spravuje vlastník a prijíma adresát', () => {
  store.selectChannel('c-design');
  assert.throws(() => store.inviteMember('nina'), /správca/);
  login('mira');
  store.selectChannel('c-design');
  store.inviteMember('nina');
  login('nina');
  assert.equal(store.invitations[0].channelId, 'c-design');
  store.acceptInvitation('c-design');
  assert.ok(store.activeChannel.members.includes('nina'));
  login('mira');
  store.selectChannel('c-design');
  store.moderate('nina', 'revoke');
  assert.ok(!store.activeChannel.members.includes('nina'));
});
test('verejný ban blokuje opätovný join a správca ho pozvánkou zruší', () => {
  store.moderate('mira', 'kick');
  login('mira');
  assert.throws(() => store.joinPublic('c-general'), /zakázaný/);
  login('alex');
  store.selectChannel('c-general');
  store.inviteMember('mira');
  login('mira');
  store.acceptInvitation('c-general');
  assert.ok(store.activeChannel.members.includes('mira'));
});
test('na ban sa počítajú tri odlišné hlasy, opakovaný hlas neplatí', () => {
  store.signUp({
    fullName: 'Adam Hruška',
    nickname: 'adam',
    email: 'adam@example.test',
    password: 'test-heslo',
    confirmation: 'test-heslo',
  });
  store.joinPublic('c-general');
  store.moderate('nina', 'kick');
  assert.throws(() => store.moderate('nina', 'kick'), /už hlasovali/);
  login('mira');
  store.selectChannel('c-general');
  store.moderate('nina', 'kick');
  assert.ok(store.activeChannel.members.includes('nina'));
  login('jules');
  store.selectChannel('c-general');
  store.moderate('nina', 'kick');
  assert.ok(store.activeChannel.banned.includes('nina'));
});
test('člen nemôže čítať zoznam ani písať mimo svojho kanála', () => {
  store.selectChannel('c-launch');
  assert.equal(store.activeChannel, undefined);
  assert.throws(() => store.sendMessage('nepovolené'), /pripojte/);
  assert.throws(() => store.processChannelCommand('/list'), /pripojte/);
});
test('odchod správcu odstráni kanál aj čakajúce pozvánky', () => {
  const channel = store.createChannel('temporary', true);
  store.inviteMember('nina');
  store.leaveChannel(channel.id);
  assert.ok(!store.channels.some((c) => c.id === channel.id));
  assert.ok(!store.data.invitations.some((i) => i.channelId === channel.id));
});
test('expirácia uvoľní názov po viac než 30 dňoch bez správ', () => {
  store.activeChannel.lastActivity = Date.now() - 31 * 86400_000;
  store.expireInactiveChannels();
  assert.ok(!store.channels.some((c) => c.name === 'general'));
  assert.equal(store.createChannel('general').name, 'general');
});
test('offline správy čakajú a po návrate sa doručia iba raz', () => {
  const before = store.activeChannel.messages.length;
  store.setStatus('offline');
  store.receiveDemoMessage('mira', 'nová správa', false);
  assert.equal(store.activeChannel.messages.length, before);
  assert.throws(() => store.sendMessage('odpoveď'), /online/);
  store.setStatus('online');
  assert.equal(store.activeChannel.messages.length, before + 1);
  store.setStatus('online');
  assert.equal(store.activeChannel.messages.length, before + 1);
});
test('notifikácie rešpektujú visibility, DND a presné adresovanie', () => {
  store.receiveDemoMessage('mira', 'visible', true);
  assert.equal(store.notices.length, 0);
  store.setStatus('dnd');
  store.receiveDemoMessage('mira', '@alex DND', false);
  assert.equal(store.notices.length, 0);
  store.setStatus('online');
  store.directOnly = true;
  store.receiveDemoMessage('mira', '@alexander', false);
  assert.equal(store.notices.length, 0);
  store.receiveDemoMessage('mira', '@Alex ahoj', false);
  assert.equal(store.notices.length, 1);
  assert.equal(mentions('@alexander', 'alex'), false);
});
test('príkazy na odchod vrátia zámer pre potvrdzovací dialóg', () => {
  assert.equal(store.processChannelCommand('/quit'), 'destroy');
  assert.ok(store.activeChannel);
  login('mira');
  store.selectChannel('c-general');
  assert.throws(() => store.processChannelCommand('/quit'), /správca/);
  assert.equal(store.processChannelCommand('/cancel'), 'leave');
});
test('náhľad písania obsahuje každú zmenu a skončí pri offline', () => {
  store.setDemoDraft('mira', 'a');
  assert.equal(store.typing.body, 'a');
  store.setDemoDraft('mira', 'ab');
  assert.equal(store.typing.body, 'ab');
  store.setStatus('offline');
  assert.equal(store.typing, null);
});
