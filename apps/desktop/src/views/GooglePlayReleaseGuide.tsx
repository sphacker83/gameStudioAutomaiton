import { useEffect, useState } from 'react';
import { ClipboardCheck, ExternalLink, Save } from 'lucide-react';
import type { Project } from '../../../../packages/domain';
import {
  emptyGooglePlayRelease, PLAY_ACCESS_LABELS, PLAY_ANSWERS, PLAY_CHECKS, PLAY_POLICY,
  PLAY_PRODUCTION_LABELS, playApplicationDraft, playReleaseProgress, playTestNumbersMet,
  type GooglePlayRelease,
} from '../../../../packages/domain/google-play-release';
import { api } from '../api';
import { useAction } from '../useAction';
import { Badge, Card, Field, Notice } from '../components/ui';
import { formatDateTime } from '../format';

const STEPS = [
  ['개발자 계정', '등록·본인 인증·기기 확인 및 계정 설정'],
  ['게임 등록', '앱 이름·게임 유형·무료/유료 설정, AAB의 패키지명 확인'],
  ['스토어·정책', '아이콘·스크린샷·설명·개인정보처리방침·데이터 보안·콘텐츠 등급'],
  ['AAB·내부 테스트', '서명된 AAB 업로드, 설치·로그인·결제·저장 검증'],
  ['비공개 테스트', '대상 계정은 12명 이상이 연속 14일 참여 등록을 유지'],
  ['액세스 신청', '실제 테스트·피드백·수정·출시 준비에 관한 답변 제출'],
  ['정식 출시 심사', '프로덕션 트랙의 최종 버전과 스토어 정보 제출'],
  ['공개·운영', '국가별 공개 확인, 크래시·ANR·사용자 피드백 모니터링'],
];

export function GooglePlayReleaseOverview() {
  return <details className="play-guide-details">
    <summary>Google Play 출시 순서와 테스트 단계 안내</summary>
    <ol className="play-release-steps">
      {STEPS.map(([title, description]) => <li key={title}><strong>{title}</strong><span>{description}</span></li>)}
    </ol>
    <div className="table-wrap"><table className="table">
      <thead><tr><th>단계</th><th>인원·기간</th><th>필수 여부</th></tr></thead>
      <tbody>
        <tr><td>내부 테스트</td><td>최대 100명 · 최소 기간 없음</td><td>선택</td></tr>
        <tr><td>비공개 테스트</td><td>대상 계정: 최소 12명 · 연속 14일</td><td>조건부 필수</td></tr>
        <tr><td>공개 테스트</td><td>공개 모집 · 최소 기간 없음</td><td>선택 · 대상 계정은 액세스 승인 후</td></tr>
        <tr><td>프로덕션</td><td>일반 사용자 · 상시</td><td>정식 출시</td></tr>
      </tbody>
    </table></div>
    <p className="small muted">내부 테스트 참여자는 먼저 내부 테스트에서 나간 뒤 비공개 테스트에 참여해야 합니다. 참여 등록이 끊긴 테스터는 다시 연속 14일을 채워야 합니다.</p>
  </details>;
}

export function GooglePlayReleaseGuide({ project, refresh, onDirtyChange }: {
  project: Project; refresh: () => Promise<void>; onDirtyChange: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<GooglePlayRelease>(() => project.googlePlayRelease ?? emptyGooglePlayRelease());
  const [saved, setSaved] = useState(draft);
  const [copyMessage, setCopyMessage] = useState('');
  const [linkError, setLinkError] = useState('');
  const action = useAction<Project>(refresh);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const progress = playReleaseProgress(draft);
  const latest = project.googlePlayRelease;
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  // 주기적 조회는 편집 중인 입력을 덮어쓰지 않는다. 저장 충돌은 서버의 revision으로 검출한다.
  useEffect(() => {
    if (!dirty && latest && latest.revision > saved.revision) { setDraft(latest); setSaved(latest); }
  }, [latest, dirty, saved.revision]);

  function update<K extends keyof GooglePlayRelease>(key: K, value: GooglePlayRelease[K]) {
    setDraft(previous => ({ ...previous, [key]: value })); action.reset(); setCopyMessage('');
  }
  function updateTest(patch: Partial<GooglePlayRelease['closedTest']>) {
    update('closedTest', { ...draft.closedTest, ...patch, consoleEligible: false });
  }
  async function save() {
    const result = await action.run(() => api.saveGooglePlayRelease(project.id, draft));
    if (result?.ok && result.data.googlePlayRelease) {
      setDraft(result.data.googlePlayRelease); setSaved(result.data.googlePlayRelease);
    }
  }
  async function open(url: string) {
    try {
      const result = await api.openExternal(url);
      setLinkError(result.ok ? '' : result.error ?? '링크를 열지 못했습니다.');
    } catch {
      setLinkError('링크를 열지 못했습니다. 기본 브라우저 설정을 확인해 주세요.');
    }
  }
  function reset() {
    const value = project.googlePlayRelease ?? emptyGooglePlayRelease();
    setDraft(value); setSaved(value); action.reset(); setCopyMessage('');
  }
  const derivedChecks = [
    { label: draft.requirement === 'not-required' ? '12명·14일 의무 비대상 확인' : '비공개 테스트 요건 및 신청 가능 확인', checked: progress.testComplete },
    { label: '프로덕션 액세스 승인·사용 가능 확인', checked: draft.access === 'approved' },
    { label: '최종 버전 프로덕션 공개 확인', checked: draft.production === 'published' },
  ];
  const application = playApplicationDraft(project.name, draft);

  return <Card title="Google Play 출시 도우미" icon={ClipboardCheck} actions={<Badge tone="info">프로젝트별 기록</Badge>}>
    <div className="stack">
      <div className="play-release-summary">
        <div><div className="small muted">{project.name} · 출시 준비 진행률</div><strong className="play-release-count">{progress.completed}<span> / 10</span></strong></div>
        <div className="play-release-next"><strong>다음 할 일</strong><p>{progress.next}</p></div>
        <button className="btn" type="button" onClick={() => void open('https://play.google.com/console/')}><ExternalLink size={14} /> Play Console</button>
      </div>
      <progress className="play-release-progress" value={progress.completed} max={10} aria-label="출시 준비 진행률" />
      <p className="small muted" style={{ margin: 0 }}>직접 확인한 준비 기록입니다. 인원·일수·심사 결과는 자동 동기화되지 않습니다. 마지막 저장: {saved.updatedAt ? formatDateTime(saved.updatedAt) : '아직 없음'}</p>
      <GooglePlayReleaseOverview />
      <form className="stack" onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset className="play-release-fieldset stack" disabled={action.pending}>
          <div className="play-release-columns">
            <section className="play-release-section">
              <h3>출시 전 체크리스트</h3>
              <div className="play-release-checks">
                {PLAY_CHECKS.map(item => <label key={item.id}>
                  <input type="checkbox" checked={draft.checks[item.id]} onChange={event => update('checks', { ...draft.checks, [item.id]: event.target.checked })} />
                  <span>{item.label}</span>
                </label>)}
                {derivedChecks.map(item => <label key={item.label}>
                  <input type="checkbox" checked={item.checked} disabled /><span>{item.label}<small>아래 테스트·심사 기록에서 반영</small></span>
                </label>)}
              </div>
              <button className="btn btn--sm" type="button" onClick={() => void open(PLAY_POLICY.targetApiUrl)}>대상 API 최신 기준 확인 <ExternalLink size={12} /></button>
            </section>
            <section className="play-release-section stack">
              <h3>비공개 테스트 기록</h3>
              <Field label="테스트 의무 적용" htmlFor="play-requirement">
                <select id="play-requirement" className="select" value={draft.requirement} onChange={event => {
                  setDraft(previous => ({ ...previous, requirement: event.target.value as GooglePlayRelease['requirement'], closedTest: { ...previous.closedTest, consoleEligible: false } })); action.reset();
                }}>
                  <option value="unknown">확인 필요</option>
                  <option value="required">대상 · 2023-11-13 이후 생성 개인 계정</option>
                  <option value="not-required">비대상 · 기존 개인 계정 또는 조직 계정</option>
                </select>
              </Field>
              <p className="small muted" style={{ margin: 0 }}>대상 계정은 최소 {PLAY_POLICY.minimumTesters}명의 연속 {PLAY_POLICY.continuousDays}일 참여 등록이 필요합니다. 매일 실행 횟수에 대한 고정 기준은 없지만 실제 참여도와 피드백을 심사합니다.</p>
              {draft.requirement !== 'not-required' && <>
                <div className="play-release-columns">
                  <Field label="연속 참여 테스터 수" htmlFor="play-testers" hint="초대 인원이 아닌 실제 참여 등록 인원">
                    <input id="play-testers" type="number" className="input" min={0} max={1000000} step={1} value={draft.closedTest.testerCount ?? ''} onChange={event => updateTest({ testerCount: event.target.value === '' ? null : Number(event.target.value) })} />
                  </Field>
                  <Field label="연속 참여 일수" htmlFor="play-days" hint="해당 인원이 연속으로 유지한 일수">
                    <input id="play-days" type="number" className="input" min={0} max={1000000} step={1} value={draft.closedTest.continuousDays ?? ''} onChange={event => updateTest({ continuousDays: event.target.value === '' ? null : Number(event.target.value) })} />
                  </Field>
                </div>
                <Field label="Console 확인일" htmlFor="play-checked-on" hint="일수는 자동 증가하지 않습니다. 신청 직전에 다시 확인하세요.">
                  <input id="play-checked-on" type="date" className="input" value={draft.closedTest.checkedOn} onChange={event => updateTest({ checkedOn: event.target.value })} />
                </Field>
                <label className="play-release-check">
                  <input type="checkbox" disabled={draft.requirement !== 'required' || !playTestNumbersMet(draft)} checked={draft.closedTest.consoleEligible} onChange={event => update('closedTest', { ...draft.closedTest, consoleEligible: event.target.checked })} />
                  Console에서 프로덕션 액세스 신청 가능 확인
                </label>
              </>}
            </section>
          </div>
          <section className="play-release-section stack">
            <h3>액세스 승인과 정식 출시 심사</h3>
            <Notice tone="info">14일이 지나도 바로 출시되지 않습니다. 액세스 승인 심사와 정식 출시 심사는 별개이며, 승인 후에도 실제 공개 여부를 확인해야 합니다.</Notice>
            <div className="play-release-columns">
              <Field label="프로덕션 액세스" htmlFor="play-access" hint="Console에서 확인한 상태를 기록하세요. 저장은 신청을 전송하지 않습니다.">
                <select id="play-access" className="select" value={draft.access} onChange={event => update('access', event.target.value as GooglePlayRelease['access'])} disabled={draft.production !== 'draft'}>
                  {Object.entries(PLAY_ACCESS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="정식 출시" htmlFor="play-production" hint="액세스 사용 가능 확인 후 기록합니다. 업로드 성공만으로 공개 처리하지 마세요.">
                <select id="play-production" className="select" value={draft.production} disabled={draft.access !== 'approved'} onChange={event => update('production', event.target.value as GooglePlayRelease['production'])}>
                  {Object.entries(PLAY_PRODUCTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="심사·출시 메모" htmlFor="play-review-notes" hint="신청일, 심사 답변, 추가 테스트 사유, 최종 버전·국가·공개일을 기록하세요.">
              <textarea id="play-review-notes" className="textarea" rows={2} maxLength={5000} value={draft.reviewNotes} onChange={event => update('reviewNotes', event.target.value)} />
            </Field>
          </section>
          <details className="play-guide-details">
            <summary>프로덕션 액세스 신청 답변 준비 · {PLAY_ANSWERS.filter(item => draft.answers[item.id].trim()).length}/{PLAY_ANSWERS.length} 작성</summary>
            <p className="small muted">실제로 진행한 테스트와 수정 내용을 기록하세요. 아래 초안을 검토한 뒤 Play Console 신청 화면에 옮길 수 있습니다.</p>
            <div className="play-release-columns">
              {PLAY_ANSWERS.map(item => <Field key={item.id} label={item.label} htmlFor={`play-answer-${item.id}`} hint={item.hint}>
                <textarea id={`play-answer-${item.id}`} className="textarea" rows={3} maxLength={5000} value={draft.answers[item.id]} onChange={event => update('answers', { ...draft.answers, [item.id]: event.target.value })} />
              </Field>)}
            </div>
            <Field label="신청 초안 미리보기" htmlFor="play-application-preview">
              <textarea id="play-application-preview" className="textarea mono" readOnly rows={6} value={application} />
            </Field>
            <button className="btn btn--sm" type="button" onClick={async () => {
              try { await navigator.clipboard.writeText(application); setCopyMessage('초안을 복사했습니다.'); }
              catch { setCopyMessage('복사할 수 없습니다. 미리보기의 텍스트를 직접 선택해 복사하세요.'); }
            }}>신청 초안 복사</button>
            {copyMessage && <p className="small" role="status">{copyMessage}</p>}
          </details>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" type="submit" disabled={!dirty || action.pending}><Save size={14} /> {action.pending ? '저장 중…' : '출시 기록 저장'}</button>
            <button className="btn" type="button" disabled={!dirty || action.pending} onClick={reset}>저장된 기록으로 되돌리기</button>
            <span className="small muted" role="status">{dirty ? '저장하지 않은 변경이 있습니다. 저장 또는 되돌리기 후 프로젝트·플랫폼을 바꿀 수 있습니다.' : action.result ? '출시 기록을 저장했습니다.' : '저장된 기록'}</span>
          </div>
        </fieldset>
        {action.error && <Notice tone="error" title="출시 기록 저장 실패">{action.error.message}</Notice>}
      </form>
      {linkError && <Notice tone="error">{linkError}</Notice>}
      <div className="row small muted" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span>공식 기준 확인: {PLAY_POLICY.verifiedOn}</span>
        <button className="btn btn--sm btn--ghost" onClick={() => void open(PLAY_POLICY.testingUrl)}>테스트·출시 요건 <ExternalLink size={12} /></button>
        <button className="btn btn--sm btn--ghost" onClick={() => void open(PLAY_POLICY.tracksUrl)}>테스트 트랙 설정 <ExternalLink size={12} /></button>
      </div>
    </div>
  </Card>;
}
