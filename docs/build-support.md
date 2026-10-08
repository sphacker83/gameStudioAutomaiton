# 빌드 지원표

Last Updated: 2026-09-24

이 표는 엔진 검수·빌드 plan·러너 구현을 기준으로 한다. **실측**은 이 저장소에서 실제 파일·프로세스로 확인한 동작이다. **미검증**은 공식 CLI 문서에 맞춰 명령을 구성했으나 해당 엔진/SDK/호스트가 이 환경에 없어 실제 결과물·서명을 확인하지 못한 항목이다. 미검증을 지원 완료로 읽지 않는다.

공식 근거:

- Godot CLI 내보내기: <https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html>
- Unity Editor CLI: <https://docs.unity3d.com/6000.0/Documentation/Manual/EditorCommandLineArguments.html>
- Unreal BuildCookRun: <https://dev.epicgames.com/documentation/en-us/unreal-engine/build-operations-cooking-packaging-deploying-and-running-projects-in-unreal-engine>
- Android Gradle Wrapper: <https://developer.android.com/build/building-cmdline>
- Xcode archive/export: `xcodebuild archive` 및 `-exportArchive` (Apple 문서, macOS 전용)

## 탐지 우선순위

같은 폴더에 여러 마커가 있으면 Godot(`project.godot`) > Unity(`ProjectSettings/ProjectVersion.txt` 또는 내보내기 마커) > Unreal(`.uproject`) > 네이티브 Android > 네이티브 iOS 순이다. Unity가 내보낸 Gradle(`unityLibrary`, `com.unity3d.player`, `Unity-iPhone.xcodeproj`)과 Godot `android/build` Gradle은 네이티브 Android로 분류하지 않는다. 서로 다른 엔진의 일차 마커가 함께 있으면 `detect.conflict` finding을 남기고 위 순위로 하나를 고른다.

## 실측 (이 환경에서 확인)

초기 호스트: Linux, Node.js 22. 초기 도구 탐지 검사는 최소 프로젝트 파일·모의 실행 파일을 사용했다. 이후 공식 Godot 4.3 편집기와 템플릿을 전용 폴더에 준비해 아래 실제 내보내기 및 controller E2E를 검증했다. 2026-09-22에는 macOS arm64 제어 서비스에서 Docker Linux arm64 러너로 빌드하고 결과물을 회수하는 경로도 검증했다. Unity/Unreal/Xcode/Android SDK를 사용하는 실제 앱 빌드는 미검증이다.

| 항목 | 결과 | 근거 |
|---|---|---|
| Godot `project.godot` + `export_presets.cfg` 탐지 | 통과 | 이름·4.3 버전·패키지 ID·android/linux 타깃 |
| Unity `ProjectSettings/ProjectVersion.txt` 탐지 | 통과 | 에디터 버전·applicationIdentifier |
| Unreal `.uproject` + `DefaultEngine.ini` 탐지 | 통과 | EngineAssociation 5.4, PackageName |
| 네이티브 Android Wrapper+Manifest | 통과 | applicationId, 대상 android. `gradlew`는 실행하지 않음 |
| 네이티브 iOS pbxproj/scheme | 통과 | 번들 ID. Linux에서 `ios.requires_macos` 오류 finding |
| Unity 내보낸 Gradle 오탐 방지 | 통과 | `unityLibrary` Gradle이 `android`가 아니라 `unity` |
| Unity 원본+Gradle, Godot+`android/build` | 통과 | 각각 unity / godot 유지 |
| 혼합 폴더 충돌 | 통과 | godot+unity 마커 → `detect.conflict`, Godot 우선 |
| 검수 중 빌드 스크립트 미실행 | 통과 | 실행 시 표시를 남기는 `gradlew`가 호출되지 않음 |
| Git 없는 폴더 검수·스냅샷 | 통과 | `.git` 없이 동작 |
| 스냅샷 원본 보존 | 통과 | 원본 내용·mtime 유지 |
| 비밀·캐시·외부 심볼릭 링크 제외 | 통과 | `.env`, `.pem`, `id_rsa`, `.godot/`, `Library/`, 외부 링크 미복사 |
| 출력 디렉터리 자기포함 방지 | 통과 | 원본 안의 대상 폴더는 매니페스트에 재포함되지 않음 |
| 매니페스트 해시 결정성 | 통과 | 동일 입력 두 스냅샷의 SHA-256 일치 |
| `spawn(shell: false)` + 인수 배열 | 통과 | `a; rm -rf /` 가 셸로 해석되지 않음 |
| 모의 실행 파일 성공·결과물 실존 | 통과 | 파일이 있을 때만 `exitCode=0` |
| 도구 부재 | 통과 | 없는 실행 파일 → 종료 코드 127, 결과물 없음 |
| 프로세스 실패 | 통과 | 종료 코드 2를 성공으로 바꾸지 않음 |
| 결과물 없는 성공 코드 | 통과 | 프로세스 0이어도 기대 파일 없으면 실패 |
| AbortSignal 취소 | 통과 | 샌드박스 프로세스 종료, `cancelled=true` |
| Linux bwrap 격리 | 통과 | 호스트 비밀 파일 읽기 차단, 격리 실패 시 폴백 없음 |
| 표준 출력 제한 | 통과 | 2MB 출력이 1MB에서 잘림 |
| 빈 명령 plan | 통과 | 명령 0개면 실패 |
| Godot/Unity/Unreal/Gradle plan 형식 | 통과 | 공식 인수 배열 생성. 없는 프리셋/빌드 프로파일은 명령을 만들지 않음 |
| `scanToolchains` | 통과 | 미설치 도구는 `available: false` + 이유. Linux에서 xcodebuild 불가 |
| Linux 네이티브 bwrap Godot 4.3 export | 통과 | 기존 Linux 실행 경로 유지. 아래 2026-09-11 실측 |
| Mac arm64 → Docker Linux arm64 Godot 4.3 export | 통과 | 인증 HTTP 전송·bwrap export·Mac 결과물 회수. 아래 2026-09-22 실측 |
| Mac으로 회수한 Linux 게임의 실행 | 통과 | 같은 결과물의 복사본을 Linux bwrap에서 실행, exit 0·`AppOps controller build OK` |
| macOS 네이티브 Seatbelt 격리 | 통과 | 홈·앱 데이터·`~/.ssh`·키체인 읽기 차단, 네트워크 차단, 쓰기 범위 제한, 환경 정리, 프로세스 트리 취소. 아래 2026-09-24 실측 |
| macOS Seatbelt 안 실제 Godot 4.7.2 | 통과 | `--headless --version`·`--import`·씬 실행·macOS 프리셋 `--export-pack`. 아래 2026-09-24 실측 |

## 미검증 (실제 엔진·장비 필요)

| 조합 | 구성한 명령 | 미검증 이유 |
|---|---|---|
| Godot 4.x Android/iOS/Windows/macOS 실제 내보내기 | `godot --headless --path <project> --export-release <preset> <output>` | Linux 외 타깃 템플릿·서명·호스트 미검증 |
| Unity 데스크톱 실제 플레이어 | `-batchmode -nographics -quit -projectPath -buildLinux64Player` 등 | Unity Editor 없음. 라이선스·모듈 미확인 |
| Unity Android/iOS | `-activeBuildProfile` + `-build` (전용 `-build*Player` 없음) | 빌드 프로파일 샘플과 Editor 없음 |
| Unreal BuildCookRun | `RunUAT.sh BuildCookRun -build -cook -stage -package -archive` | Unreal Engine / UAT / 플랫폼 SDK 없음 |
| 네이티브 Android AAB/APK | `gradlew app:bundleRelease` 또는 debug `assembleDebug` | JDK·Android SDK·실제 앱 모듈 빌드 없음 |
| iOS archive/IPA | `xcodebuild archive` 후 `-exportArchive` | Mac 네이티브 Xcode·서명·ExportOptions.plist 빌드 미검증. Linux Docker 경로의 지원 대상에 포함되지 않음 |
| 서명된 스토어 결과물 | Play AAB, App Store IPA, Steam 데스크톱 바이너리 | 서명 비밀·스토어 업로드는 이 범위 밖 |
| Windows 네이티브 러너 | Unity Hub 기본 설치 경로 탐색 | 네이티브 격리 백엔드가 없어 준비 완료로 표시하지 않음 |
| macOS 네이티브 전체 내보내기·Xcode | Godot `--export-release`(.zip/.app), `xcodebuild archive` | Seatbelt 격리와 Godot PCK 내보내기만 실측. 전체 앱 번들·코드 서명·공증·Xcode/Unity/Unreal/Gradle의 Seatbelt 호환성은 미검증 |

## 샌드박스 도구 준비 (1회 APPOPS_* 설정)

샌드박스는 네트워크가 없고 HOME이 비어 있어 표준 Gradle Wrapper 다운로드나 Godot 템플릿 자동 설치가 불가능하다. 아래 도구/캐시를 **홈 밖 전용 디렉터리**에 1회 준비하고 환경 변수로 지정한다. 이 `APPOPS_*` 변수 자체는 샌드박스에 전달되지 않고, 검증된 경로만 read-only로 mount된다. 준비되지 않으면 plan이 명령을 만들지 않고 actionable finding을 남긴다(fail closed).

Docker Linux 러너는 Godot 편집기를 이미지 빌드 때 준비하고, 템플릿은 첫 기동 때 named volume으로 내려받은 뒤 bwrap 빌드를 시작한다. 최초 템플릿 다운로드는 약 1 GiB이며 매 기동 archive 해시를 재검증한다. 별도 Docker 환경과 준비 절차는 [원격 러너 문서](runner-protocol.md#docker-linux-러너-준비와-연결)를 따른다. 기존 Linux 네이티브 러너는 아래 설정을 그대로 사용한다.

| 환경 변수 | 가리킬 대상 | 검증 조건 |
|---|---|---|
| `APPOPS_GRADLE_TOOLS_DIR` | 오프라인 Gradle 도구 캐시 | `wrapper/dists/<배포판>/`(프로젝트 `gradle-wrapper.properties`의 distributionUrl 버전)과 `dependency-cache/`가 있어야 하며, `gradle.properties`가 없어야 한다(자격 증명 혼입 방지). 홈 밖. |
| `APPOPS_GODOT_DATA_DIR` | Godot 데이터 디렉터리 | `export_templates/<버전>/`(예: `4.3.stable/linux_release.x86_64`)가 있어야 한다. 홈 밖. 런타임에 per-run `XDG_DATA_HOME/godot/export_templates`로 read-only 링크된다. |
| `APPOPS_JAVA_HOME` (또는 `JAVA_HOME`) | JDK 루트 | `bin/java` 실행 파일 존재, 홈 밖. Gradle에 `JAVA_HOME`으로 전달·mount. |
| `APPOPS_ANDROID_SDK_ROOT` (또는 `ANDROID_HOME`) | Android SDK 루트 | `platforms/` 또는 `build-tools/` 존재, 홈 밖. `ANDROID_HOME`/`ANDROID_SDK_ROOT`로 전달·mount. |
| (Unreal) `engineExecutable`/`UE_ROOT` | RunUAT 경로 | `Engine/Build/BatchFiles`, `Engine/Binaries`, AutomationTool(`Engine/Binaries/DotNET` 또는 `Engine/Source/Programs/AutomationTool`)이 있는 검증된 엔진 루트. 루트 전체를 `UE_ENGINE_ROOT`로 mount. |

- 쓰기 가능한 per-run 캐시(`GRADLE_USER_HOME`, `XDG_DATA_HOME`)는 실행별 출력 디렉터리 안에만 생성되고 매 시도마다 초기화된다. 도구 이미지는 read-only, 캐시는 프로젝트 코드 실행 없이 디렉터리 생성·심볼릭 링크로만 준비한다.
- Gradle은 `--offline --no-daemon`으로 실행하고 `GRADLE_RO_DEP_CACHE`로 준비된 의존성 캐시를 read-only로 사용한다.
- `scanToolchains`는 위 준비 상태를 `gradle-offline-cache`/`godot-export-templates`/`jdk-home`/`android-sdk-validated`/`unreal-engine-root` 항목으로 미리 보고해 실행 전에 누락을 드러낸다.

## 러너 계약

- 빌드 입력은 이미 만든 스냅샷 경로를 사용한다. 원본 폴더를 빌드 cwd로 쓰지 않는다.
- 실행은 `shell: false`와 인수 배열만 사용한다.
- Linux에서는 bubblewrap(`/usr/bin/bwrap`)으로 실행한다. 스냅샷·출력·검증된 도구 경로만 bind하고, `--clearenv` 후 최소 환경, `--unshare-net`으로 네트워크 차단, `--unshare-pid`+`--proc`으로 pid 격리, 사용자 홈(특히 `~/.gradle`·`~/.ssh` 같은 dotfile 트리)·controller 데이터·DBus는 mount하지 않는다. `APPOPS_*` 변수는 샌드박스에 넣지 않는다.
- 격리 백엔드를 초기화할 수 없으면 일반 실행으로 폴백하지 않고 실패한다 (fail closed).
- macOS에서는 `/usr/bin/sandbox-exec`로 실행 시점에 생성한 Seatbelt 프로필을 적용한다(backend `seatbelt`). 규칙과 실측은 아래 [macOS Seatbelt 격리](#macos-seatbelt-격리-2026-09-24-macos) 절을 따른다. `probeIsolation()`은 실제 샌드박스에서 `/usr/bin/true` 실행과 홈 비밀 파일 읽기 차단을 확인한 뒤에만 사용 가능으로 보고한다.
- Windows 네이티브 실행은 검증된 내장 격리 러너가 없어 준비 완료로 표시하지 않는다. macOS에서 추가 Docker 환경을 사용한 Linux 러너의 Godot Linux 빌드는 아래와 같이 검증했다.
- 취소 시 프로세스 그룹에 SIGTERM 후 유예 시간 뒤 SIGKILL. macOS는 pid 네임스페이스가 없으므로 취소 시점의 자손 프로세스(부모 pid 기준)도 함께 신호를 보내 `setsid`로 그룹을 벗어난 자식까지 종료한다.
- 표준 출력/에러는 스트림당 1,048,576바이트에서 자른다.
- **결과물 출처 보증**: 매 빌드 시도 시작에 출력 디렉터리와 기대 결과물 경로(스냅샷 안 포함)를 제거해 이전 시도의 산출물이 재인증되지 않게 한다. 제거는 스냅샷/출력 루트 안의 검증된 경로만 대상으로 하며 호스트 경로는 건드리지 않는다.
- 기대 결과물 경로는 실행 전에 검증한다: 스냅샷/출력 루트 밖, 스냅샷 루트 전체, 대상과 맞지 않는 확장자(android→`.apk`/`.aab`, ios→`.ipa`/`.zip`/`.xcarchive`)는 거부한다.
- 기대 결과물은 심볼릭 링크·0바이트 파일·빈 디렉터리를 성공으로 인정하지 않는다.
- 스냅샷은 심볼릭 링크를 따라가지 않고(leaf는 `O_NOFOLLOW`로 열어 lstat→open 사이 교체를 차단), 엔진 캐시와 키·환경 파일, 그리고 임의 깊이의 `.git`(디렉터리·gitlink 파일 모두)을 제외한다. 두 번째 경계로 `excludedRoots`(controller 데이터 디렉터리 등, real path 기준)를 받아 원본 아래 심볼릭 alias까지 제외한다. 읽을 수 없는 디렉터리·파일은 조용히 건너뛰지 않고 오류로 실패시켜 부분 스냅샷을 성공으로 표시하지 않는다.

## 격리 실측 (2026-09-11, Linux)

| 항목 | 결과 |
|---|---|
| `/usr/bin/bwrap` 존재 | 있음 (80424 bytes, 2026-04-29) |
| 네임스페이스 초기화 `--unshare-user-try --unshare-pid --unshare-net` + `/bin/true` | 성공 |
| 스냅샷 bind + 호스트 홈/`/etc/passwd` 숨김 | 성공. 샌드박스에서 홈 파일 읽기 차단 |
| 격리 불가 시 폴백 금지 | 성공. `forceUnavailable` 이면 명령 미실행·exit 1 |
| Windows/macOS 네이티브 격리 러너 | 당시 미검증·미지원. 아래 Mac Docker 검증도 Linux bwrap를 사용함. macOS는 2026-09-24 Seatbelt로 추가 |

## macOS Seatbelt 격리 (2026-09-24, macOS)

구현: `apps/runner/seatbelt.ts`(프로필 생성·probe), `apps/runner/sandbox.ts`의 `wrapSeatbeltCommand`, `apps/runner/execute.ts`의 macOS 자손 프로세스 취소. Linux bwrap 경로는 바꾸지 않았다.

**설계: SRT 대신 생성 프로필.** AI CLI 격리에 쓰는 `@anthropic-ai/sandbox-runtime` 0.0.77은 빌드 요구를 표현하지 못한다. 공개 `SandboxManager`는 네트워크 설정이 있으면(빈 허용 목록 포함) 항상 localhost HTTP/SOCKS 프록시를 띄우고 그 포트로의 loopback을 허용하며, 프로필에 키체인 데몬(`com.apple.securityd.xpc`, `com.apple.SecurityServer`) mach-lookup을 항상 허용하고, `TMPDIR=/tmp/claude`와 `bash -c` 문자열 실행을 강제한다. 프로필 생성기 자체는 공개 export가 아니다. 그래서 러너는 명령마다 SBPL 프로필을 생성해 `/usr/bin/sandbox-exec -p <profile> <실행 파일> <인수…>`를 셸 없이 argv로 실행한다. 프로세스·mach·IOKit·장치 기본 허용은 SRT macOS 프로필을 따르되 키체인 데몬은 뺐다. 경로에 `"`·`\`·개행이 있으면 이스케이프하지 않고 실패한다.

| 구분 | 규칙 |
|---|---|
| 기본 | `(deny default)`. 네트워크 규칙이 없으므로 TCP/UDP 연결·bind와 unix socket 연결(ssh-agent, Docker 등)이 모두 차단된다 |
| 읽기 차단 | `/Users`(사용자 홈 포함), `/Volumes`, `/private/tmp`, `/private/var/folders`, `os.tmpdir()`, `/Library/Keychains`, `APPOPS_DATA_DIR` |
| 읽기 재허용 | 스냅샷, 출력, bwrap과 같은 규칙으로 검증한 도구 루트(`JAVA_HOME`, `GODOT_TEMPLATES_SOURCE` 등), 실행 파일 디렉터리와 `.app` 번들, per-run HOME/TMPDIR. 차단 루트와 같거나 그 조상인 경로는 재허용하지 않는다. 재허용 경로의 조상 디렉터리는 `stat`(메타데이터)만 허용 |
| 재차단 | 재허용 뒤 홈의 모든 dotfile 트리(`~/.ssh`, `~/.aws`, `~/.gradle` 등, 정규식 `^<home>/\.`), `~/Library/Keychains`, `~/Library/Cookies`, `~/Library/Containers`, `~/Library/Group Containers`, `/Library/Keychains` |
| 예외 | 실행 파일 자체(literal)는 dotfile 트리 아래라도 읽을 수 있다(`/opt/homebrew/bin/godot` → `~/.local/bin` 래퍼 같은 경우) |
| 쓰기 허용 | 스냅샷, 출력, per-run `<output>/.appops-task-cache/sandbox/{home,tmp}`, `/dev/null` 등 표준 장치와 `/dev/fd` |
| mach | 키체인 데몬을 제외한 SRT 목록만 허용. 다른 앱 실행(`lsopen`, Apple Events)과 샌드박스 밖 프로세스 조회·신호 불가 |
| 환경 | bwrap과 같은 `FORBIDDEN_ENV`/`SECRET_ENV` 규칙을 공유하는 `allowedEnvEntries` 사용. 러너 프로세스 환경은 상속하지 않고 `PATH=/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`, `LANG`, 허용된 plan env만 전달. `HOME`/`TMPDIR`는 plan env보다 우선해 per-run 디렉터리를 가리킨다 |
| 취소 | 기존 프로세스 그룹 SIGTERM→SIGKILL에 더해, 취소 시점의 자손 pid를 `ps`로 모아 같은 신호를 보낸다 |

**probe.** `probeIsolation()`은 darwin에서 `/usr/bin/sandbox-exec` 존재를 확인하고 실제 생성 프로필로 `/usr/bin/true`(exit 0이어야 함)와 홈 아래 임시 비밀 파일(`~/.appops-isolation-probe-*`)의 `/bin/cat`(실패하고 내용이 없어야 함)을 실행한 뒤에만 `available: true`를 보고한다. 임시 파일은 즉시 지운다.

### 실측 기록 (2026-09-24, macOS 26.3 arm64, Node 24.18.0)

`probeIsolation()` 출력:

```
{ available: true, backend: 'seatbelt', executable: '/usr/bin/sandbox-exec', version: 'sandbox-exec (Seatbelt), macOS 26.3' }
```

`node --import tsx --test tests/mac-isolation.test.ts tests/runner.test.ts tests/engines.test.ts` → `ℹ tests 39 / ℹ pass 39 / ℹ fail 0 / ℹ skipped 0`. `tests/runner.test.ts`의 프로세스 테스트(취소·출력 제한·호스트 파일 은닉 등)는 이제 macOS에서 주입 launcher가 아니라 실제 Seatbelt 경로로 실행된다. `npx tsc --noEmit -p tsconfig.json | grep -E 'apps/runner|tests/mac-isolation'` 출력 없음.

`tests/mac-isolation.test.ts`가 샌드박스 안에서 관측한 값:

| 검사 | 관측 |
|---|---|
| 읽기 | `{"home":"DENIED:EPERM","homeListing":"DENIED:EPERM","ssh":"DENIED:EPERM","keychains":"DENIED:EPERM","data":"DENIED:EPERM","sibling":"DENIED:EPERM","snapshot":"READ:14"}` |
| 홈 아래 앱 데이터 배치 | `APPOPS_DATA_DIR=~/appops-mac-iso-appdata-*`, 스냅샷·출력이 그 하위일 때 `{"cwd":"<data>/snapshots/run-1","data":"DENIED:EPERM","siblings":"DENIED:EPERM"}`, 결과물 기록·인정 |
| 네트워크 | `{"remote":"DENIED:EPERM","loopback":"DENIED:EPERM","bind":"DENIED:EPERM"}` (1.1.1.1:443, 테스트 프로세스의 127.0.0.1 리스너, 127.0.0.1 bind). 리스너 accept 0회 |
| 쓰기 | `{"output":"WROTE","snapshot":"WROTE","sibling":"DENIED:EPERM","home":"DENIED:EPERM","privateTmp":"DENIED:EPERM","runHome":"WROTE","runTmp":"WROTE"}`. 차단된 경로는 호스트에 생성되지 않음 |
| 환경 | 호스트에 주입한 `GITHUB_TOKEN`, `AWS_ACCESS_KEY_ID`, `APPOPS_BEARER`, `SSH_AUTH_SOCK`, `NPM_PASSWORD`, `GOOGLE_APPLICATION_CREDENTIALS`와 그 값이 없음. `USER` 없음. `HOME`·`os.homedir()`·`os.tmpdir()`가 `<output>/.appops-task-cache/sandbox/{home,tmp}` |
| 취소 | node → `/bin/sleep`, `/bin/sh -c 'sleep & wait'`의 손자, `detached: true`(setsid) `/bin/sleep` 5개 pid가 취소 후 모두 종료. 자손 수집을 끈 상태로 재현하면 setsid 자식 1개(`actual: [ 1564 ]`)가 살아남아 실패함을 확인한 뒤 원복 |
| 실제 Godot | `/Applications/Godot_mono.app/Contents/MacOS/Godot` `4.7.2.stable.mono.official.ed1daf0bf`. `--headless --version` exit 0, `--headless --path <snapshot> --import` exit 0이고 `.godot/`가 스냅샷 안에 생성, 씬 실행이 `AppOps seatbelt Godot OK <output>/.appops-task-cache/sandbox/home` 출력 |
| Godot `--export-pack` | macOS 프리셋, `XDG_DATA_HOME=<output>/.appops-task-cache/xdg-data`, `GODOT_TEMPLATES_SOURCE=~/Library/Application Support/Godot`(`export_templates/4.7.2.stable.mono/macos.zip` 존재) → exit 0, `game.pck` 1,736 bytes가 기대 결과물로 인정됨. 템플릿이 없으면 이 하위 단계만 이유와 함께 skip |
| dotfile 래퍼 실행 | `/opt/homebrew/bin/godot`(→ `~/.local/bin/godot-mono-wrapper`, zsh) `--headless --version` exit 0 |

### 남은 제한

- Windows 네이티브 격리는 지원하지 않는다.
- iOS/macOS 코드 서명·공증·Xcode(`xcodebuild`)는 이 작업 범위 밖이다. Xcode는 키체인·`~/Library/Developer`·추가 mach 서비스를 요구하므로 현재 프로필로는 동작을 보장하지 않는다.
- Gradle 데몬 등 loopback TCP나 unix socket이 필요한 도구는 네트워크 전면 차단 때문에 실패할 수 있다(`--no-daemon` 경로 포함 macOS에서 미검증). Unity/Unreal의 Seatbelt 호환성도 미검증이다.
- Godot 전체 `--export-release`(.app/.zip 번들)는 실측하지 않았다. 실제 plan의 `APPOPS_GODOT_DATA_DIR`는 계속 홈 밖 경로를 요구한다(위 실측의 템플릿 경로는 테스트가 명령을 직접 구성해 사용한 것).
- 읽기 정책은 "기본 허용 + 민감 영역 차단"이다. `/etc`, `/opt/homebrew`, `/Applications`, `/Library`(키체인 제외) 같은 홈 밖 시스템 경로는 읽을 수 있다. bwrap처럼 필요한 경로만 보이는 구조는 아니다.
- `sandbox-exec`는 Apple이 deprecated로 표시한 도구다. probe가 매 프로세스 첫 사용 시 실제 동작을 검증하므로 향후 macOS에서 동작하지 않으면 사용 불가로 보고되고 빌드는 실행되지 않는다(fail closed).
- 취소 시 자손 수집은 부모 pid 기준이므로, 취소 전에 이미 이중 fork로 launchd에 입양된 프로세스는 찾지 못한다.

## 실제 Godot Linux 전체 내보내기 실측 (2026-09-11, Linux) — 통과

공식 Godot 4.3-stable Linux 편집기와 **공식 내보내기 템플릿 전체**를 전용 `/tmp/appops-godot-verification-20260911/`에 내려받아(전역 설치·사용자 프로필·비밀 없음) 실제 파이프라인 `inspect → createSnapshot(excludedRoots) → createBuildPlan → isolated executeBuild`를 끝까지 실행했다.

도구/버전/해시:

| 항목 | 값 |
|---|---|
| 편집기 | `Godot_v4.3-stable_linux.x86_64`, `4.3.stable.official.77dcf97d8` |
| 편집기 sha256 | `6e100966e49c69a2d4c163673f606eec1bafe54b4c6170eec5a6a2ee50756ddd` |
| 템플릿 | 공식 `Godot_v4.3-stable_export_templates.tpz` (1,073,228,327 bytes), `version.txt=4.3.stable` |
| `linux_release.x86_64` 템플릿 sha256 | `815e684e29581339daefab779b8c2b36d081fba58e4db8a2b66cdaeefcb80bbc` |
| `APPOPS_GODOT_DATA_DIR` 레이아웃 | `<dir>/export_templates/4.3.stable/linux_release.x86_64` |

실행 명령(러너가 bwrap로 감싼 실제 argv):

```
--headless --path <snapshot> --export-release Linux <output>/AppOps Verify
env: XDG_DATA_HOME=<output>/.appops-task-cache/xdg-data  GODOT_TEMPLATES_SOURCE=<APPOPS_GODOT_DATA_DIR>
```

결과:

- **snapshot excludedRoots**: 원본 아래 둔 `.appdata/controller.json`(가짜 bearer)이 스냅샷에 복사되지 않음(`controller.json in snapshot: false`). 스냅샷 3파일·1002바이트.
- **내보내기**: bwrap 샌드박스(HOME=`/tmp/appops-home`, `--unshare-net`) 안에서 Godot 4.3이 프로젝트를 임포트·팩하고 `exitCode 0`으로 성공. 산출물:
  - 실행 파일 `AppOps Verify` 66,074,584 bytes (embed_pck=false이므로 실행 파일은 템플릿과 동일, sha256 `815e684e…`).
  - **신선한 `AppOps Verify.pck`** 1,648 bytes (프로젝트 콘텐츠; 매 실행 새로 생성). 이 sidecar가 실제 빌드 산출물이다.
- **per-run 캐시 격리**: `XDG_DATA_HOME/godot/export_templates`가 검증된 데이터 디렉터리로 read-only 심볼릭 링크되고, 캐시는 출력 하위 `.appops-task-cache`에만 생성됨(결과물로 집계되지 않음).
- **내보낸 결과물 실행**: 같은 bwrap 샌드박스에서 `AppOps Verify --headless --quit` 실행 → `exitCode 0`, 게임의 `_ready()`가 `AppOps headless export OK` 출력 후 정상 종료. 즉 산출물이 실제로 구동됨을 확인.

이 실측으로 드러난 러너/엔진 수정(회귀 테스트 추가):

- **PCK 출처 보증**: Linux/Windows 비임베드 내보내기에서 실행 파일은 템플릿과 바이트 동일하므로, 신선한 콘텐츠인 `<name>.pck`를 `expectedArtifacts`에 함께 넣도록 `createBuildPlan`을 고쳤다. 프리셋 `binary_format/embed_pck=true`이면 sidecar가 없으므로 넣지 않는다. 이전에는 팩이 실패해도 템플릿 복사본 실행 파일만으로 성공 처리될 수 있었다. (`parseGodotPresets`의 `embedPck` 파싱 + `tests/engines.test.ts` 회귀 테스트)

보존: 검증용 도구/프로젝트/출력은 root 컨트롤러 스모크를 위해 `/tmp/appops-godot-verification-20260911/`에 **삭제하지 않고 보존**했다(편집기 `downloads/`, 템플릿 `godot-data/`, 최소 프로젝트 `project/`, 스냅샷 `snapshot/`, 산출물 `output/`, 드라이버 `verify.mjs`/`launch.mjs`).

## Mac Docker Linux Godot 실측 (2026-09-22)

**macOS arm64 제어 서비스 → 인증 HTTP `127.0.0.1:4320` → Docker Linux arm64 러너 → bwrap Godot 4.3 export → Mac 결과물 회수**를 실제 파일·프로세스로 검증했다. 실행 ID는 `08ccec33-4f13-4218-9be7-486a380dcc64`, 결과는 `succeeded`다. 이 경로에서 생성한 실행 파일의 대상은 Linux arm64다.

| 회수 결과물 | 크기 | SHA-256 |
|---|---:|---|
| `Controller Verify` | 59,761,504 bytes | `1cb22de64c05d29ae9c24e92899b88fb63818c24ec077338a2666de19f5e2cf3` |
| `Controller Verify.pck` | 1,840 bytes | `b4b105d8661967b6394e34fec8965f4bb5f42bfff15767a6aa62ae6ae70eb55b` |

회수한 동일 결과물의 검증용 복사본을 Linux 컨테이너의 bwrap 안에서 실행했다. 복사본 소유권만 root로 조정하고 바이트와 실행 비트를 보존했으며, Godot `4.3.stable.official.77dcf97d8`이 `AppOps controller build OK`를 출력하고 exit 0으로 종료했다. 이는 생성한 Linux 게임의 실행 근거이며 Mac 네이티브 실행을 의미하지 않는다.

실제 Compose 환경에서 호스트 공개 포트 `127.0.0.1:4320`, 인증 없는 `/health`의 401, 인증된 `/health`의 200 및 bwrap `ready:true`, 연결 코드 파일 0600과 로그 미출력도 확인했다. 컨테이너 내부만 `0.0.0.0`을 리슨하며, `init`·검토된 capability 4개·제한 seccomp·systempaths 설정으로 기존 Linux bwrap를 실행한다. 준비·페어링·새 컨텍스트를 사용하는 재빌드 명령은 [원격 러너 문서](runner-protocol.md#docker-linux-러너-준비와-연결)에 있다.

근거는 로컬 실측 로그 [Mac→Docker 빌드·회수](../tmp/cross-platform-linux-20260922/mac-to-docker-godot.log), [회수 게임의 Linux 실행](../tmp/cross-platform-linux-20260922/mac-docker-game-execution.log)다. `tmp/`는 Git에서 제외되므로 위 실행 ID·크기·해시를 이 문서에도 기록했다. 재현 스크립트는 `scripts/verify-remote-godot.ts`이며 외부 러너 URL·연결 코드 파일 경로를 받아 실행할 수 있다.

이 전용 이미지는 공식 고정 해시의 Godot 4.3 Linux 편집기와 해당 아키텍처의 Linux 템플릿을 준비한다. JDK17·git·SSH 클라이언트도 포함하지만 Android SDK·Unity·Unreal·Xcode는 포함하지 않는다. 현재 Mac Docker 실측은 arm64이며 Mac x86_64 또는 별도 Linux 호스트의 Docker 구성까지 실제 실행을 확인한 것으로 확대하지 않는다. Linux 네이티브 bwrap의 기존 실측은 유지한다.

## 후속 실측이 필요한 환경

Godot 나머지 타깃(Android/iOS/Windows/macOS)과 Unity·Unreal·네이티브 Android(JDK+SDK)·Xcode의 실제 결과물 산출은 여전히 미검증이다. Android 키스토어 등록·별도 서명·JAR 형식 AAB의 실제 서명 검사는 [빌드 키 관리](build-credentials.md)처럼 구현·검증했다. 설치 가능한 Android 앱·APK SDK 도구, iOS 서명·프로파일(macOS 전용), Unity/Unreal 라이선스 환경은 아직 미검증이다. Godot Linux 경로는 위 실측으로 완료로 이동한다.

2026-09-11 Linux 제어 서비스 E2E는 소스 등록부터 스냅샷·격리 빌드·산출물 증명·이력까지 통과했다. 실행 ID `365f75c7-71c0-4a29-9550-0de33c8cd1bc`, 실행 파일 66,074,584 bytes와 PCK 1,840 bytes. [당시 결과 기록](verification-assets/godot-controller-20260911.json)과 [검증 명령](verification.md)을 참고한다. Mac→Docker의 최신 결과는 위 2026-09-22 실측에 기록했다.

## v3 원격 러너와 데모 검증

[원격 러너 프로토콜](runner-protocol.md)의 Bearer 페어링, 검증된 소스 전송, 서버에서 빌드 계획 생성, 결과물 해시 확인을 구현했다. 실제 Linux Godot 원격 빌드(`scripts/verify-remote-godot.ts`)와 생성 게임의 headless 실행을 확인했다. 실행 파일 66,074,584 bytes와 PCK 1,840 bytes를 같은 폴더로 회수했다. 로컬 호스트와 연결된 원격 실행 경계를 통과한 검사이며 다른 OS의 격리 지원 증거는 아니다.

출시 폼은 프로젝트에서 탐지한 대상만 제공한다. iOS에서 준비 완료된 Mac 러너를 선택하면 로컬 Mac 필요 오류만 제외하고 소스 검수 오류는 그대로 검사한다. macOS 로컬 러너는 Seatbelt probe가 통과하면 ready가 된다. Windows 내장 격리는 미지원이므로 별도의 검증된 launcher 없이는 ready가 되지 않는다.

데모는 Godot·Unity·Unreal·Android·iOS 빌드와 업로드를 모두 큐·이력에서 재현한다. 이 결과물은 명시적인 합성 자료이며 게임 실행 파일이나 스토어 제출용 패키지가 아니다.
