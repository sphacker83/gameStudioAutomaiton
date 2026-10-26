import { useEffect, useState } from 'react';
import { ClipboardCheck, ExternalLink, Save } from 'lucide-react';
import type { Project } from '../../../../packages/domain';
import { emptyStoreRelease, STORE_RELEASE_GUIDES, storeReleaseProgress, storeSubmissionDraft, type GuidedStore, type StoreReleaseRecord } from '../../../../packages/domain/store-release';
import { api } from '../api';
import { useAction } from '../useAction';
import { Badge, Card, Field, Notice } from '../components/ui';
import { formatDateTime } from '../format';

export function StoreReleaseOverview({ provider }: { provider: GuidedStore }) {
  const guide = STORE_RELEASE_GUIDES[provider];
  return <details className="play-guide-details">
    <summary>{guide.name} 출시 순서와 주요 조건</summary>
    <ol className="play-release-steps">{guide.steps.map(([title, detail]) => <li key={title}><strong>{title}</strong><span>{detail}</span></li>)}</ol>
    <p className="small muted">{guide.notice}</p>
  </details>;
}

export function StoreReleaseGuide({ provider, project, refresh, onDirtyChange }: {
  provider: GuidedStore; project: Project; refresh: () => Promise<void>; onDirtyChange: (dirty: boolean) => void;
}) {
  const guide = STORE_RELEASE_GUIDES[provider];
  const [draft, setDraft] = useState(() => project.storeReleaseGuides?.[provider] ?? emptyStoreRelease(provider));
  const [saved, setSaved] = useState(draft);
  const [copyMessage, setCopyMessage] = useState('');
  const [linkError, setLinkError] = useState('');
  const action = useAction<Project>(refresh);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const latest = project.storeReleaseGuides?.[provider];
  const progress = storeReleaseProgress(provider, draft);
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty && latest && latest.revision > saved.revision) { setDraft(latest); setSaved(latest); }
  }, [latest, dirty, saved.revision]);
  function update<K extends 'checks' | 'states' | 'dates' | 'notes'>(kind: K, id: string, value: StoreReleaseRecord[K][string]) {
    setDraft(previous => ({ ...previous, [kind]: { ...previous[kind], [id]: value } })); action.reset(); setCopyMessage('');
  }
  async function save() {
    const result = await action.run(() => api.saveStoreReleaseGuide(project.id, provider, draft));
    const record = result?.ok ? result.data.storeReleaseGuides?.[provider] : undefined;
    if (record) { setDraft(record); setSaved(record); }
  }
  function reset() {
    const record = project.storeReleaseGuides?.[provider] ?? emptyStoreRelease(provider);
    setDraft(record); setSaved(record); action.reset(); setCopyMessage('');
  }
  async function open(url: string) {
    try { const result = await api.openExternal(url); setLinkError(result.ok ? '' : result.error ?? '링크를 열지 못했습니다.'); }
    catch { setLinkError('링크를 열지 못했습니다. 기본 브라우저 설정을 확인해 주세요.'); }
  }
  const submission = storeSubmissionDraft(provider, project.name, draft);
  const steamReleaseReady = draft.states.storeReview === 'approved' && draft.states.buildReview === 'approved'
    && draft.states.comingSoon === 'met' && ['met', 'not_required'].includes(draft.states.feeWait!);

  return <Card title={`${guide.name} 출시 도우미`} icon={ClipboardCheck} actions={<Badge tone="info">프로젝트별 기록</Badge>}>
    <div className="stack">
      <div className="play-release-summary">
        <div><div className="small muted">{project.name} · 출시 준비 진행률</div><strong className="play-release-count">{progress.completed}<span> / {progress.total}</span></strong></div>
        <div className="play-release-next"><strong>다음 할 일</strong><p>{progress.next}</p></div>
        <button className="btn" type="button" onClick={() => void open(guide.consoleUrl)}><ExternalLink size={14} /> {guide.consoleName}</button>
      </div>
      <progress className="play-release-progress" value={progress.completed} max={progress.total} aria-label={`${guide.name} 출시 준비 진행률`} />
      <p className="small muted" style={{ margin: 0 }}>직접 확인한 준비 기록입니다. 테스트·심사·공개 상태는 자동 동기화되지 않습니다. 마지막 저장: {saved.updatedAt ? formatDateTime(saved.updatedAt) : '아직 없음'}</p>
      <StoreReleaseOverview provider={provider} />
      <form className="stack" onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset className="play-release-fieldset stack" disabled={action.pending}>
          <div className="play-release-columns">
            <section className="play-release-section">
              <h3>출시 전 체크리스트</h3>
              <div className="play-release-checks">
                {guide.checks.map(item => <label key={item.id}>
                  <input type="checkbox" checked={draft.checks[item.id]} onChange={event => update('checks', item.id, event.target.checked)} /><span>{item.label}</span>
                </label>)}
                {progress.derived.map(item => <label key={item.label}>
                  <input type="checkbox" checked={item.checked} disabled /><span>{item.label}<small>테스트·심사·공개 기록에서 반영</small></span>
                </label>)}
              </div>
            </section>
            <section className="play-release-section stack">
              <h3>테스트·심사·공개 기록</h3>
              {guide.states.map(field => <Field key={field.id} label={field.label} htmlFor={`${provider}-${field.id}`} hint={field.hint}>
                <select id={`${provider}-${field.id}`} className="select" value={draft.states[field.id]} onChange={event => update('states', field.id, event.target.value)}>
                  {field.options.map(([value, label]) => <option key={value} value={value} disabled={provider === 'steam' && field.id === 'release' && value === 'published' && !steamReleaseReady}>{label}</option>)}
                </select>
              </Field>)}
            </section>
          </div>
          <Notice tone="info">{guide.notice}</Notice>
          <div className="play-release-columns">
            {guide.dates.map(field => <Field key={field.id} label={field.label} htmlFor={`${provider}-${field.id}`} hint={field.hint}>
              <input id={`${provider}-${field.id}`} type="date" className="input" value={draft.dates[field.id]} onChange={event => update('dates', field.id, event.target.value)} />
            </Field>)}
          </div>
          <details className="play-guide-details">
            <summary>검토·출시 메모 준비 · {guide.notes.filter(item => draft.notes[item.id]?.trim()).length}/{guide.notes.length} 작성</summary>
            <p className="small muted">실제 테스트와 심사 결과를 기록하고 검토할 내용을 정리하세요. 저장·복사는 심사를 제출하거나 앱을 공개하지 않습니다.</p>
            <div className="play-release-columns">
              {guide.notes.map(field => <Field key={field.id} label={field.label} htmlFor={`${provider}-note-${field.id}`} hint={field.hint}>
                <textarea id={`${provider}-note-${field.id}`} className="textarea" rows={3} maxLength={5000} value={draft.notes[field.id]} onChange={event => update('notes', field.id, event.target.value)} />
              </Field>)}
            </div>
            <Field label="검토·출시 메모 미리보기" htmlFor={`${provider}-preview`}>
              <textarea id={`${provider}-preview`} className="textarea mono" readOnly rows={6} value={submission} />
            </Field>
            <button type="button" className="btn btn--sm" onClick={async () => {
              try { await navigator.clipboard.writeText(submission); setCopyMessage('초안을 복사했습니다.'); }
              catch { setCopyMessage('복사할 수 없습니다. 미리보기의 텍스트를 직접 선택해 복사하세요.'); }
            }}>검토 메모 초안 복사</button>
            {copyMessage && <p className="small" role="status">{copyMessage}</p>}
          </details>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" type="submit" disabled={!dirty || action.pending}><Save size={14} /> {action.pending ? '저장 중…' : '출시 기록 저장'}</button>
            <button className="btn" type="button" disabled={!dirty || action.pending} onClick={reset}>저장된 기록으로 되돌리기</button>
            <span className="small muted" role="status">{dirty ? '저장하지 않은 변경이 있습니다. 프로젝트나 플랫폼을 바꾸기 전에 저장 또는 되돌리기 하세요.' : action.result ? '출시 기록을 저장했습니다.' : '저장된 기록'}</span>
          </div>
        </fieldset>
        {action.error && <Notice tone="error" title="출시 기록 저장 실패">{action.error.message}</Notice>}
      </form>
      {linkError && <Notice tone="error">{linkError}</Notice>}
      <div className="row small muted" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span>공식 기준 확인: {guide.verifiedOn}</span>
        {guide.links.map(([label, url]) => <button key={url} type="button" className="btn btn--sm btn--ghost" onClick={() => void open(url)}>{label} <ExternalLink size={12} /></button>)}
      </div>
    </div>
  </Card>;
}
