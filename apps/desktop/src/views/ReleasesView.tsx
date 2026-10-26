import { GooglePlayReleaseGuide, GooglePlayReleaseOverview } from './GooglePlayReleaseGuide';
import { StoreReleaseGuide, StoreReleaseOverview } from './StoreReleaseGuide';
import type { GuidedStore } from '../../../../packages/domain/store-release';
import { useAgentScope } from '../components/AgentActions';
// 스토어 배포: 공통 출시 파이프라인(검수→빌드→업로드)과 출시·트랙·심사 상태.
// 출시를 시작하고 파이프라인을 드릴다운하며, 스토어 연결별 출시 리소스와 지원 작업을 관리한다.
// 업로드 성공·심사 접수·실제 공개를 구분한다.
import { useState } from 'react';
import { PlugZap, Rocket, UploadCloud } from 'lucide-react';
import { Card, EmptyState, Field, Notice } from '../components/ui';
import { ConnectionResourcePanel, type PanelConfig } from '../components/ResourcePanel';
import { PipelinesCard, PublishModal, eligibleStoreConnections } from '../components/PublishFlow';
import type { ViewKey } from '../App';
import type { AppState } from '../../../../packages/domain';

const CONFIG: PanelConfig = {
  listOps: ['list-releases', 'sync'],
  createOps: ['upload-build'],
  kinds: ['release', 'creative'],
  rowOps: [],
};

type ReleasePlatform = 'google-play' | GuidedStore;
const RELEASE_PLATFORMS = [
  ['google-play', 'Google Play'], ['app-store', 'iOS · App Store'], ['steam', 'Steam'],
] as const;

function ReleasePlatformTabs({ selected, dirty, onChange }: {
  selected: ReleasePlatform; dirty: boolean; onChange: (value: ReleasePlatform) => void;
}) {
  return <div className="tabs" role="tablist" aria-label="출시 도우미 플랫폼">
    {RELEASE_PLATFORMS.map(([id, label], index) => <button
      key={id} id={`release-tab-${id}`} type="button" role="tab" className="tab"
      aria-selected={selected === id} aria-controls={`release-panel-${id}`}
      tabIndex={selected === id ? 0 : -1} disabled={dirty && selected !== id}
      title={dirty && selected !== id ? '출시 기록을 저장하거나 되돌린 뒤 플랫폼을 바꿀 수 있습니다.' : undefined}
      onClick={() => onChange(id)}
      onKeyDown={event => {
        if (dirty) return;
        const target = event.key === 'ArrowRight' ? (index + 1) % RELEASE_PLATFORMS.length
          : event.key === 'ArrowLeft' ? (index + RELEASE_PLATFORMS.length - 1) % RELEASE_PLATFORMS.length
            : event.key === 'Home' ? 0 : event.key === 'End' ? RELEASE_PLATFORMS.length - 1 : -1;
        if (target < 0) return;
        event.preventDefault();
        const next = RELEASE_PLATFORMS[target]![0];
        onChange(next); document.getElementById(`release-tab-${next}`)?.focus();
      }}
    >{label}</button>)}
  </div>;
}

export function ReleasesView({
  state,
  refresh,
  goTo,
}: {
  state: AppState;
  refresh: () => Promise<void>;
  goTo: (v: ViewKey) => void;
}) {
  const [publishProjectId, setPublishProjectId] = useState<string>(state.projects[0]?.id ?? '');
  useAgentScope(publishProjectId || undefined);
  const [publishOpen, setPublishOpen] = useState(false);
  const [releaseDirty, setReleaseDirty] = useState(false);
  const [releasePlatform, setReleasePlatform] = useState<ReleasePlatform>('google-play');

  const stores = eligibleStoreConnections(state);
  const connections = state.connections.filter((c) => {
    const cap = state.capabilities.find((cp) => cp.provider === c.provider);
    return cap?.category === 'store';
  });

  const publishProject = publishProjectId ? state.projects.find((p) => p.id === publishProjectId) ?? null : null;
  const canPublish = state.projects.length > 0 && stores.length > 0;
  const releaseGuide = <>
    <ReleasePlatformTabs selected={releasePlatform} dirty={releaseDirty} onChange={setReleasePlatform} />
    <div role="tabpanel" id={`release-panel-${releasePlatform}`} aria-labelledby={`release-tab-${releasePlatform}`}>
      {publishProject ? releasePlatform === 'google-play'
        ? <GooglePlayReleaseGuide key={`${publishProject.id}:google-play`} project={publishProject} refresh={refresh} onDirtyChange={setReleaseDirty} />
        : <StoreReleaseGuide key={`${publishProject.id}:${releasePlatform}`} provider={releasePlatform} project={publishProject} refresh={refresh} onDirtyChange={setReleaseDirty} />
        : <Card title="스토어 출시 준비">
          {releasePlatform === 'google-play' ? <GooglePlayReleaseOverview /> : <StoreReleaseOverview provider={releasePlatform} />}
          <p className="small muted">프로젝트를 등록하거나 선택하면 체크리스트·테스트·심사 기록을 저장할 수 있습니다.</p>
          <button className="btn" onClick={() => goTo('projects')}>프로젝트 등록으로 이동</button>
        </Card>}
    </div>
  </>;

  if (connections.length === 0 && state.projects.length === 0) {
    return (
      <div className="stack">
        {releaseGuide}
        <Card>
        <EmptyState
          icon={UploadCloud}
          title="배포 대상 스토어가 연결되지 않았습니다"
          description="Google Play·App Store·Steam 계정을 연결하고 프로젝트를 등록하면 출시 파이프라인을 실행할 수 있습니다."
          action={
            <button className="btn btn--primary" onClick={() => goTo('connections')}>
              <PlugZap size={15} /> 계정 연결로 이동
            </button>
          }
        />
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      <Card title="출시 시작" icon={Rocket}>
        <p className="small muted" style={{ margin: '0 0 12px' }}>
          프로젝트와 스토어 연결을 고르고 외부 빌드 결과물을 가져와 업로드합니다. 업로드 성공, 심사 접수, 실제
          공개는 서로 다른 상태로 표시합니다.
        </p>
        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Field label="프로젝트" htmlFor="rel-project">
              <select id="rel-project" className="select" disabled={releaseDirty} value={publishProjectId} onChange={(e) => setPublishProjectId(e.target.value)}>
                <option value="">프로젝트 선택</option>
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <button
            className="btn btn--primary"
            disabled={!canPublish || !publishProject}
            title={
              state.projects.length === 0
                ? '먼저 프로젝트를 등록하세요.'
                : stores.length === 0
                  ? '먼저 스토어 계정을 연결하세요.'
                  : undefined
            }
            onClick={() => setPublishOpen(true)}
          >
            <Rocket size={15} /> 출시 시작
          </button>
        </div>
        {state.projects.length > 0 && stores.length === 0 && (
          <div style={{ marginTop: 10 }}>
            <Notice tone="warn">
              연결된 스토어 계정이 없습니다. <button className="btn btn--sm" onClick={() => goTo('connections')}>계정 연결</button> 후 출시할 수 있습니다.
            </Notice>
          </div>
        )}
      </Card>

      {releaseGuide}

      <PipelinesCard state={state} refresh={refresh} />

      <Notice tone="info">
        업로드 성공, 심사 접수, 실제 공개는 서로 다른 상태입니다. 각 출시의 상태를 스토어 원문 그대로 표시합니다.
      </Notice>

      {connections.map((conn) => (
        <ConnectionResourcePanel
          key={conn.id}
          connection={conn}
          cap={state.capabilities.find((cp) => cp.provider === conn.provider)}
          config={CONFIG}
          state={state}
          refresh={refresh}
        />
      ))}

      {publishOpen && publishProject && (
        <PublishModal
          project={publishProject}
          state={state}
          refresh={refresh}
          onClose={() => setPublishOpen(false)}
          onPublished={() => setPublishOpen(false)}
        />
      )}
    </div>
  );
}
