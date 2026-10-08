# Dev Catalog

Last Updated: 2026-10-01

## 예정

- 없음

## 진행

### AI 성장 운영 자동화 `23/24 (96%)`

[`ai-growth-operations`](active/ai-growth-operations/ai-growth-operations-plan-v2.md) · 생성일 `2026-09-13` · 태스크 수정일 `2026-09-24`

2026-09-24: 명시적 위임(OperationMandate)·광고 실험(native A/B·관찰 비교)·ROAS/순이익 ROI·단계 증액·가격 실험·지식 기반 고객응대·피드백 이슈·운영 화면을 구현하고 독립 리뷰 결함을 수정했다. 남은 것은 공급자별 실계정 gate와 장기 관찰(T-8.3). [검증](../docs/verification.md#2026-09-24-ai-성장-운영-구현).

### 앱 출시·마케팅·수익화·커뮤니티 통합 자동화 개발계획 `38/84 (45%)`

[`app-operations-platform`](active/app-operations-platform/app-operations-platform-plan-v11.md) · 생성일 `2026-09-11` · 태스크 수정일 `2026-09-24`

2026-09-24 후속: 실계정 없이 가능한 잔여 코드 공백(스토어 상품·정산·프리뷰, X 미디어, 광고 소재·귀속, 성과 규칙, 장비 이전 차단, macOS Seatbelt 빌드 격리)을 구현했다. 체크리스트는 실계정·타 OS·장기 수용 때문에 유지한다.

2026-09-24: v11 CLI AI 설정·Git/GitHub·tmux 개발 작업·웹 배포 구현과 독립 리뷰 수정 완료. 실제 CLI/MCP·native 대화 재개, 로컬/fixture 검사와 macOS 패키지를 확인했다. 새 23개 중 실계정·OS 수용 4개는 남기며 기존 장기 수용 42개도 유지한다. [사용법과 제한](../docs/ai-operations.md). 아래는 이전 검증 이력이다.

최근 체크포인트(2026-09-22): Grok 워커의 macOS 검사 안정화·CLI/MCP 기본 진단 구현 완료. 통합 452 통과·실패 0·환경 skip 16, 타입·빌드 및 독립 리뷰 완료. 실계정·다른 OS·장기 수용은 남아 있다.

최신 후속 완료: `gpt-6-astra ultra fast` 워커로 Mac Docker/Linux 빌드·키·SDK 경로를 구현하고 실제 Godot 빌드·서명·SSH 및 독립 리뷰 수정을 확인했다. 최종 500개 검사 Mac 485 통과/15 skip, Linux 491 통과/9 skip, 실패 0·양 OS 타입·빌드 통과. 최신 이미지의 키/취소/복구 26/26. [결과와 제한](../docs/verification.md#2026-09-22-macos-dockerlinux-실행과-sdk-이식성). 전체 장기 체크리스트 완수율은 유지한다.

프로젝트명·비공개 GitHub 저장소명: `gameStudioAutomaiton` (`sphacker83/gameStudioAutomaiton`).

최신 체크포인트: 화면별 AI 요청·채팅·Codex/OpenCode CLI 세션 resume/clear를 연결했다. 관련 25/25·타입·빌드·macOS Electron 검사 통과. 전체 검사의 기존 실패는 HEAD 비교로 구분했다. [결과와 제한](../docs/verification-assets/ai-requests-20260913.md) · [사용법](../docs/ai-operations.md).

후속: Electron 모드 전환의 자체 새로고침 차단을 수정했다. 네이티브 양방향 전환·취소·격리와 관련 23/23·타입·빌드를 확인했다. [검증과 재현](../docs/verification.md#2026-09-13-electron-모드-전환-멈춤).

최신 요청: AI 버튼은 기존 채팅만 열며, 숨겨진 고정 지시를 제거했다. 요청 흐름의 재설계는 사용자가 맡는다. AI 19/19·데스크톱 23/23·타입·빌드·12개 화면의 무실행 확인. [검증](../docs/verification.md#2026-09-13-ai-요청-자동-전송-제거).

종료 후속: macOS 포함 창 닫기·앱 종료 시 제어 서비스·AI·작업을 함께 정리한다. 관련 75/75·타입·빌드·네이티브 종료 3개 시나리오와 모드 전환 회귀 통과. [검증](../docs/verification.md#2026-09-13-앱-종료-시-프로세스-정리).

2026-09-23 후속: 운영준비·공급자 선택·OAuth 재사용·프로젝트 탐색·공식 SDK ZIP 해제 수정. 전체 493 통과/15 skip/실패 0·타입·빌드 및 Electron 검증. [근거](../docs/verification.md#2026-09-23-운영준비프로젝트-탐색oauth-ux). 장기 수용 범위는 유지한다.

Google 공통 OAuth 및 Electron 실계정 검증(2026-09-24): 독립 등록·암호화 보관·재시작 유지. 앱에서 Play/Ads 연결 검사, Seed2/SEED3 출시 조회, Ads 하위 계정 동기화(캠페인 12개) 성공. 추가 회귀 75/75·타입·빌드 통과. [검증](../docs/verification.md#2026-09-23-google-공통-앱-등록실계정-접근-검사).
