import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, ApiError } from '../src/services/api.ts';

test('HTTP klient posiela Bearer token, JSON a zvládne prázdnu 204', async () => {
  let input;
  const api = createApi({
    baseUrl: '/api/v1/',
    token: () => 'session-token',
    unauthorized() {},
    fetch: async (...args) => {
      input = args;
      return new Response(null, { status: 204 });
    },
  });
  assert.equal(await api('/account/logout', 'POST', { presence: 'offline' }), undefined);
  assert.equal(input[0], '/api/v1/account/logout');
  assert.equal(input[1].headers.Authorization, 'Bearer session-token');
  assert.equal(input[1].body, '{"presence":"offline"}');
});

test('validácia zachová správy pri poliach a sieťová chyba má použiteľný text', async () => {
  const api = createApi({
    baseUrl: '',
    token: () => '',
    unauthorized() {},
    fetch: async () =>
      Response.json(
        { errors: [{ field: 'nickname', message: 'Prezývka je obsadená.' }] },
        { status: 422 },
      ),
  });
  await assert.rejects(
    api('/auth/signup', 'POST', {}),
    (error) => error instanceof ApiError && error.fields.nickname === 'Prezývka je obsadená.',
  );
  const offline = createApi({
    baseUrl: '',
    token: () => '',
    unauthorized() {},
    fetch: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  await assert.rejects(offline('/channels'), /Server nie je dostupný/);
});

test('401 z predošlej relácie neodhlási nový účet', async () => {
  let token = 'old';
  let unauthorized = 0;
  const api = createApi({
    baseUrl: '',
    token: () => token,
    unauthorized() {
      unauthorized++;
    },
    fetch: async () => {
      token = 'new';
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    },
  });
  await assert.rejects(api('/channels'), /Unauthorized/);
  assert.equal(unauthorized, 0);
  const expired = createApi({
    baseUrl: '',
    token: () => token,
    unauthorized() {
      unauthorized++;
    },
    fetch: async () => Response.json({}, { status: 401 }),
  });
  await assert.rejects(expired('/channels'));
  assert.equal(unauthorized, 1);
});
