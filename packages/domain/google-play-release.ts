// 사용자가 Console에서 확인한 기록이며 스토어 조회 결과와 분리한다.
export const PLAY_POLICY = {
  minimumTesters: 12, continuousDays: 14, verifiedOn: '2026-10-26',
  testingUrl: 'https://support.google.com/googleplay/android-developer/answer/14151465',
  tracksUrl: 'https://support.google.com/googleplay/android-developer/answer/9845334',
  targetApiUrl: 'https://support.google.com/googleplay/android-developer/answer/11926878',
} as const;
export const PLAY_CHECKS = [
  { id: 'bundle', label: 'AAB 릴리스 빌드 및 서명 확인' },
  { id: 'gameplay', label: '게임 실행·로그인·저장·불러오기·종료 검증' },
  { id: 'monetization', label: '광고·인앱결제 검증 또는 미사용 확인' },
  { id: 'listing', label: '스토어 아이콘·스크린샷·설명 등록' },
  { id: 'policy', label: '개인정보처리방침·데이터 보안·콘텐츠 등급 완료' },
  { id: 'compatibility', label: '최신 대상 API·기기 호환성 확인' },
  { id: 'feedback', label: '테스트 피드백 및 수정 내역 정리' },
] as const;
export type PlayCheckId = typeof PLAY_CHECKS[number]['id'];
export const PLAY_ANSWERS = [
  { id: 'recruitment', label: '테스터 모집', hint: '모집 경로와 모집 난이도를 기록하세요.' },
  { id: 'engagement', label: '실제 테스트 참여', hint: '실행한 기능과 예상 플레이 방식, 실제 사용의 차이를 적으세요.' },
  { id: 'feedback', label: '피드백 요약', hint: '수집 경로, 반복된 의견, 발견한 오류를 적으세요.' },
  { id: 'audience', label: '대상 사용자', hint: '게임을 즐길 사용자층을 구체적으로 적으세요.' },
  { id: 'value', label: '게임의 차별점', hint: '게임의 특징과 사용자에게 제공하는 가치를 적으세요.' },
  { id: 'installs', label: '첫해 예상 설치 수', hint: 'Play Console에서 선택할 예상 범위와 근거를 적으세요.' },
  { id: 'changes', label: '테스트 후 수정 사항', hint: '피드백에 따라 바꾼 내용과 확인한 버전을 적으세요.' },
  { id: 'readiness', label: '출시 준비 판단 근거', hint: '오류 수정 후 재검증, 안정성, 출시 가능하다고 판단한 근거를 적으세요.' },
] as const;
export type PlayAnswerId = typeof PLAY_ANSWERS[number]['id'];
export const PLAY_ACCESS_LABELS = { not_started: '신청 전', in_review: '액세스 심사 중', needs_testing: '추가 테스트 요청', approved: '액세스 승인·사용 가능' } as const;
export const PLAY_PRODUCTION_LABELS = { draft: '제출 전', in_review: '정식 출시 심사 중', changes_requested: '수정 요청', approved: '승인·공개 대기', published: '정식 공개 확인' } as const;
export interface GooglePlayRelease {
  revision: number; updatedAt: string | null;
  requirement: 'unknown' | 'required' | 'not-required';
  checks: Record<PlayCheckId, boolean>;
  closedTest: { testerCount: number | null; continuousDays: number | null; checkedOn: string; consoleEligible: boolean };
  access: keyof typeof PLAY_ACCESS_LABELS;
  production: keyof typeof PLAY_PRODUCTION_LABELS;
  answers: Record<PlayAnswerId, string>;
  reviewNotes: string;
}
export function emptyGooglePlayRelease(): GooglePlayRelease {
  return {
    revision: 0, updatedAt: null, requirement: 'unknown',
    checks: Object.fromEntries(PLAY_CHECKS.map(item => [item.id, false])) as GooglePlayRelease['checks'],
    closedTest: { testerCount: null, continuousDays: null, checkedOn: '', consoleEligible: false },
    access: 'not_started', production: 'draft',
    answers: Object.fromEntries(PLAY_ANSWERS.map(item => [item.id, ''])) as GooglePlayRelease['answers'], reviewNotes: '',
  };
}
export function playTestNumbersMet(value: GooglePlayRelease): boolean {
  return (value.closedTest.testerCount ?? 0) >= PLAY_POLICY.minimumTesters
    && (value.closedTest.continuousDays ?? 0) >= PLAY_POLICY.continuousDays && !!value.closedTest.checkedOn;
}
export function playTestComplete(value: GooglePlayRelease): boolean {
  return value.requirement === 'not-required'
    || (value.requirement === 'required' && playTestNumbersMet(value) && value.closedTest.consoleEligible);
}
export function playReleaseProgress(value: GooglePlayRelease) {
  const testComplete = playTestComplete(value);
  const completed = PLAY_CHECKS.filter(item => value.checks[item.id]).length
    + Number(testComplete) + Number(value.access === 'approved') + Number(value.production === 'published');
  let next: string;
  if (value.production === 'published') next = '출시 국가의 공개 상태와 크래시·ANR·사용자 피드백을 모니터링하세요.';
  else if (value.production === 'changes_requested') next = '정식 출시 심사의 수정 요청을 해결하고 새 버전을 제출하세요.';
  else if (value.production === 'in_review') next = '정식 출시 심사 결과를 확인하세요. 액세스 승인과는 별도 심사입니다.';
  else if (value.production === 'approved') next = '공개 대기 상태입니다. 출시 국가와 관리형 게시 설정을 확인하고 공개하세요.';
  else if (value.access === 'approved') next = '최종 AAB·스토어 정보·출시 국가를 점검하고 프로덕션 트랙에서 심사를 제출하세요.';
  else if (value.access === 'needs_testing') next = '추가 테스트 요청 사유를 기록하고 참여도·피드백·수정 근거를 보완하세요.';
  else if (value.access === 'in_review') next = '프로덕션 액세스 심사 결과를 기다리세요. 통상 7일 이내지만 더 걸릴 수 있습니다.';
  else if (value.requirement === 'unknown') next = '개발자 계정의 비공개 테스트 의무 적용 여부를 Play Console에서 확인하세요.';
  else if (!testComplete) next = playTestNumbersMet(value)
    ? 'Play Console 대시보드에서 프로덕션 액세스 신청 가능 여부를 확인하세요.'
    : '비공개 테스트 참여 인원과 연속 참여 일수를 확인하고 실제 테스트 피드백을 모으세요.';
  else if (value.requirement === 'not-required') next = '이 계정은 12명·14일 의무 대상이 아닙니다. Console에서 프로덕션 사용 가능 상태를 확인하세요.';
  else next = '테스트·게임·출시 준비 답변을 정리하고 Play Console에서 프로덕션 액세스를 신청하세요.';
  return { completed, total: 10, testComplete, next };
}
export function playApplicationDraft(name: string, value: GooglePlayRelease): string {
  return [`${name} — 프로덕션 액세스 신청 초안`, '직접 기록한 내용입니다. 제출 전 실제 테스트 결과와 대조하세요.',
    ...PLAY_ANSWERS.map(item => `\n${item.label}\n${value.answers[item.id].trim() || '[작성 필요]'}`)].join('\n');
}
