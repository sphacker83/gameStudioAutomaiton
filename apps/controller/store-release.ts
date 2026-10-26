import { AppError, object } from '../../packages/domain/errors.js';
import type { Project } from '../../packages/domain/index.js';
import { STORE_RELEASE_GUIDES, type GuidedStore, type StoreReleaseRecord } from '../../packages/domain/store-release.js';
import type { Store } from '../../packages/storage/index.js';

function invalid(label: string): never { throw new AppError('INVALID_INPUT', `${label} 값을 확인해 주세요.`); }
function date(value: unknown, label: string): string {
  if (typeof value !== 'string' || (value !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value
    || Date.parse(value) > Date.now() + 86_400_000))) invalid(label);
  return value;
}
export function saveStoreReleaseGuide(store: Store, project: Project, provider: GuidedStore, input: unknown): Project {
  const data = object(input), guide = STORE_RELEASE_GUIDES[provider];
  if (!guide) invalid('스토어');
  if (!Number.isSafeInteger(data.revision) || (data.revision as number) < 0) invalid('기록 버전');
  if (data.revision !== (project.storeReleaseGuides?.[provider]?.revision ?? 0)) {
    throw new AppError('RELEASE_PLAN_CHANGED', '다른 창에서 이 스토어의 출시 기록이 변경되었습니다. 입력 내용을 보관한 뒤 저장된 기록으로 되돌려 다시 수정해 주세요.', 409);
  }
  const checks = object(data.checks), states = object(data.states), dates = object(data.dates), notes = object(data.notes);
  const updatedAt = new Date().toISOString();
  const value: StoreReleaseRecord = {
    revision: (data.revision as number) + 1, updatedAt,
    checks: Object.fromEntries(guide.checks.map(field => {
      const checked = checks[field.id];
      if (typeof checked !== 'boolean') invalid(field.label);
      return [field.id, checked];
    })),
    states: Object.fromEntries(guide.states.map(field => {
      const state = states[field.id];
      if (typeof state !== 'string' || !field.options.some(([key]) => key === state)) invalid(field.label);
      return [field.id, state];
    })),
    dates: Object.fromEntries(guide.dates.map(field => [field.id, date(dates[field.id], field.label)])),
    notes: Object.fromEntries(guide.notes.map(field => {
      const note = notes[field.id];
      if (typeof note !== 'string' || note.length > 5000 || note.includes('\0')) invalid(field.label);
      return [field.id, note.trim()];
    })),
  };
  if (provider === 'steam' && value.states.release === 'published'
    && (value.states.storeReview !== 'approved' || value.states.buildReview !== 'approved'
      || value.states.comingSoon !== 'met' || !['met', 'not_required'].includes(value.states.feeWait!))) {
    throw new AppError('INVALID_INPUT', 'Steam 공개를 기록하려면 두 심사 승인·Coming Soon 공개 기간·등록비 대기 조건을 먼저 확인해 주세요.');
  }
  const updated: Project = { ...project, storeReleaseGuides: { ...project.storeReleaseGuides, [provider]: value }, updatedAt };
  store.writeBatch([{ kind: 'project', id: project.id, value: updated }], [], [{ projectId: project.id, kind: 'store.release-guide', message: `${guide.name} 출시 준비 기록을 저장했습니다.` }]);
  return updated;
}
