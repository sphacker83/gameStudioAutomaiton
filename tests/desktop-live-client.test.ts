import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../apps/desktop/src/api.js';

test('browser client ignores legacy demo preference and requests actual state', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let preferenceReads = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => { preferenceReads++; return 'demo'; },
  } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  const paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    paths.push(String(input));
    return new Response(JSON.stringify({ ok: true, data: { runtime: { mode: 'live' } } }));
  });
  const client = new ApiClient();
  assert.equal((await client.getState()).ok, true);
  assert.deepEqual(paths, ['/api/state']);
  assert.equal(preferenceReads, 0);
  for (const path of ['/demo', '/demo/state', '/demo/reset']) {
    const result = await client.request('GET', path);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'unsupported_mode');
  }
  assert.deepEqual(paths, ['/api/state']);
});

test('Electron client uses actual IPC paths without requesting a mode switch', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const requests: Array<{ method: string; path: string }> = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { appOps: {
    isElectron: true,
    request: async (method: string, path: string) => { requests.push({ method, path }); return { ok: true, data: {} }; },
    getMode: () => { throw new Error('Legacy mode must not be loaded'); },
    setMode: () => { throw new Error('Mode switch must not be requested'); },
  } } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  const client = new ApiClient();
  await client.getState();
  await client.request('PUT', '/projects/p-1/release-guide/steam', {});
  assert.equal((await client.request('POST', '/demo/reset', {})).ok, false);
  assert.deepEqual(requests, [
    { method: 'GET', path: '/state' },
    { method: 'PUT', path: '/projects/p-1/release-guide/steam' },
  ]);
});
