import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startController } from '../apps/controller/server.js';
import { CredentialVault } from '../packages/credentials/index.js';
import { DEFAULT_POLICY, type ApiResult, type AppState, type Project } from '../packages/domain/index.js';
import { emptyGooglePlayRelease } from '../packages/domain/google-play-release.js';
import { emptyStoreRelease, STORE_RELEASE_GUIDES, storeReleaseProgress, storeSubmissionDraft, type GuidedStore, type StoreReleaseRecord } from '../packages/domain/store-release.js';
import { isAllowedApiPath, isAllowedExternalUrl } from '../apps/desktop/electron/security.js';

function readySteam(): StoreReleaseRecord {
  const record = emptyStoreRelease('steam');
  record.states = { storeReview: 'approved', buildReview: 'approved', comingSoon: 'met', feeWait: 'met', release: 'not_released' };
  return record;
}

test('iOS TestFlight approval never counts as App Review approval or public release', () => {
  const record = emptyStoreRelease('app-store');
  assert.equal(storeReleaseProgress('app-store', record).completed, 0);
  record.states.testflight = 'finished';
  assert.equal(storeReleaseProgress('app-store', record).completed, 0);
  record.states.testflight = 'external_review';
  assert.match(storeReleaseProgress('app-store', record).next, /정식 출시 승인이 아닙니다/);
  record.states.review = 'ready';
  assert.match(storeReleaseProgress('app-store', record).next, /제출 전/);
  record.states.review = 'waiting';
  assert.equal(storeReleaseProgress('app-store', record).completed, 0);
  record.states.review = 'approved'; record.states.releaseMode = 'manual';
  assert.equal(storeReleaseProgress('app-store', record).completed, 1);
  assert.match(storeReleaseProgress('app-store', record).next, /Release This Version/);
  record.states.review = 'published';
  assert.equal(storeReleaseProgress('app-store', record).completed, 2);
  for (const item of STORE_RELEASE_GUIDES['app-store'].checks) record.checks[item.id] = true;
  assert.equal(storeReleaseProgress('app-store', record).completed, 10);
  record.states.review = 'changes_requested';
  assert.equal(storeReleaseProgress('app-store', record).completed, 8);
  assert.match(storeReleaseProgress('app-store', record).next, /반려/);
});

test('Steam tracks both reviews and both waiting conditions without date-based publication', () => {
  const record = emptyStoreRelease('steam');
  record.dates = { feePaidOn: '2020-01-01', comingSoonOn: '2020-01-01' };
  assert.equal(storeReleaseProgress('steam', record).completed, 0);
  assert.match(storeReleaseProgress('steam', record).next, /스토어 페이지 심사/);
  record.states.storeReview = 'approved';
  assert.match(storeReleaseProgress('steam', record).next, /Coming Soon으로 공개/);
  record.states.buildReview = 'in_review';
  assert.match(storeReleaseProgress('steam', record).next, /Coming Soon으로 공개/);
  record.states.buildReview = 'not_started'; record.states.comingSoon = 'waiting';
  assert.match(storeReleaseProgress('steam', record).next, /빌드 심사를 제출/);
  record.states.buildReview = 'approved';
  assert.equal(storeReleaseProgress('steam', record).completed, 2);
  assert.match(storeReleaseProgress('steam', record).next, /최소 2주/);
  record.states.comingSoon = 'met';
  assert.match(storeReleaseProgress('steam', record).next, /30일/);
  record.states.feeWait = 'not_required';
  assert.equal(storeReleaseProgress('steam', record).completed, 4);
  assert.match(storeReleaseProgress('steam', record).next, /Release App/);
  record.states.release = 'published';
  assert.equal(storeReleaseProgress('steam', record).completed, 5);
  for (const item of STORE_RELEASE_GUIDES.steam.checks) record.checks[item.id] = true;
  assert.equal(storeReleaseProgress('steam', record).completed, 10);
});

test('review drafts contain only recorded notes and missing-field prompts', () => {
  for (const provider of ['app-store', 'steam'] as const) {
    const record = emptyStoreRelease(provider);
    record.notes.testing = '실기기 저장 복구 확인';
    const output = storeSubmissionDraft(provider, '테스트 게임', record);
    assert.match(output, /테스트 게임/); assert.match(output, /실기기 저장 복구 확인/); assert.match(output, /\[작성 필요\]/);
    assert.doesNotMatch(output, /모든 테스트 통과/);
  }
});

test('Electron restricts release guide routes to supported stores and allows official links', () => {
  for (const prefix of ['', '/demo']) for (const provider of ['app-store', 'steam']) {
    const path = `${prefix}/projects/p-1/release-guide/${provider}`;
    assert.equal(isAllowedApiPath('PUT', path), true);
    assert.equal(isAllowedApiPath('POST', path), false);
    assert.equal(isAllowedApiPath('GET', path), false);
    assert.equal(isAllowedApiPath('PUT', path + '/extra'), false);
  }
  assert.equal(isAllowedApiPath('PUT', '/projects/p-1/release-guide/google-ads'), false);
  for (const guide of Object.values(STORE_RELEASE_GUIDES)) {
    assert.equal(isAllowedExternalUrl(guide.consoleUrl), true);
    for (const [, url] of guide.links) assert.equal(isAllowedExternalUrl(url), true, url);
  }
});

test('store records preserve Google Play and other stores, survive restart, isolate modes and reject stale or invalid inputs', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'appops-store-guide-'));
  let key: Buffer | undefined, externalCalls = 0;
  const vault = new CredentialVault(join(directory, 'credentials'), { keyProvider: { name: 'test-memory', getKey: async () => key, setKey: async value => { key = value; } } });
  const options = { directory: join(directory, 'data'), port: 0, vault, connectors: [], scanToolchains: async () => [], fetch: (async () => { externalCalls++; throw new Error('Unexpected network'); }) as typeof fetch };
  let controller = await startController(options);
  t.after(async () => { await controller.close(); await rm(directory, { recursive: true, force: true }); });
  const googlePlayRelease = emptyGooglePlayRelease(); googlePlayRelease.answers.feedback = '기존 Google Play 기록';
  const project: Project = { id: 'guide-project', name: '게임', rootPath: directory, engine: 'godot', engineVersion: null, appIdentifier: 'com.example.game', targets: ['android', 'ios', 'windows'], findings: [], inspectedAt: '', createdAt: '', updatedAt: '', policy: DEFAULT_POLICY, googlePlayRelease };
  controller.service.store.put('project', project.id, project);
  controller.service.store.put('project', 'other-project', { ...project, id: 'other-project' });
  async function request<T>(path: string, method = 'GET', body?: unknown, authorized = true) {
    const response = await fetch(`http://127.0.0.1:${controller.port}/api${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: 'Bearer ' + controller.token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as ApiResult<T> };
  }
  function unwrap<T>(body: ApiResult<T>): T { assert.ok(body.ok, JSON.stringify(body)); return body.data; }
  const records: Partial<Record<GuidedStore, StoreReleaseRecord>> = {};
  for (const provider of ['app-store', 'steam'] as const) {
    const path = `/projects/${project.id}/release-guide/${provider}`;
    const record = provider === 'steam' ? readySteam() : emptyStoreRelease(provider);
    record.notes.testing = `${provider} 실행 확인`; record.checks.account = true;
    assert.equal((await request(path, 'PUT', record, false)).status, 401);
    const saved = unwrap((await request<Project>(path, 'PUT', record)).body);
    records[provider] = saved.storeReleaseGuides![provider]!;
    assert.equal(records[provider]!.revision, 1);
    assert.equal((await request(path, 'PUT', record)).status, 409);
    assert.deepEqual(saved.googlePlayRelease, googlePlayRelease);
    const current = records[provider]!;
    const invalid = [
      { ...current, revision: -1 },
      { ...current, checks: { ...current.checks, account: 'true' } },
      { ...current, states: {} },
      { ...current, dates: {} },
      { ...current, notes: { ...current.notes, testing: 'x'.repeat(5001) } },
      { ...current, notes: { ...current.notes, testing: ['bad'] } },
      ...['2026-02-30', '2100-01-01', 'yesterday'].map(value => ({ ...current, dates: { ...current.dates, [STORE_RELEASE_GUIDES[provider].dates[0]!.id]: value } })),
    ];
    for (const input of invalid) assert.equal((await request(path, 'PUT', input)).status, 400);
    assert.equal((await request(`/projects/missing/release-guide/${provider}`, 'PUT', record)).status, 404);
  }
  assert.deepEqual(controller.service.project(project.id).storeReleaseGuides, records);
  assert.equal(controller.service.project('other-project').storeReleaseGuides, undefined);
  const steamPath = `/projects/${project.id}/release-guide/steam`;
  for (const [field, value] of [['storeReview', 'in_review'], ['buildReview', 'changes_requested'], ['comingSoon', 'waiting'], ['feeWait', 'unknown']]) {
    assert.equal((await request(steamPath, 'PUT', { ...records.steam, states: { ...records.steam!.states, release: 'published', [field!]: value } })).status, 400);
  }
  assert.equal((await request(`/projects/${project.id}/release-guide/google-ads`, 'PUT', {})).status, 404);
  const demo = unwrap((await request<AppState>('/demo/state')).body).projects[0]!;
  const demoPath = `/demo/projects/${demo.id}/release-guide/steam`;
  assert.equal((await request(demoPath, 'PUT', readySteam())).status, 200);
  assert.equal((await request(`/projects/${demo.id}/release-guide/steam`, 'PUT', readySteam())).status, 404);
  await controller.close(); controller = await startController(options);
  const reloaded = unwrap((await request<AppState>('/state')).body).projects.find(item => item.id === project.id)!;
  assert.deepEqual(reloaded.storeReleaseGuides, records); assert.deepEqual(reloaded.googlePlayRelease, googlePlayRelease);
  assert.equal((await request(demoPath, 'PUT', { ...readySteam(), revision: 1 })).status, 200);
  assert.equal(externalCalls, 0); assert.equal(controller.service.store.runs().length, 0);
});
