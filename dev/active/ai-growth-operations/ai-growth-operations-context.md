# AI 성장 운영 자동화 Context

Last Updated: 2026-09-24

## Current Execution Contract

- 유효 plan: [ai-growth-operations-plan-v2.md](ai-growth-operations-plan-v2.md)
- Active Phase: Phase 8 — 운영 통합과 실계정 단계적 수용
- Active Task: T-8.3 공급자별 실계정 gate·장기 관찰
- 완료 조건: T-1.1~T-8.2 구현·로컬 검증·독립 리뷰 수정까지 끝났다. 전체 작업 완료는 T-8.3의 읽기→시험 쓰기→최소 한도 실집행→장기 관찰이 공급자별로 기록될 때다. 미검증 기능은 비활성으로 둔다.
- 금지 사항: 실계정 광고비·가격 변경·메시지·게시·push는 사용자의 별도 명시 승인 범위에서만 한다. 제품의 위임·자동화 옵션은 현재 세션의 외부 쓰기 승인이 아니다. 비밀 출력, 기존 plan 수정, 기존 변경 삭제를 하지 않는다.

## SESSION PROGRESS

### 2026-09-24 — T-1.1~T-8.2 구현, 독립 리뷰 수정

- 완료: 순수 모듈 `packages/growth/`(types·stats·attribution·decision·scale·pricing·rebalance·knowledge·community·feedback·ai-adapter), 제어 서비스 `apps/controller/growth.ts`(위임·정책·실험·스케줄러·요약), `growth-community.ts`(지식·응대·피드백·제품 링크), `growth-pricing.ts`, `growth-input.ts`, 커넥터 `google-ads-experiments.ts`·`applovin-max-experiments.ts`, UI `apps/desktop/src/views/GrowthView.tsx`·`views/growth/*`, AI 채팅 도구(growth_context·propose_mandate·propose_experiment·save_knowledge)와 선택 스냅샷·clear 감사 기록.
- 결정: AI가 만든 위임은 `proposed`이고 화면에서 확인 체크 후 확정한다. 화면 양식 위임만 즉시 확정한다. probe는 `read`까지만 판정하고 native 실험 쓰기는 운영자 `verify-capability` 근거 기록 뒤에만 연다. Google App 캠페인 실험(Campaign Mix)은 promote하지 않고 예산 단계 증액으로만 확대한다. native A/B는 공급자 arm 매핑이 확인된 실험 기간의 arm fact만 쓴다. 귀속 창이 끝난 cohort만 지표에 넣는다. 모든 성장 쓰기는 `growth-run`으로 출처를 남겨 중지·만료·수신 거부 때 전송 전 작업을 취소하고, 전송 직전에 위임·승인·원문·인용 지식을 다시 검사한다.
- 독립 리뷰(구현자와 분리된 세션): 차단 1(시작 전 캠페인 fact로 승자) · 주요 4(열린 귀속 창 판정 정지, 예약된 쓰기 미차단, 위임 일일 합계 누락, 재배분 수신 폭) · 경미 다수를 수정하고 각각 회귀 테스트를 추가했다. 보호 지표 최소 표본은 정할 근거가 없어 넣지 않았다(안전 방향 한계).
- 검증: `npm run typecheck` 통과, `npm test` 실패 0, `npm run build` 통과, `node scripts/verify-desktop-growth.mjs`(격리 데이터·큐 정지, 실제 Electron) 8개 시나리오 통과. 결과는 [검증 기록](../../../docs/verification.md#2026-09-24-ai-성장-운영-구현).
- 다음: T-8.3 — 사용자가 시험 계정과 외부 반영 승인 범위를 주면 읽기 검증부터 단계적으로 수용한다.

### 2026-09-13 — v2 보완·2차 기획 기준선 (이력)

- 명시적 요청·CLI 세션·주기 위임 계약으로 plan v2를 만들고 24개 task를 정의했다. 제품 코드는 수정하지 않았다.

## 다음 세션 읽기 순서

1. [ai-growth-operations-plan-v2.md](ai-growth-operations-plan-v2.md)
2. [ai-growth-operations-tasks.md](ai-growth-operations-tasks.md)
3. 이 파일
4. 변경 이력이 필요할 때만 [bootstrap plan](ai-growth-operations-plan.md)
5. [1차 최신 v6](../app-operations-platform/app-operations-platform-plan-v6.md) → [기존 tasks](../app-operations-platform/app-operations-platform-tasks.md) → [기존 context](../app-operations-platform/app-operations-platform-context.md)
6. [자동화 정책](../../../docs/automation-policies.md) → [지표 정의](../../../docs/metric-definitions.md) → [소셜 운영](../../../docs/social-operations.md) → [연동 기능표](../../../docs/integration-capabilities.md)
7. `packages/domain/index.ts`, `packages/storage/index.ts`, `apps/controller/{automation,queue,service,campaign-budget,social-automation}.ts`, `packages/{metrics,credentials,connectors,social}/`

## 핵심 파일과 역할

- 2026-09-24 구현: `packages/growth/*`(계약·지표·통계·결정·규칙), `apps/controller/growth.ts`·`growth-community.ts`·`growth-pricing.ts`·`growth-input.ts`, `packages/connectors/*-experiments.ts`, `apps/desktop/src/views/growth/*`, `scripts/verify-desktop-growth.mjs`, 테스트 `tests/growth-*.test.ts`. 아래 목록은 기획 당시의 재사용 지점이다.

- `dev/active/ai-growth-operations/ai-growth-operations-plan-v2.md` — 현재 유효한 명시적 요청·세션·mandate·성장 운영 계약. bootstrap plan과 충돌하면 v2를 따른다.
- `packages/domain/index.ts` — 현재 Project policy, Run/effect 상태, MetricFact, social/resource 공개 계약. 성장 도메인 확장 후보.
- `packages/storage/index.ts` — SQLite WAL/FULL, controller/run lease, document 저장, idempotency와 외부 effect 복구의 기준선.
- `apps/controller/automation.ts` — 30초 scheduler와 원천별 sync/reconcile stamp. 새 growth cycle의 재사용 지점.
- `apps/controller/queue.ts` — 실행 concurrency, retry/action_required, 취소와 결과 불명 처리.
- `apps/controller/service.ts` — 정책·vault·connector·metrics/resource persistence·외부 쓰기 직전 재검사의 통합 경계.
- `apps/controller/campaign-budget.ts` — 같은 통화의 기존/대기 캠페인 예산을 합산하고 pause는 허용하는 현재 안전장치.
- `packages/metrics/index.ts` — 정수 micros/BigInt와 통화별 contribution; 아직 ROAS/ROI·cohort가 없는 출발점.
- `packages/connectors/google-ads.ts` — APP_CAMPAIGN, 지출, 소재/예산/상태 작업. native experiment는 미구현.
- `packages/connectors/applovin-ads.ts` — Axon 캠페인/지출과 ROAS goal. acquisition A/B lifecycle은 미검증.
- `packages/connectors/applovin-max.ts` — MAX ad unit/추정 수익. 공식 experiment endpoint는 후속 구현 후보.
- `packages/social/**` — X/Threads/Steam API, 소유권, 토큰, 쓰기 결과 불명 계약.
- `apps/controller/social-automation.ts` — 프로젝트별 한도/예약/출시 공지/고정 규칙 답글과 중복 방지.
- `apps/desktop/src/views/{MarketingView,MonetizationView,CommunityView}.tsx` — 목표·실험·결정·응답·issue 운영 UI 확장 지점.
- `packages/agent/**` — 채팅·native session·MCP 도구. 성장 도구 4종과 선택 스냅샷·clear 감사 기록을 추가했다.

## 1차 구현 통합 체크포인트 — 2026-09-13

루트가 이후 [1차 v7](../app-operations-platform/app-operations-platform-plan-v7.md)의 요청 기반 버튼·채팅·native resume/clear와 CLI/MCP 도구를 통합했다. 관련 25/25·타입·빌드·Electron 검증 근거는 [결과](../../../docs/verification-assets/ai-requests-20260913.md)에 있다. 위 초안/미통합 서술과 plan-v2의 작성 당시 상태는 과거 관측이다. 2026-09-24에 2차 OperationMandate·실험·자동응대를 구현했다(위 SESSION PROGRESS).

## 중요한 의사결정

- AI 시작점을 사용자 동작으로 한정한다: 채팅 제출과 현재 화면의 `AI 요청` 버튼만 `AIRequest`를 만들며 등록·화면 진입·재시작·sync는 만들지 않는다. 버튼은 숨은 direct action이 아니라 화면/선택 snapshot이 보이는 채팅 요청이다. 기각한 대안: 프로젝트 등록이나 화면 lifecycle에서 자동 AI 호출.
- 실제 CLI session을 논리 채팅에 bind한다: 공급자가 반환한 Codex/OpenCode native ID를 저장하고 clear 전 exact resume, clear 뒤 다음 요청에서 새 session을 만든다. resume 실패는 action_required다. 기각한 대안: 내부 UUID를 native ID로 가장하거나 조용히 새 session으로 fallback.
- 주기 작업 권한은 `OperationMandate`다: 광고/수익/커뮤니티 작업은 구체적 범위·기간·상한을 요청한 mandate 안에서만 진행하고 재시작은 만료 전 기존 mandate만 resume한다. 기각한 대안: 페이지 방문·등록·앱 재시작을 opt-in으로 간주.
- reply 중복 identity와 감사 버전을 분리한다: 외부 interaction identity에는 policyVersion을 넣지 않고 정책/지식 버전은 audit로 저장한다. 모든 자동 승인 reply도 durable queue를 통과한다. 기각한 대안: 정책 변경 때 같은 interaction 재발송 또는 AI/UI direct writer.
- 반복 효능 판단은 fixed-horizon 단일 판정 또는 사전 등록된 유효 sequential rule만 허용한다: 일상 watermark 평가는 품질/안전 감시와 구분한다. 기각한 대안: 매 주기 같은 고정표본 p-value를 반복해 최초 유의 시 승자 선택.
- ROAS와 순이익 ROI를 별도 계약으로 유지한다: ROAS는 선택한 revenue basis/광고비, ROI는 net proceeds에서 광고비와 중복되지 않은 직접 변동비를 뺀 순이익/투입비다. 기각한 대안: 현재 contribution을 ROAS 또는 회사 순이익으로 이름만 변경.
- 공급자 native assignment가 검증된 실험만 A/B로 승자 확대한다: Google App campaign의 Campaign Mix는 allowlist 실계정 probe가 필요하고 Axon acquisition A/B는 미검증이다. 기각한 대안: 독립 캠페인 성과 차이를 무조건 A/B로 간주.
- 모든 숫자 한도는 versioned GrowthPolicy 값이다: 문서상의 관찰 주기·유의수준·step은 제안 기본값일 뿐 사용자 정책이 아니다. 기각한 대안: 코드 상수로 예산·가격·통계 결정을 고정.
- AI는 분류·근거 있는 draft를 만들고 기존 queue/policy가 외부 쓰기를 소유한다: 외부 텍스트는 비신뢰 데이터이며 vault/tool 권한을 받지 않는다. 기각한 대안: 소셜 모델에 게시 도구와 정책 변경 권한 직접 제공.
- 실험/응답/이슈 도메인 상태와 실행 `Run`을 분리한다: 각 외부 effect만 기존 prepared/dispatched/reconcile 계약을 사용한다. 기각한 대안: 장기 실험 lifecycle 전체를 하나의 장시간 queue run으로 유지.
- 초기 저장은 기존 `documents`+`writeBatch`를 재사용한다: 실제 cohort 규모·질의 요구가 입증되기 전 새 데이터베이스/서비스를 추가하지 않는다. 기각한 대안: 기획 단계에서 별도 warehouse를 필수화.

## 외부 근거와 미확인 조건

- 2026-09-13 확인: Google Ads Experiments overview/reporting은 control/treatment lifecycle과 통계 보고를 제공한다. App campaign에 Campaign Mix를 쓰는 계정 allowlist·정확한 operation은 실계정 미검증이다.
- 2026-09-13 확인: AppLovin MAX Ad Unit Management API는 `/ad_unit_experiment` 생성/조회/promote/deprecate를 문서화한다. 2026-09-24 adapter를 구현했고(조회·생성·promote·deprecate) 실계정 권한·쓰기는 미검증이다.
- 2026-09-13 확인: X Automation Rules는 interaction당 1회, opt-in/out, 스팸/민감 필터와 AI reply bot의 사전 서면 승인을 요구한다. 프로젝트 계정 승인 여부는 미확인이다.
- AppLovin Axon acquisition experiment API는 현재 공식 페이지를 브라우저로 재확인하지 못했고, repository의 2026-09-11 공식 근거와 현재 connector만 확인했다. native A/B 지원으로 주장하지 않는다.
- Threads AI 자동 고객응대의 최신 정책/심사 조건은 이번 공식 검색에서 확인하지 못했다. 확인 전 자동 발송을 비활성으로 유지한다.
- 2026-09-24 재확인: Google Ads App 캠페인 A/B는 allowlist 전용 Campaign Mix만 가능하고 공식 종료 방법은 End/Graduate다(promote 미사용).
- 실계정, 실광고비, 실제 가격·상품, 실제 SNS 게시/답글은 모두 미검증이며 구현 세션에서도 실행하지 않았다.

## 빠른 재개 안내

- 재시작 시 바로 실행할 명령: `node --import tsx --test tests/growth-*.test.ts` → `npm run build && node scripts/verify-desktop-growth.mjs`
- 현재 blocker: T-8.3은 시험 계정·플랫폼 승인 문서·외부 반영 승인 범위가 필요하다.
- 감수한 한계: 보호 지표 위반은 최소 표본 없이 점추정으로 중지한다(안전 방향). 순수익 fact가 없는 광고 실험은 광고비 전체를 손실로 계산해 위임 손실 한도가 지출 상한처럼 동작한다. Google 이미지 비율 허용 오차, AppLovin cohort 수익 통화(USD)는 문서 미기재 가정이다. Steam 정정 기준점 저장은 수집 결과 저장과 원자적이지 않다. 규칙 분류는 키워드 기반이라 오탐·미탐이 있다. MAX 실험 결과 지표는 수집하지 않아 MAX 실험은 판정되지 않고 운영자 확인이 필요하다.
