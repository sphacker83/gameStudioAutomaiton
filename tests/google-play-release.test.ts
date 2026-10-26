import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startController } from '../apps/controller/server.js';
import { CredentialVault } from '../packages/credentials/index.js';
import { DEFAULT_POLICY, type AppState, type Project } from '../packages/domain/index.js';
import {
  emptyGooglePlayRelease, playApplicationDraft, playReleaseProgress, playTestComplete, type GooglePlayRelease,
} from '../packages/domain/google-play-release.js';
import { isAllowedApiPath } from '../apps/desktop/electron/security.js';

function eligible(): GooglePlayRelease {
  return { ...emptyGooglePlayRelease(), requirement: 'required', closedTest: { testerCount: 12, continuousDays: 14, checkedOn: '2026-10-01', consoleEligible: true } };
}

test('12 continuous testers for 14 days require a separate Console eligibility confirmation', () => {
  const plan = eligible();
  assert.equal(playTestComplete(plan), true);
  assert.equal(playTestComplete({ ...plan, closedTest: { ...plan.closedTest, testerCount: 11 } }), false);
  assert.equal(playTestComplete({ ...plan, closedTest: { ...plan.closedTest, continuousDays: 13 } }), false);
  assert.equal(playTestComplete({ ...plan, closedTest: { ...plan.closedTest, consoleEligible: false } }), false);
  assert.equal(playTestComplete({ ...plan, closedTest: { ...plan.closedTest, checkedOn: '' } }), false);
  assert.equal(playTestComplete({ ...plan, requirement: 'unknown' }), false);
  assert.equal(playTestComplete({ ...emptyGooglePlayRelease(), requirement: 'not-required' }), true);
  assert.equal(playReleaseProgress(emptyGooglePlayRelease()).completed, 0);
  assert.equal(playReleaseProgress(plan).completed, 1);
  assert.match(playReleaseProgress(plan).next, /액세스를 신청/);
  // 오래된 확인일로부터 일수를 늘리거나, 신청 조건을 승인/공개로 승격하지 않는다.
  assert.equal(playTestComplete({ ...plan, closedTest: { ...plan.closedTest, continuousDays: 0, checkedOn: '2020-01-01' } }), false);
});

test('access review, further testing, production review, approval and publication remain distinct', () => {
  const plan = eligible();
  assert.match(playReleaseProgress({ ...plan, access: 'in_review' }).next, /7일/);
  assert.match(playReleaseProgress({ ...plan, access: 'needs_testing' }).next, /추가 테스트/);
  assert.match(playReleaseProgress({ ...plan, access: 'approved' }).next, /프로덕션 트랙/);
  assert.equal(playReleaseProgress({ ...plan, access: 'approved', production: 'in_review' }).completed, 2);
  assert.equal(playReleaseProgress({ ...plan, access: 'approved', production: 'approved' }).completed, 2);
  assert.equal(playReleaseProgress({ ...plan, access: 'approved', production: 'published' }).completed, 3);
  assert.match(playReleaseProgress({ ...plan, access: 'approved', production: 'changes_requested' }).next, /수정 요청/);
  assert.match(playReleaseProgress({ ...plan, access: 'approved', production: 'published' }).next, /모니터링/);
  for (const id of Object.keys(plan.checks) as (keyof typeof plan.checks)[]) plan.checks[id] = true;
  assert.equal(playReleaseProgress({ ...plan, access: 'approved', production: 'published' }).completed, 10);
});

test('application draft preserves actual feedback and marks missing answers', () => {
  const plan = eligible();
  plan.answers.feedback = '저장 복구 오류를 제보받음'; plan.answers.changes = '1.2에서 복구 오류 수정';
  const draft = playApplicationDraft('테스트 게임', plan);
  assert.match(draft, /테스트 게임/); assert.match(draft, /저장 복구 오류를 제보받음/);
  assert.match(draft, /1.2에서 복구 오류 수정/); assert.match(draft, /\[작성 필요\]/);
  assert.doesNotMatch(draft, /모든 테스트 통과/);
});

test('Electron allows only the release-record PUT route in both runtime modes', () => {
  for (const prefix of ['', '/demo']) {
    assert.equal(isAllowedApiPath('PUT', `${prefix}/projects/p-1/google-play-release`), true);
    assert.equal(isAllowedApiPath('POST', `${prefix}/projects/p-1/google-play-release`), false);
    assert.equal(isAllowedApiPath('PUT', `${prefix}/projects/p-1/google-play-release/extra`), false);
  }
});

test('release records persist across restart, isolate projects and demo, reject invalid or stale writes', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'appops-play-release-'));
  let key: Buffer | undefined;
  const vault = new CredentialVault(join(directory, 'credentials'), { keyProvider: { name: 'test-memory', getKey: async () => key, setKey: async value => { key = value; } } });
  let externalCalls = 0;
  const options = { directory: join(directory, 'data'), port: 0, vault, connectors: [], scanToolchains: async () => [], fetch: (async () => { externalCalls++; throw new Error('Unexpected network'); }) as typeof fetch };
  let controller = await startController(options);
  t.after(async () => { await controller.close(); await rm(directory, { recursive: true, force: true }); });
  const project: Project = { id: 'play-project', name: '게임', rootPath: directory, engine: 'godot', engineVersion: null, appIdentifier: 'com.example.game', targets: ['android'], findings: [], inspectedAt: '', createdAt: '', updatedAt: '', policy: DEFAULT_POLICY };
  controller.service.store.put('project', project.id, project);
  controller.service.store.put('project', 'other-project', { ...project, id: 'other-project' });
  async function request(path: string, method = 'GET', input?: unknown, authorized = true) {
    const response = await fetch(`http://127.0.0.1:${controller.port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: 'Bearer ' + controller.token } : {}) }, body: input === undefined ? undefined : JSON.stringify(input) });
    return { status: response.status, body: await response.json() as { ok: boolean; data: any; error?: { code: string } } };
  }
  const path = `/projects/${project.id}/google-play-release`;
  const plan = eligible(); plan.checks.bundle = true; plan.answers.feedback = '로그인 오류 제보';
  assert.equal((await request(path, 'PUT', plan, false)).status, 401);
  const saved = await request(path, 'PUT', plan);
  assert.equal(saved.status, 200); assert.equal(saved.body.data.googlePlayRelease.revision, 1);
  assert.equal(saved.body.data.googlePlayRelease.answers.feedback, plan.answers.feedback);
  assert.deepEqual(saved.body.data.policy, DEFAULT_POLICY);
  assert.equal(controller.service.project('other-project').googlePlayRelease, undefined);
  const stale = await request(path, 'PUT', plan);
  assert.equal(stale.status, 409); assert.equal(stale.body.error?.code, 'RELEASE_PLAN_CHANGED');
  const current = saved.body.data.googlePlayRelease as GooglePlayRelease;
  const invalid = [
    { ...current, requirement: 'bogus' }, { ...current, access: 'published' },
    { ...current, checks: { ...current.checks, bundle: 'true' } },
    { ...current, answers: { ...current.answers, feedback: 'x'.repeat(5001) } },
    { ...current, production: 'published' },
    ...[-1, 1.5, '12'].map(testerCount => ({ ...current, closedTest: { ...current.closedTest, testerCount } })),
    ...['2026-02-30', '2100-01-01', 'yesterday', ''].map(checkedOn => ({ ...current, closedTest: { ...current.closedTest, checkedOn } })),
    { ...current, closedTest: { ...current.closedTest, testerCount: 11 } },
    { ...current, closedTest: { ...current.closedTest, continuousDays: 13 } },
  ];
  for (const input of invalid) assert.equal((await request(path, 'PUT', input)).status, 400, JSON.stringify(input).slice(0, 200));
  assert.deepEqual(controller.service.project(project.id).googlePlayRelease, current);
  assert.equal((await request('/projects/missing/google-play-release', 'PUT', plan)).status, 404);
  const demoState = (await request('/demo/state')).body.data as AppState;
  const demoProject = demoState.projects[0]!;
  assert.equal((await request(`/demo/projects/${demoProject.id}/google-play-release`, 'PUT', { ...plan, answers: { ...plan.answers, feedback: '데모 기록' } })).status, 200);
  assert.equal((await request(`/projects/${demoProject.id}/google-play-release`, 'PUT', plan)).status, 404);
  assert.equal(controller.service.project(project.id).googlePlayRelease?.answers.feedback, '로그인 오류 제보');
  await controller.close(); controller = await startController(options);
  assert.deepEqual(controller.service.project(project.id).googlePlayRelease, current);
  const state = (await request('/state')).body.data as AppState;
  assert.equal(state.projects.find(item => item.id === project.id)?.googlePlayRelease?.revision, 1);
  assert.equal((await request(`/demo/projects/${demoProject.id}/google-play-release`, 'PUT', { ...plan, revision: 1 })).status, 200);
  assert.equal(externalCalls, 0);
  assert.equal(controller.service.store.runs().length, 0);
});
