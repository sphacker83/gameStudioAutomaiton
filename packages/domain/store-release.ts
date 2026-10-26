export type GuidedStore = 'app-store' | 'steam';
export interface StoreReleaseRecord {
  revision: number;
  updatedAt: string | null;
  checks: Record<string, boolean>;
  states: Record<string, string>;
  dates: Record<string, string>;
  notes: Record<string, string>;
}
interface ReleaseField { id: string; label: string; hint: string }
interface ReleaseStateField extends ReleaseField { options: ReadonlyArray<readonly [string, string]> }
interface ReleaseGuide {
  name: string;
  consoleName: string;
  consoleUrl: string;
  verifiedOn: string;
  steps: ReadonlyArray<readonly [string, string]>;
  checks: ReadonlyArray<{ id: string; label: string }>;
  states: ReadonlyArray<ReleaseStateField>;
  dates: ReadonlyArray<ReleaseField>;
  notes: ReadonlyArray<ReleaseField>;
  notice: string;
  links: ReadonlyArray<readonly [string, string]>;
}
const reviewOptions = [['not_started', '제출 전'], ['in_review', '심사 중'], ['changes_requested', '수정 요청'], ['approved', '승인']] as const;

export const STORE_RELEASE_GUIDES: Record<GuidedStore, ReleaseGuide> = {
  'app-store': {
    name: 'iOS · App Store', consoleName: 'App Store Connect', consoleUrl: 'https://appstoreconnect.apple.com/', verifiedOn: '2026-10-26',
    steps: [
      ['개발자 등록', 'Apple Developer Program 가입·계약과 필요한 세금/정산 정보 확인'],
      ['앱 등록', 'App Store Connect 앱 생성, Bundle ID·서명·프로비저닝 확인'],
      ['스토어·정책', '설명·스크린샷·연령 등급·App Privacy·수출 규정·가격/배포 지역'],
      ['빌드 업로드', '배포용 빌드 업로드 후 처리 완료 및 버전 연결 확인'],
      ['TestFlight', '선택한 내부/외부 테스트로 기기 동작과 피드백 검증'],
      ['심사 제출', '메타데이터·빌드·심사 정보를 확인하고 Submit for Review 실행'],
      ['심사·수정', '심사 대기·진행·반려를 확인하고 수정 후 다시 제출'],
      ['공개·운영', '선택한 공개 방식에 따라 출시하고 국가별 다운로드·크래시 확인'],
    ],
    checks: [
      { id: 'account', label: '개발자 등록·계약 및 필요한 세금/정산 정보 확인' },
      { id: 'app', label: '앱 등록·Bundle ID·버전 정보 확인' },
      { id: 'build', label: '서명된 빌드 업로드·처리 완료·심사 버전 연결' },
      { id: 'gameplay', label: '실기기 실행·로그인·저장·불러오기 검증' },
      { id: 'monetization', label: '광고·인앱결제·구독 검증 또는 미사용 확인' },
      { id: 'listing', label: '아이콘·스크린샷·설명·가격·배포 지역 설정' },
      { id: 'policy', label: '개인정보처리방침·App Privacy·연령 등급·수출 규정 확인' },
      { id: 'reviewInfo', label: '심사 연락처·접근 방법·필요한 테스트 계정 정보 등록' },
    ],
    states: [
      { id: 'testflight', label: 'TestFlight', hint: '출시 전 베타 테스트는 선택입니다. 외부 테스트의 첫 빌드는 Beta App Review가 필요합니다.', options: [['not_started', '테스트 계획 전'], ['not_used', 'TestFlight 미사용'], ['internal', '내부 테스트 중'], ['external_review', '외부 테스트 심사 중'], ['external', '외부 테스트 중'], ['finished', '테스트 완료']] },
      { id: 'review', label: 'App Review · 공개 상태', hint: 'Ready for Review는 아직 제출 전입니다. TestFlight 승인과 정식 App Review 승인은 별개입니다.', options: [['not_started', '제출 준비'], ['ready', 'Ready for Review · 제출 전'], ['waiting', 'Waiting for Review · 접수됨'], ['in_review', 'In Review · 심사 중'], ['changes_requested', '반려·수정 요청'], ['approved', '승인·공개 대기'], ['published', '실제 App Store 공개 확인']] },
      { id: 'releaseMode', label: '공개 방식', hint: 'App Store Connect에 설정한 방식을 기록합니다.', options: [['unknown', '확인 필요'], ['manual', '승인 후 직접 공개'], ['automatic', '승인 후 자동 공개'], ['scheduled', '지정 시각 이후 공개']] },
    ],
    dates: [{ id: 'submittedOn', label: '정식 심사 제출일', hint: '실제 제출한 날짜를 기록하세요.' }, { id: 'publishedOn', label: '공개 확인일', hint: '스토어에서 다운로드 가능 여부를 확인한 날짜입니다.' }],
    notes: [
      { id: 'testing', label: '테스트 계획과 결과', hint: '기기·OS·빌드·검증한 기능과 TestFlight 피드백을 기록하세요.' },
      { id: 'fixes', label: '피드백·반려 사유와 수정', hint: '지적 사항, 수정 버전, 재검증 결과를 적으세요.' },
      { id: 'reviewer', label: '심사 안내 초안', hint: '게임 진행 방법과 확인할 기능을 적으세요. 테스트 계정 비밀번호는 App Store Connect에 직접 등록하세요.' },
      { id: 'launch', label: '출시 메모', hint: '공개 방식·국가·가격·최종 버전·출시 후 확인 사항을 적으세요.' },
    ],
    notice: 'TestFlight는 내부 최대 100명, 외부 최대 10,000명이며 빌드 테스트 가능 기간은 최대 90일입니다. Google Play의 12명·14일 조건은 iOS에 적용되지 않습니다. 심사 승인과 실제 스토어 공개는 구분해 확인하세요.',
    links: [
      ['TestFlight 공식 안내', 'https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/'],
      ['심사 제출 절차', 'https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/'],
      ['공개 방식', 'https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option/'],
      ['최신 제출 요건', 'https://developer.apple.com/news/upcoming-requirements/'],
    ],
  },
  steam: {
    name: 'Steam', consoleName: 'Steamworks', consoleUrl: 'https://partner.steamgames.com/', verifiedOn: '2026-10-26',
    steps: [
      ['파트너 등록', '본인·은행·세금 정보와 앱 등록비, AppID 확인'],
      ['스토어 구성', '캡슐·게임플레이 이미지·설명·지원 OS·가격·콘텐츠 설문'],
      ['스토어 심사', '스토어 체크리스트를 완료하고 Mark as ready for review 제출'],
      ['Coming Soon', '승인된 페이지를 공개하고 신규 제품의 최소 2주 공개 조건 확인'],
      ['빌드·테스트', 'SteamPipe 업로드, Depot·패키지·실행 설정, 지원 OS별 검증'],
      ['빌드 심사', '스토어 심사 제출 이후 거의 최종인 빌드를 심사에 제출'],
      ['출시 조건', '두 심사 승인·공개 기간·적용되는 등록비 대기 조건·권한 확인'],
      ['직접 출시', 'Steamworks의 Release App 절차를 실행하고 상점·설치·실행 확인'],
    ],
    checks: [
      { id: 'account', label: '파트너 등록·은행/세금 정보·등록비·AppID 확인' },
      { id: 'listing', label: '스토어 이미지·설명·가격·지원 OS·콘텐츠 설문 완료' },
      { id: 'build', label: 'SteamPipe 빌드·Depot·패키지·실행 설정 확인' },
      { id: 'gameplay', label: '지원 OS별 설치·실행·저장 및 표시한 기능 검증' },
      { id: 'permissions', label: '앱 변경 게시·가격/할인 관리 권한과 출시 설정 확인' },
    ],
    states: [
      { id: 'storeReview', label: '스토어 페이지 심사', hint: '스토어와 빌드는 각각 심사를 받습니다.', options: reviewOptions },
      { id: 'buildReview', label: '빌드 심사', hint: '스토어 심사를 제출한 뒤 빌드 심사를 제출합니다.', options: reviewOptions },
      { id: 'comingSoon', label: 'Coming Soon 공개 기간', hint: '신규 제품은 최소 2주 공개가 필요합니다. Steamworks에서 확인한 상태를 기록하세요.', options: [['not_started', '공개 전'], ['waiting', '공개 중 · 기간 대기'], ['met', '최소 2주 조건 충족 확인']] },
      { id: 'feeWait', label: '등록비 결제 후 대기', hint: '최초 출시작 등에 적용되는 30일 대기 조건입니다. 적용 여부와 충족 여부를 Steamworks에서 확인하세요.', options: [['unknown', '적용 여부 확인 필요'], ['waiting', '30일 대기 중'], ['met', '30일 조건 충족 확인'], ['not_required', '대기 조건 비대상 확인']] },
      { id: 'release', label: '정식 출시', hint: '브랜치 전환·빌드 업로드·심사 승인만으로 최초 출시되지 않습니다.', options: [['not_released', '출시 전'], ['published', '실제 Steam 공개 확인']] },
    ],
    dates: [{ id: 'feePaidOn', label: '앱 등록비 결제일', hint: '대기 조건 확인용 기록입니다. 날짜만으로 완료 처리하지 않습니다.' }, { id: 'comingSoonOn', label: 'Coming Soon 공개일', hint: '페이지가 실제로 공개된 날짜를 기록하세요.' }],
    notes: [
      { id: 'testing', label: '빌드 테스트 결과', hint: 'BuildID·브랜치·지원 OS·설치/실행/저장 검증 결과를 적으세요.' },
      { id: 'fixes', label: '심사 피드백과 수정', hint: '스토어·빌드 심사의 지적 사항과 수정 버전을 구분해 기록하세요.' },
      { id: 'reviewer', label: '검토 안내 초안', hint: '검토할 빌드와 게임 진행 방법, 중요한 기능을 적으세요.' },
      { id: 'launch', label: '출시 메모', hint: '출시 시각·가격·할인·최종 BuildID·공개 확인 결과를 적으세요.' },
    ],
    notice: '스토어 페이지와 빌드 승인이 모두 필요합니다. 신규 제품의 Coming Soon 최소 2주와 적용되는 등록비 결제 후 30일 대기를 확인하세요. 승인된 게임도 자동 출시되지 않으며 Steamworks에서 Release App 절차를 진행해야 합니다.',
    links: [
      ['Steam 출시 절차', 'https://partner.steamgames.com/doc/store/releasing'],
      ['Coming Soon 조건', 'https://partner.steamgames.com/doc/store/coming_soon'],
      ['등록 및 대기 조건', 'https://partner.steamgames.com/steamdirect/'],
      ['스토어·빌드 심사', 'https://partner.steamgames.com/doc/store/review_process'],
    ],
  },
};

export function emptyStoreRelease(store: GuidedStore): StoreReleaseRecord {
  const guide = STORE_RELEASE_GUIDES[store];
  return { revision: 0, updatedAt: null,
    checks: Object.fromEntries(guide.checks.map(item => [item.id, false])),
    states: Object.fromEntries(guide.states.map(item => [item.id, item.options[0]![0]])),
    dates: Object.fromEntries(guide.dates.map(item => [item.id, ''])),
    notes: Object.fromEntries(guide.notes.map(item => [item.id, ''])),
  };
}
export function storeReleaseProgress(store: GuidedStore, record: StoreReleaseRecord) {
  const state = record.states;
  const derived = store === 'app-store' ? [
    { label: '정식 App Review 승인 확인', checked: ['approved', 'published'].includes(state.review!) },
    { label: '실제 App Store 공개 확인', checked: state.review === 'published' },
  ] : [
    { label: '스토어 페이지 승인 확인', checked: state.storeReview === 'approved' },
    { label: '빌드 승인 확인', checked: state.buildReview === 'approved' },
    { label: 'Coming Soon 최소 2주 충족 확인', checked: state.comingSoon === 'met' },
    { label: '등록비 대기 조건 충족·비대상 확인', checked: ['met', 'not_required'].includes(state.feeWait!) },
    { label: '실제 Steam 공개 확인', checked: state.release === 'published' },
  ];
  let next: string;
  if (store === 'app-store') {
    if (state.review === 'published') next = '배포 지역의 다운로드 가능 여부와 크래시·리뷰·결제 상태를 모니터링하세요.';
    else if (state.review === 'approved') next = state.releaseMode === 'unknown' ? 'App Store Connect에서 수동·자동·예약 공개 방식을 확인하고 실제 공개를 확인하세요.' : state.releaseMode === 'manual' ? '승인 후 공개 대기입니다. App Store Connect에서 Release This Version을 실행하고 실제 공개를 확인하세요.' : '선택한 자동/예약 공개 방식과 배포 지역의 실제 공개 상태를 확인하세요.';
    else if (state.review === 'changes_requested') next = 'App Review의 반려 사유를 기록하고 수정·재검증 후 다시 제출하세요.';
    else if (['waiting', 'in_review'].includes(state.review!)) next = '정식 App Review 상태와 추가 정보 요청을 확인하세요.';
    else if (state.review === 'ready') next = 'Ready for Review는 제출 전입니다. App Store Connect에서 Submit for Review를 실행하세요.';
    else if (state.testflight === 'external_review') next = '외부 TestFlight 심사 결과를 확인하세요. Beta App Review 승인은 정식 출시 승인이 아닙니다.';
    else next = '빌드·스토어·정책·심사 정보를 준비하고 기기 검증을 마친 뒤 정식 App Review에 제출하세요.';
  } else {
    if (state.release === 'published') next = 'Steam 상점 구매/설치·지원 OS 실행·크래시·커뮤니티 피드백을 확인하세요.';
    else if ([state.storeReview, state.buildReview].includes('changes_requested')) next = '스토어 또는 빌드 심사의 수정 요청을 해결하고 해당 항목을 다시 제출하세요.';
    else if (state.storeReview === 'not_started') next = '스토어 체크리스트를 마치고 스토어 페이지 심사를 먼저 제출하세요.';
    else if (state.storeReview === 'approved' && state.comingSoon === 'not_started') next = '승인된 스토어 페이지를 Coming Soon으로 공개해 최소 2주 기간을 시작하세요. 빌드 준비와 심사는 그동안 병행할 수 있습니다.';
    else if ([state.storeReview, state.buildReview].includes('in_review')) next = '진행 중인 스토어·빌드 심사 결과를 Steamworks에서 확인하세요.';
    else if (state.buildReview !== 'approved') next = 'Coming Soon 공개 기간 동안 빌드 체크리스트와 지원 OS별 테스트를 완료하고 빌드 심사를 제출하세요.';
    else if (state.comingSoon !== 'met') next = 'Coming Soon 페이지를 공개하고 최소 2주 공개 조건을 확인하세요.';
    else if (!['met', 'not_required'].includes(state.feeWait!)) next = 'Steamworks에서 등록비 결제 후 30일 대기 조건의 적용·충족 여부를 확인하세요.';
    else next = '두 심사와 기간 조건을 확인했습니다. 출시 설정을 점검하고 Steamworks의 Release App 절차를 진행하세요.';
  }
  return { completed: STORE_RELEASE_GUIDES[store].checks.filter(item => record.checks[item.id]).length + derived.filter(item => item.checked).length,
    total: STORE_RELEASE_GUIDES[store].checks.length + derived.length, derived, next };
}
export function storeSubmissionDraft(store: GuidedStore, name: string, record: StoreReleaseRecord): string {
  const guide = STORE_RELEASE_GUIDES[store];
  return [`${name} — ${guide.name} 검토·출시 메모`, '직접 기록한 초안입니다. 제출 전 실제 결과와 대조하세요.',
    ...guide.notes.map(item => `\n${item.label}\n${record.notes[item.id]?.trim() || '[작성 필요]'}`)].join('\n');
}
