import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope, nextTick, watch } from 'vue';
import { createPrototypeStore, mentions } from '../src/stores/prototype.ts';

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
  store = createPrototypeStore();
  login('alex');
});

afterEach(() => store.dispose());

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
test('hlasy od členov, ktorí odišli alebo boli vyhodení, sa nezapočítajú', () => {
  login('mira');
  store.selectChannel('c-general');
  store.moderate('nina', 'kick');
  store.leaveChannel('c-general');
  login('jules');
  store.selectChannel('c-general');
  store.moderate('nina', 'kick');
  assert.deepEqual(store.activeChannel.votes.nina, ['jules']);

  login('alex');
  store.selectChannel('c-general');
  store.moderate('jules', 'kick');
  assert.equal(store.activeChannel.votes.nina, undefined);
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

test('samostatné inštancie nezdieľajú používateľa, kanály ani drafty', () => {
  const other = createPrototypeStore();
  try {
    other.signIn('mira@convo.app', 'convo-demo');
    other.createChannel('isolated');
    other.drafts['c-general'] = 'iba v druhej inštancii';
    assert.equal(store.nickname, 'alex');
    assert.equal(other.nickname, 'mira');
    assert.ok(!store.channels.some((channel) => channel.name === 'isolated'));
    assert.equal(store.drafts['c-general'], undefined);
  } finally {
    other.dispose();
  }
});

test('odvodený stav zostáva reaktívny pri prepnutí účtu a kanála', async () => {
  const names = [];
  const stop = watch(
    () => store.nickname,
    (value) => names.push(value),
  );
  login('mira');
  await nextTick();
  assert.deepEqual(names, ['mira']);
  store.selectChannel('c-design');
  assert.equal(store.activeChannel.name, 'design-team');
  stop();
});

test('ukladanie spoločného stavu prežije zánik komponentu, ktorý ho vytvoril', async () => {
  const owner = effectScope();
  const shared = owner.run(createPrototypeStore);
  owner.stop();
  try {
    shared.sendMessage('po odpojení komponentu');
    await nextTick();
    const saved = JSON.parse(localStorage.getItem('convo-prototype-v2'));
    assert.equal(saved.channels[0].messages.at(-1).body, 'po odpojení komponentu');
  } finally {
    shared.dispose();
  }
});

test('pôvodný formát dát obnoví reláciu, kanály, históriu a nastavenia', async () => {
  store.createChannel('persisted', true);
  store.sendMessage('uložená správa');
  store.directOnly = true;
  store.setStatus('dnd');
  await nextTick();
  const restored = createPrototypeStore();
  try {
    assert.equal(restored.nickname, 'alex');
    assert.equal(restored.activeChannel.name, 'persisted');
    assert.equal(restored.activeChannel.messages[0].body, 'uložená správa');
    assert.equal(restored.directOnly, true);
    assert.equal(restored.status, 'dnd');
  } finally {
    restored.dispose();
  }
});

test('poškodené uložené dáta sa nahradia funkčnými demo dátami', () => {
  for (const value of ['neplatný JSON', '{}']) {
    localStorage.setItem('convo-prototype-v2', value);
    const restored = createPrototypeStore();
    try {
      assert.equal(restored.channels.length, 5);
      assert.equal(restored.activeChannel.name, 'general');
    } finally {
      restored.dispose();
    }
  }
});

test('chyba úložiska nezablokuje správy a zobrazí upozornenie', async () => {
  localStorage.setItem = () => {
    throw new Error('storage full');
  };
  store.sendMessage('správa v pamäti');
  await nextTick();
  assert.equal(store.activeChannel.messages.at(-1).body, 'správa v pamäti');
  assert.match(store.storageWarning, /iba v pamäti/);
});

test('registrácia odmietne obsadený nick aj email bez ohľadu na veľkosť písmen', () => {
  const input = {
    fullName: 'Adam Hruška',
    nickname: 'ALEX',
    email: 'novy@example.test',
    password: 'test-heslo',
    confirmation: 'test-heslo',
  };
  assert.throws(() => store.signUp(input), /obsadený/);
  assert.throws(
    () => store.signUp({ ...input, nickname: 'novy', email: 'ALEX@CONVO.APP' }),
    /obsadený/,
  );
});

test('správca môže odobrať aj neprijatú súkromnú pozvánku', () => {
  login('mira');
  store.selectChannel('c-design');
  store.processChannelCommand('/invite nina');
  store.processChannelCommand('/revoke nina');
  login('nina');
  assert.ok(!store.invitations.some((invite) => invite.channelId === 'c-design'));
  assert.throws(() => store.acceptInvitation('c-design'), /platná/);
});

test('odchod bežného člena zachová kanál ostatným používateľom', () => {
  login('mira');
  store.selectChannel('c-general');
  assert.equal(store.processChannelCommand('/cancel'), 'leave');
  store.leaveChannel('c-general');
  assert.ok(!store.joinedChannels.some((channel) => channel.id === 'c-general'));
  assert.ok(store.channels.find((channel) => channel.id === 'c-general').members.includes('alex'));
});

test('príkazy vytvoria verejný kanál, pozvú používateľa a vrátia zoznam členov', () => {
  store.processChannelCommand('/join public-test');
  assert.equal(store.activeChannel.isPrivate, false);
  assert.equal(store.activeChannel.owner, 'alex');
  store.processChannelCommand('/invite nina');
  assert.equal(store.data.invitations.at(-1).to, 'nina');
  assert.equal(store.processChannelCommand('/list'), 'members');
  assert.throws(() => store.processChannelCommand('/list extra'), /argumenty/);
});

test('moderovanie chráni správcu a rešpektuje typ kanála', () => {
  login('mira');
  store.selectChannel('c-general');
  assert.throws(() => store.moderate('alex', 'kick'), /Správcu/);
  assert.throws(() => store.moderate('nina', 'revoke'), /súkromného/);
  store.selectChannel('c-design');
  assert.throws(() => store.moderate('alex', 'kick'), /revoke/);
});

test('notifikácia obsahuje odosielateľa, výňatok a čas správy', () => {
  store.receiveDemoMessage('mira', 'x'.repeat(200), false);
  const notice = store.notices[0];
  const message = store.activeChannel.messages.at(-1);
  assert.equal(notice.from, 'mira');
  assert.equal(notice.body, 'x'.repeat(120));
  assert.equal(notice.sentAt, message.sentAt);
  assert.equal(notice.id, message.id);
});

test('správy majú spoločný limit a odoslanie vyčistí draft', () => {
  const before = store.activeChannel.messages.length;
  assert.throws(() => store.sendMessage('x'.repeat(4001)), /4 000/);
  assert.throws(() => store.receiveDemoMessage('mira', 'x'.repeat(4001), false), /4 000/);
  assert.equal(store.activeChannel.messages.length, before);
  store.drafts[store.activeChannelId] = 'rozpísaná správa';
  store.sendMessage('  hotová správa  ');
  assert.equal(store.activeChannel.messages.at(-1).body, 'hotová správa');
  assert.equal(store.drafts[store.activeChannelId], '');
});

test('prepnutie kanála a odhlásenie vyčistia živý náhľad písania', () => {
  store.setDemoDraft('mira', 'rozpísaný text');
  store.selectChannel('c-design');
  assert.equal(store.typing, null);
  store.setDemoDraft('mira', 'ďalší text');
  store.drafts['c-design'] = 'vlastný text';
  store.signOut();
  assert.equal(store.typing, null);
  assert.deepEqual(store.drafts, {});
  assert.equal(sessionStorage.getItem('convo-prototype-session'), null);
});
