# 수익·광고비 지표

Last Updated: 2026-09-24

[작업 목록](../dev/active/app-operations-platform/app-operations-platform-tasks.md) · [연동 기능표](integration-capabilities.md)

금액은 문자열 정수 마이크로 단위(1 통화 단위=1,000,000)로 저장하고 BigInt로 합산한다. 날짜·통화·앱·원천을 보존한다. 통화를 섞거나 임의 환산하지 않고 미수집은 미수집으로 표시한다.

| 원천 | 기준 |
|---|---|
| Play earnings | Merchant Currency의 부호 있는 수수료·환불·조정 포함 proceeds |
| Apple Sales Reports | 개발자 proceeds, 통화·환불 부호 보존 |
| Steam Financial | net_sales_usd 기반 proceeds, 총매출·반환액은 보고 요약에서 구분 |
| MAX / AdMob | estimated revenue, 확정 입금과 구분 |
| Google Ads / AppLovin Ads | 원천 통화 spend |

contribution은 수집된 수익−광고비이고 회사 전체 순이익이나 캠페인 ROAS가 아니다. 원천 기간이 다를 수 있다. 코호트·귀속 기간을 맞춘 ROAS·순이익 ROI는 아래 성장 운영 지표에서 별도로 계산한다.

앱 식별자가 등록 프로젝트와 유일하게 일치할 때만 매핑한다. 계정 전체 보고를 화면에서 선택한 프로젝트에 일괄 귀속하지 않는다. 식별자 없는 보고는 전체 합계에만 사용한다.

Google Ads의 여러 캠페인 행은 같은 앱·날짜별 광고비로 먼저 BigInt 합산한 뒤 저장한다. AdMob의 SDK 앱 ID는 앱 목록의 `linkedAppInfo.appStoreId`로 Android 패키지에 연결한다. iOS 숫자 스토어 ID·미연결 앱은 bundle ID로 추측하지 않으며 원래 SDK ID를 원천 메타데이터에 보존한다.

원천·연결·날짜·통화·종류로 upsert한다. Play는 최근 완료된 3개월을 재수집하고 성공한 월을 원자적으로 교체해 삭제·정정 행을 반영한다. ZIP/CSV 한도를 검사하며 주문 ID·구매자 자료는 저장하지 않는다. 다른 공급자의 조회 기간 밖 정정·삭제 행 완전 반영은 미검증이다.

같은 앱/일자의 MAX와 AdMob 수익이 겹치면 AdMob을 합계에서 제외하고 주의를 표시한다. 앱 식별자가 없으면 같은 일자·통화의 중복 가능성도 보수적으로 제외한다. MAX 밖 AdMob 수익이 빠질 수 있으므로 전체 확정값이 아니다. 앱/광고 단위별 원천 선택·정산 대조는 후속 작업이다.

Play 보고서의 경로·필드·권한은 [Google 공식 안내](https://support.google.com/googleplay/android-developer/answer/6135870?hl=en)를 따른다. 비공개 버킷과 재무 권한, devstorage.read_only 범위가 필요하다. 상품 가격을 매출로 계산하지 않는다.

## 성장 운영 지표 (2026-09-24)

구현: `packages/growth/attribution.ts`, `packages/growth/decision.ts`. 원천 fact는 `attribution-fact` 문서로 저장한다.

- **grain**: 프로젝트·공급자·연결·캠페인·실험·arm·획득일·cohort·귀속 창·종류·통화·수익 기준·사건일·원천 ID. `observedAt`·`collectedAt`·`sourceWatermark`·`finality(estimated|proceeds|settled)`를 보존한다.
- **정정**: 기존 fact를 덮어쓰지 않는다. 같은 grain은 revision이 높은 것을 쓰고, `supersedes`가 가리키는 fact는 제외한다. 같은 원천의 동일 grain 중복은 한 번만 센다. 정정으로 확정 승자가 유지되지 않으면 `invalidated` 결정을 남기고 자동 재증액하지 않는다.
- **ROAS(w, basis)** = 같은 획득 cohort·귀속 창 w의 basis 수익 ÷ 같은 cohort의 광고비. basis(`gross_conversion_value`·`net_proceeds`·`estimated_ad_revenue`)를 화면에 함께 표시한다.
- **순이익 ROI(w)** = (순수익 − 광고비 − 가변비용) ÷ (광고비 + 가변비용). 순수익은 `net_proceeds` 수익에서 별도 환불·수수료·세금 fact를 뺀 값이다. 같은 원천이 이미 net이면 다시 빼지 않는다. 가변비용은 max(0, 순수익) × 정책의 가변비용 비율이다. 고정비를 넣지 않으므로 회사 회계 ROI가 아니다.
- **계산하지 않는 경우**(`null`과 사유 표시): 광고비 0, 캠페인/arm·획득일 귀속이 없는 수익, 귀속 창 혼합, 신선도 초과, 최근 cohort의 귀속 창 미완료, 선택한 basis 수익 없음, FX 없는 통화 혼합. 순이익 ROI는 estimated fact가 하나라도 있으면 계산하지 않는다.
- **FX**: 정책이 허용한 출처의 스냅샷만 쓴다. 거래일 이전 가장 가까운 기준일을 쓰고, 허용 기간 초과·미래 기록은 쓰지 않는다. BigInt 정수 연산·half-up 반올림이다. 환산할 수 없으면 통화별 보고서로 나누고 목표 판정을 막는다.
- **신선도**: 원천별 마지막 `observedAt`을 정책의 허용 시간과 비교한다. 기준이 없는 원천은 stale이다. 기준값은 사용자 정책이며 실계정 관측 후 조정한다.
- **실험 손실**: arm 광고비 − 귀속 순수익(net_proceeds, estimated_ad_revenue). `gross_conversion_value`는 개발자 수익이 아니어서 넣지 않는다. 순수익 fact가 없으면 광고비 전체가 손실이 되어 위임 손실 한도가 실험 지출 상한처럼 동작한다.
- **통계 판정**: 비율 지표는 pooled 2표본 z검정, 금액·비율 지표는 cohort 일별 값의 Welch t검정이다. 실험군이 여럿이면 정책의 Holm 또는 BH 보정을 적용한다. fixed-horizon은 사전 등록한 판정 시각에 한 번만 효능을 본다. sequential은 사전 등록한 look 시각에서 Lan-DeMets alpha-spending(O'Brien-Fleming 또는 Pocock) 증분을 경계로 쓴다. 증분 경계는 union bound라 보수적이다. 표본·기간·귀속 창·신선도·통화·배정 증명이 부족하면 look을 쓰지 않고 보류한다. 최대 관찰 기간이 지나도 표본이 부족하면 inconclusive로 끝낸다.
- 관찰 비교(`observational_comparison`)는 승자를 정하지 않는다. 결정마다 fact ID·정책 버전·알고리즘 버전·위임 ID를 보존한다.
