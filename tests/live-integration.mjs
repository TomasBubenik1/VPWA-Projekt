// Run against the local server: npm run test:integration (server must already be running).
import assert from 'node:assert/strict';
import { createWorkspaceStore } from '../src/stores/workspace.ts';

const baseUrl = process.env.CONVO_TEST_API ?? 'http://localhost:3333/api/v1';
const suffix = Date.now().toString(36);
const accounts = [];
const stores = [];
async function until(predicate, label) {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Nedokončená skúška: ${label}. ${stores.map((s) => s.feedback).join(' ')}`);
}
async function account(index) {
  const store = createWorkspaceStore({ baseUrl });
  stores.push(store);
  const input = {
    firstName: index ? 'Mira' : 'Alex',
    lastName: 'Test',
    nickname: `test${suffix}${index}`,
    email: `convo-${suffix}-${index}@example.test`,
    password: 'Convo-test-123',
    passwordConfirmation: 'Convo-test-123',
  };
  await store.signUp(input);
  accounts.push(input);
  await until(() => store.connection === 'connected', 'prihlásenie a spojenie');
  return store;
}
try {
  const a = await account(0);
  const b = await account(1);
  assert.equal(a.user.firstName, 'Alex');
  const publicChannel = await a.createChannel(`public-${suffix}`);
  await b.refresh();
  await b.joinPublic(publicChannel.id);
  await until(() => a.activeChannel.members.length === 2, 'živá zmena členstva');
  await b.sendMessage(`Ahoj @${a.nickname}`);
  await until(
    () => a.activeChannel.messages.some((m) => m.content === `Ahoj @${a.nickname}`),
    'živá správa',
  );
  assert.ok(a.activeChannel.messages.at(-1).mentions.includes(a.nickname));
  b.updateDraft('Rozpísaný text');
  await until(() => a.typing?.body === 'Rozpísaný text', 'živý náhľad');
  b.clearTyping();
  await until(() => !a.typing, 'ukončenie písania');
  const privateChannel = await a.createChannel(`private-${suffix}`, true);
  await assert.rejects(b.joinPublic(privateChannel.id), /pozvánku/);
  await a.inviteMember(b.nickname);
  await until(() => b.invitations.some((i) => i.channelId === privateChannel.id), 'živá pozvánka');
  await b.acceptInvitation(b.invitations.find((i) => i.channelId === privateChannel.id).id);
  await b.sendMessage('Súkromná správa');
  await until(
    () => a.activeChannel.messages.some((m) => m.content === 'Súkromná správa'),
    'súkromný kanál',
  );
  // Messages from an inactive channel still arrive through its subscription.
  await b.selectChannel(publicChannel.id);
  await b.sendMessage('Správa mimo otvoreného kanála');
  await until(
    () =>
      a.joinedChannels
        .find((c) => c.id === publicChannel.id)
        .messages.some((m) => m.content === 'Správa mimo otvoreného kanála'),
    'odber všetkých kanálov',
  );
  await a.setStatus('offline');
  assert.equal(a.connection, 'disconnected');
  for (let i = 0; i < 65; i++) await b.sendMessage(`Zmeškaná správa ${i}`);
  await a.setStatus('online');
  await until(
    () =>
      a.connection === 'connected' &&
      a.joinedChannels
        .find((c) => c.id === publicChannel.id)
        .messages.some((m) => m.content === 'Zmeškaná správa 64'),
    'návrat online',
  );
  const recovered = a.joinedChannels.find((c) => c.id === publicChannel.id).messages;
  assert.equal(recovered.filter((m) => m.content.startsWith('Zmeškaná')).length, 65);
  assert.equal(new Set(recovered.map((m) => m.id)).size, recovered.length);
  await a.setStatus('dnd');
  assert.equal(a.connection, 'connected');
  await a.setNotificationMode('mentionsOnly');
  assert.equal(a.user.notificationMode, 'mentionsOnly');
  await a.moderate(b.nickname, 'revoke', privateChannel.id);
  await until(
    () => !b.joinedChannels.some((c) => c.id === privateChannel.id) && b.connection === 'connected',
    'odobratie členstva a nové spojenie',
  );
  await a.selectChannel(publicChannel.id);
  await a.moderate(b.nickname, 'kick');
  await until(() => !b.joinedChannels.some((c) => c.id === publicChannel.id), 'vylúčenie');
  await assert.rejects(b.joinPublic(publicChannel.id), /zakázaný/);
  await a.inviteMember(b.nickname);
  await until(
    () => b.invitations.some((i) => i.channelId === publicChannel.id),
    'obnovenie prístupu',
  );
  await b.acceptInvitation(b.invitations.find((i) => i.channelId === publicChannel.id).id);
  await b.leaveChannel(publicChannel.id);
  await a.destroyChannel(privateChannel.id);
  await a.destroyChannel(publicChannel.id);
  await until(() => !b.channels.some((c) => c.id === publicChannel.id), 'zrušenie kanála');
  await a.signOut();
  await a.signIn(accounts[0].email, accounts[0].password);
  await until(() => a.connection === 'connected', 'nové prihlásenie');
  await a.signOut();
  await b.signOut();
  console.log(
    'PASS: 2 účty, HTTP autentifikácia, verejné/súkromné kanály, živé členstvo, pozvánky, správy, zmienky, draft, všetky odbery, 65 zmeškaných správ, DND, nastavenia, revoke/kick, obnovenie prístupu, odchod, zrušenie a odhlásenie.',
  );
} finally {
  for (const store of stores) {
    for (const channel of store.joinedChannels.filter(
      (item) =>
        item.ownerId === store.user?.id &&
        [`public-${suffix}`, `private-${suffix}`].includes(item.name),
    )) {
      await store.destroyChannel(channel.id).catch(() => {});
    }
    if (store.user) await store.signOut().catch(() => {});
    store.dispose();
  }
}
