# 연동 기능·검증 범위

확인일: 2026-09-11(성장 운영 실험 행 2026-09-24). [계획 v3](../dev/active/app-operations-platform/app-operations-platform-plan-v3.md) · [검증 기록](verification.md) · [작업 목록](../dev/active/app-operations-platform/app-operations-platform-tasks.md).

데모는 9개 연결과 5개 엔진을 준비하고 같은 화면·큐·이력에서 작업한다. 실제 모드는 아래 공급자 API/CLI 구현을 사용한다. 공식 명세·모의 HTTP·로컬 실행 검증과 사용자 실계정의 권한·심사·게시·집행 검증을 구분한다.

| 서비스 | 구현된 범위 | 최초 준비·남은 제한 |
|---|---|---|
| Google Play | 기존 앱 AAB/APK 업데이트, 트랙 승격·단계적 출시, 스토어 현지화·이미지, 상품·구독 생성과 옵션별 가격 변경, 구매 옵션·기본 요금제 판매 시작/중지, 판매 ZIP/CSV | 최초 앱·계약·첫 바이너리는 Console. 판매 상태 전환이 요청 후에도 바뀌지 않으면 미확정으로 남긴다. 실계정 미검증 |
| App Store Connect | JWT, IPA buildUploads·상태 확인, 버전·현지화·앱 정보, 스크린샷·앱 프리뷰 동영상 업로드와 처리 확인, TestFlight 그룹·배포·빌드 연결, 심사 제출·재확인·수동/단계적 출시, IAP·자동 갱신 구독 생성·가격, 상품 심사 제출, 일별 판매와 월별 정산(financeReports) | 최초 앱은 Console. 정산 권한이 없으면 일별 판매만 수집한다. 정산이 있는 기간은 일별 proceeds를 합계에서 대체한다. macOS pkg·iOS 서명·기기·실계정 미검증 |
| Steam | 빌드·브랜치 조회, SteamCMD 지속 세션·업로드, SetAppBuildLive·재확인, 판매(정정 날짜 재수집)·공개 뉴스, 공지 준비 안내 | 전용 계정 1회 Steam Guard. 공개 전환은 모바일 확인 필요 가능. 공지 쓰기·상품 가격은 파트너 사이트(공개 API 없음). 정정 기준점 저장과 수집 결과 저장은 원자적이지 않다. 실계정 미검증 |
| Google Ads | 앱 캠페인 PAUSED 생성·예산·이름·중지·활성화, AppAd 소재 생성(등록 이미지 업로드·이름 해시 멱등), 지출, 캠페인·날짜별 귀속 fact(광고비·설치·전환·전환 가치). 실험 probe·목록·arm 일별 지표, Campaign Mix 생성·일정·종료 | Cloud/API 접근 수준, 소재 최소 요건. 앱이 공개되기 전에는 캠페인 활성화를 막는다. App 캠페인 A/B는 allowlist 전용 Campaign Mix만 가능하고 promote는 쓰지 않는다. 실험 쓰기는 운영자 시험 검증 기록 전 비활성. 이미지 비율 허용 오차는 가정값. 실계정 집행 미검증 |
| AppLovin Ads | 캠페인 생성·조회·변경·중지·지출, 소재 세트 조회·생성·변경(자산 해시 재사용), 캠페인별 광고비·설치와 설치일 cohort 수익(0~28일) 귀속 fact | API 접근 허용·MMP·입찰·타기팅 필요. 생성은 즉시 활성화하는 `LIVE`를 명시해야 함; 원자적 PAUSED 생성 미제공. 획득 A/B 미지원 — 캠페인 비교는 관찰 비교로만 기록 |
| AppLovin MAX | 광고 단위 조회·생성·변경(네트워크·빈도 제한·bid floor 설정), 추정 광고 수익, Android/iOS SDK 설정 안내, 광고 단위 실험 조회·생성·promote·deprecate(수익화 실험) | 게임 내부 SDK 자동 설치·NATIVE 템플릿·실기기 검증 미구현. 실험 쓰기는 공식 문서·모의 응답만 검증, 세그먼트 실험은 조회만 |
| AdMob | 앱·광고 단위 조회, 승인 상태·광고 수익, Android/iOS SDK 설정 안내 | 공개 API에 광고 단위 생성/변경 없음. SDK 실행·실기기 미검증 |
| X | OAuth/갱신, 글·답글·멘션·반응 조회, 텍스트·이미지·GIF·동영상 게시와 답글(미디어 업로드 후 media_ids 첨부), 본인 게시물 삭제·답글 숨김 | 계정 앱 권한·이용 한도. 미디어는 `media.write` 권한이 필요해 기존 연결은 재동의해야 한다. 게시 응답 유실 시 업로드한 미디어 ID만 남기고 재게시하지 않는다. DM·차단은 미지원. 실계정 게시 미검증 |
| Threads | OAuth/장기 토큰 갱신, 글·답글, 텍스트·HTTPS 이미지/동영상·캐러셀 발행·상태 확인, 본인 게시물 삭제·답글 숨김 | 공개 접근 가능한 미디어 URL·해당 권한 필요. 고급 분석·실계정 게시 미검증 |

X/Threads의 프로젝트별 채널·예약·공개 출시 공지·저장된 답글 규칙·일일 한도를 관리한다. 삭제/조정 대상은 동기화한 같은 프로젝트·연결의 자원이어야 하며 자기 글 소유권을 확인한다. Steam 뉴스는 프로젝트 AppID에 귀속하며 공개 쓰기 API가 없는 공지는 사이트 안내로 남긴다. 미지원 작업을 성공으로 기록하지 않는다.

Google/X refresh token, Threads 장기 토큰 갱신, Apple API 키 JWT, Steam 전용 CLI 세션을 재사용한다. 권한 철회·토큰 강제 만료·플랫폼 필수 본인 확인은 필요한 조치로 표시한다. 정상 갱신에는 재로그인을 요구하지 않는다. 키 원문은 SDK 안내·작업 결과에 노출하지 않는다.

Android 서명 키와 SSH 키는 암호화 버전·지문·만료·프로젝트 연결을 관리한다. 실제 Linux SSH 고정 서버 키·Git 의존성 가져오기와 JDK 서명 도구를 검증했다. 로컬/원격 Godot Linux는 실제 게임 실행까지 확인했고 다른 엔진·OS·iOS 서명은 장비 검증이 남았다.

운영·복구 화면에서 최초 연결·엔진·키 준비, 러너 페어링, 설정 백업/병합 복구, 진단, 앱 내 알림을 관리한다. 프로젝트 변경 감시와 예약은 제어 서비스 실행 중에 동작한다. OS 로그인 자동 시작·서명된 업데이트·앱 종료 중 상시 운영과 전체 장비/비밀 백업은 별도 범위다.

필드·공식 출처·예외: [스토어](store-integration.md), [광고](marketing-integration.md), [소셜](social-operations.md), [빌드 키](build-credentials.md), [빌드 지원](build-support.md), [원격 러너](runner-protocol.md), [데모·실행·복구 계약](demo-execution-contract.md).

성장 운영(2026-09-24)은 위임한 범위·기간 안에서만 위 쓰기 작업을 사용한다. 공급자 실험 기능은 `unsupported|action_required|read|test_write|write` 수준과 `fixture|read_verified|test_verified|live_verified` 검증 수준으로 따로 표시한다. probe는 `read`까지만 판정하고, 쓰기 수준은 운영자가 시험·실계정 검증 근거를 기록해야 오른다. X·Threads AI 자동 답글은 플랫폼 승인 근거 기록 전에는 초안까지만 만든다. [지표](metric-definitions.md#성장-운영-지표-2026-09-24) · [정책](automation-policies.md#성장-운영-위임-2026-09-24) · [고객응대](social-operations.md#ai-고객응대피드백-이슈-2026-09-24).
