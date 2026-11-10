import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createWorkspaceStore } from '../src/stores/workspace.ts';

const port = 3344;
const origin = `http://127.0.0.1:${port}`;
const baseUrl = `${origin}/api/v1`;
const suffix = Date.now().toString(36);
const stores = [];
const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
let server;
let diagnostic = '';
async function until(predicate, label) {
  for (let i = 0; i < 300; i++) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${label}: ${diagnostic}`);
}
async function startServer() {
  server = spawn(process.execPath, ['--import=@poppinss/ts-exec', 'bin/server.ts'], {
    cwd: fileURLToPath(new URL('../server/', import.meta.url)),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_URL: origin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => {
    diagnostic = (diagnostic + chunk).slice(-4000);
  });
  server.stderr.on('data', (chunk) => {
    diagnostic = (diagnostic + chunk).slice(-4000);
  });
  await until(async () => {
    try {
      return (await fetch(`${baseUrl}/account/profile`)).status === 401;
    } catch {
      return false;
    }
  }, 'Server sa nespustil');
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const exited = once(server, 'exit');
  server.kill();
  await exited;
  server = undefined;
}
try {
  await startServer();
  const a = createWorkspaceStore({ baseUrl, storage });
  stores.push(a);
  await a.signUp({
    firstName: 'Restart',
    lastName: 'Test',
    nickname: `restart${suffix}`,
    email: `restart-${suffix}@example.test`,
    password: 'Convo-test-123',
    passwordConfirmation: 'Convo-test-123',
  });
  await until(() => a.connection === 'connected', 'Prvé spojenie');
  const channel = await a.createChannel(`restart-${suffix}`);
  await a.sendMessage('Správa uložená pred reštartom');
  const savedId = a.activeChannel.messages.at(-1).id;
  await stopServer();
  await until(() => a.connection === 'disconnected', 'Odpojenie servera');
  await startServer();
  await until(() => a.connection === 'connected', 'Obnova spojenia s novým lístkom');
  const restored = createWorkspaceStore({ baseUrl, storage });
  stores.push(restored);
  await restored.initialize();
  await until(() => restored.connection === 'connected', 'Obnovenie relácie');
  assert.equal(restored.user.id, a.user.id);
  assert.ok(
    restored.activeChannel.messages.some(
      (message) => message.id === savedId && message.content === 'Správa uložená pred reštartom',
    ),
  );
  await restored.sendMessage('Správa po reštarte');
  await until(
    () => a.activeChannel.messages.some((message) => message.content === 'Správa po reštarte'),
    'Živá komunikácia po reštarte',
  );
  await a.destroyChannel(channel.id);
  await a.signOut();
  console.log(
    'PASS: reštart samostatného servera, nové WebSocket spojenie, obnovenie relácie z tokenu a správy pretrvávajúce v SQLite.',
  );
} finally {
  stores.forEach((store) => store.dispose());
  await stopServer();
}
