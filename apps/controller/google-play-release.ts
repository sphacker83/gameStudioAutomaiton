import { AppError, object } from '../../packages/domain/errors.js';
import type { Project } from '../../packages/domain/index.js';
import { PLAY_ANSWERS, PLAY_CHECKS, PLAY_ACCESS_LABELS, PLAY_PRODUCTION_LABELS, playTestNumbersMet, type GooglePlayRelease } from '../../packages/domain/google-play-release.js';
import type { Store } from '../../packages/storage/index.js';

function invalid(label: string): never { throw new AppError('INVALID_INPUT', `${label} 값을 확인해 주세요.`); }
function choice<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) invalid(label);
  return value as T;
}
function boolean(value: unknown, label: string): boolean { if (typeof value !== 'boolean') invalid(label); return value; }
function optionalCount(value: unknown, label: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1_000_000) invalid(label);
  return value;
}
function note(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length > 5000 || value.includes('\0')) invalid(label);
  return value.trim();
}
export function saveGooglePlayRelease(store: Store, project: Project, input: unknown): Project {
  const data = object(input);
  if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0) invalid('기록 버전');
  if (data.revision !== (project.googlePlayRelease?.revision ?? 0)) {
    throw new AppError('RELEASE_PLAN_CHANGED', '다른 창에서 출시 기록이 변경되었습니다. 입력 내용을 보관한 뒤 저장된 기록으로 되돌려 다시 수정해 주세요.', 409);
  }
  const checks = object(data.checks), answers = object(data.answers), closed = object(data.closedTest);
  const checkedOn = closed.checkedOn;
  if (typeof checkedOn !== 'string' || (checkedOn !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(checkedOn)
    || !Number.isFinite(Date.parse(checkedOn)) || new Date(checkedOn).toISOString().slice(0, 10) !== checkedOn
    || Date.parse(checkedOn) > Date.now() + 86_400_000))) invalid('Console 확인일');
  const updatedAt = new Date().toISOString();
  const value: GooglePlayRelease = {
    revision: (data.revision as number) + 1, updatedAt,
    requirement: choice(data.requirement, ['unknown', 'required', 'not-required'], '테스트 의무'),
    checks: Object.fromEntries(PLAY_CHECKS.map(item => [item.id, boolean(checks[item.id], item.label)])) as GooglePlayRelease['checks'],
    answers: Object.fromEntries(PLAY_ANSWERS.map(item => [item.id, note(answers[item.id], item.label)])) as GooglePlayRelease['answers'],
    closedTest: { checkedOn, testerCount: optionalCount(closed.testerCount, '테스터 수'), continuousDays: optionalCount(closed.continuousDays, '연속 참여 일수'), consoleEligible: boolean(closed.consoleEligible, '신청 가능 확인') },
    access: choice(data.access, Object.keys(PLAY_ACCESS_LABELS) as GooglePlayRelease['access'][], '액세스 상태'),
    production: choice(data.production, Object.keys(PLAY_PRODUCTION_LABELS) as GooglePlayRelease['production'][], '출시 상태'),
    reviewNotes: note(data.reviewNotes, '심사 메모'),
  };
  if (value.closedTest.consoleEligible && (value.requirement !== 'required' || !playTestNumbersMet(value))) invalid('12명·14일 및 Console 확인일');
  if (value.production !== 'draft' && value.access !== 'approved') invalid('프로덕션 액세스 승인·사용 가능 상태');
  const updated = { ...project, googlePlayRelease: value, updatedAt };
  store.writeBatch([{ kind: 'project', id: project.id, value: updated }], [], [{ projectId: project.id, kind: 'google-play.release-plan', message: 'Google Play 출시 준비 기록을 저장했습니다.' }]);
  return updated;
}
