# AI 성장 운영 자동화 Tasks

Last Updated: 2026-09-24

2026-09-24 사용자 요청("나머지 다 구현해")으로 T-1.1~T-8.2를 구현했다. 로컬 행동 테스트, 실제 Electron 화면, 독립 리뷰와 수정 후 회귀 검사를 거쳤다. 외부 광고비·가격·메시지·게시를 쓰는 실계정 검증은 하지 않았다. 실계정 gate와 장기 관찰은 T-8.3에 남는다. AI는 채팅 제출이나 화면의 `AI 요청` 버튼으로만 시작한다. 주기 작업은 사용자가 확정한 활성 `OperationMandate`의 범위·기간 안에서만 실행한다.

## Phase 1 — 읽기 전용 성장 기준선 [상태: 완료]

- [x] T-1.1 AI 요청·native session·성장 운영 위임 envelope와 데이터 계약 확정
- [x] T-1.2 귀속 fact·FX·revision·신선도 read model 구현 (의존: T-1.1)
- [x] T-1.3 ROAS·순이익 ROI 품질 진단과 읽기 전용 화면 구현 (의존: T-1.2)

## Phase 2 — 한 공급자의 실험 관측 수직 단계 [상태: 완료]

- [x] T-2.1 공급자 실험 capability probe와 지원표 구현 (의존: T-1.1)
- [x] T-2.2 가설·대조군·arm·사전 등록 상태 모델 구현 (의존: T-1.1, T-2.1)
- [x] T-2.3 control/treatment 지표 읽기와 observational 라벨 구현 (의존: T-1.2, T-2.2)

## Phase 3 — 광고 실험 실행과 제한된 승자 확대 [상태: 완료]

- [x] T-3.1 native experiment 생성·schedule·end adapter 구현 (의존: T-2.1~3)
- [x] T-3.2 탐색→관찰→평가 decision engine 구현 (의존: T-1.3, T-2.3)
- [x] T-3.3 정책 한도 내 promote·단계 증액·실패 중지 구현 (의존: T-3.1, T-3.2)

## Phase 4 — 수익 폐루프와 수익화 실험 [상태: 완료]

- [x] T-4.1 광고비↔net proceeds cohort reconciliation 구현 (의존: T-1.2, T-3.2)
- [x] T-4.2 MAX ad-unit experiment 읽기→생성→promote/deprecate 구현 (의존: T-1.3)
- [x] T-4.3 가격·상품 제안, 고객경험 guardrail, rollback 구현 (의존: T-1.1, T-4.1)

## Phase 5 — 지식 기반 고객응대 read-only 단계 [상태: 완료]

- [x] T-5.1 승인된 지식 revision 수집·검색·근거 계약 구현
- [x] T-5.2 비신뢰 입력 격리와 구조화된 AI 분류·초안 구현 (의존: T-5.1)
- [x] T-5.3 민감도·opt-out·스팸 분류와 draft/escalation·요약 UI 구현 (의존: T-5.2)

## Phase 6 — 제한된 SNS 자동응대와 회수 [상태: 완료]

- [x] T-6.1 플랫폼 정책 승인 evidence와 발송 전 gate 구현 (의존: T-5.3)
- [x] T-6.2 일반 문의의 idempotent 자동 답글·복구 구현 (의존: T-6.1)
- [x] T-6.3 pause·회수·incident·운영 요약 구현 (의존: T-6.2)

## Phase 7 — 피드백에서 제품 개선 실험까지 [상태: 완료]

- [x] T-7.1 FeedbackItem 정규화·중복 수집 방지 구현 (의존: T-5.2)
- [x] T-7.2 설명 가능한 IssueCluster 후보·병합·우선순위 구현 (의존: T-7.1)
- [x] T-7.3 제품 가설·release·성과 실험 링크 구현 (의존: T-7.2, T-4.1)

## Phase 8 — 운영 통합과 실계정 단계적 수용 [상태: 진행 중]

- [x] T-8.1 scheduler·상태·복구·backup fencing 통합 (의존: T-3.3, T-4.3, T-6.3, T-7.3)
- [x] T-8.2 목표·실험·응답·이슈 운영 화면과 알림 완성 (의존: T-8.1)
- [ ] T-8.3 공급자별 실계정 gate·장기 관찰 (의존: T-8.2)

### T-8.3 참조 블록

- 작업 전 필독: [context의 현재 계약·남은 제한](ai-growth-operations-context.md), [plan v2 공급자 경계·Phase 8](ai-growth-operations-plan-v2.md), [연동 기능표](../../../docs/integration-capabilities.md), [검증 기록](../../../docs/verification.md#2026-09-24-ai-성장-운영-구현).
- 원본 코드 참조: `apps/controller/growth*.ts`, `packages/growth/*`, `packages/connectors/google-ads-experiments.ts`, `packages/connectors/applovin-max-experiments.ts`, `apps/desktop/src/views/growth/*`.
- 필요한 입력: 시험용 Google Ads 계정(Campaign Mix allowlist 여부), AppLovin MAX 시험 앱, X/Threads 시험 계정과 플랫폼 AI 답글 승인 문서, Play 시험 상품, 실제 외부 반영 승인 범위와 최소 예산.
- 수용 순서(각 단계는 별도 명시 승인): ① 읽기(probe·list·experiment-metrics·campaign-attribution·financeReports) ② 운영자 `verify-capability` 기록 후 시험 계정 쓰기(실험 생성·종료, MAX 실험, 소재 업로드) ③ 사용자가 지정한 최소 한도 실집행(예산 단계 증액, 가격 변경·원복, 자동 답글·회수) ④ 장기 관찰(귀속 창·정정 반영·invalidated 결정·수신 거부)
- 완료 조건: 공급자별 read/test/write/spend/price/post 검증 수준과 날짜가 `docs/integration-capabilities.md`에 기록되고, 미검증 기능은 계속 비활성이다. 장기 관찰은 모의 테스트로 대체하지 않는다.
