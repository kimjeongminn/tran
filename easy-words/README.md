# 쉬운 말

발달장애인이 들은 말을 쉬운 한국어로 이해하도록 돕는 모바일 우선 웹앱입니다.

**음성 입력 → 한국어 음성 인식 → 쉬운 말 AI 변환 → 정보 카드 → 음성 읽기** 흐름을 구현했습니다. 실제 AI 사용에는 OpenAI API 키가 필요합니다. API 키가 없을 때 가짜 변환 결과를 보여주지 않습니다.

## 실행

Node.js 22 이상과 pnpm을 준비합니다.

```sh
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Windows에서는 `.env.example`을 복사하여 `.env.local`이라는 이름으로 저장해도 됩니다. `.env.local`에 `OPENAI_API_KEY`를 넣고 http://localhost:3000 을 엽니다.

```sh
pnpm test
pnpm typecheck
pnpm build
```

## GitHub에 올리기

이 폴더가 저장소의 루트가 되도록 파일을 올립니다. `.env.example`, `pnpm-lock.yaml`, `firebase/`도 포함합니다. `node_modules`, `.next`, `.env.local`은 올리지 않습니다. `.gitignore`에 제외 규칙이 있습니다.

## Firebase Realtime Database 설정

1. Firebase 콘솔에서 프로젝트와 **Realtime Database**를 만들고 잠금 모드로 시작합니다. Firestore가 아닙니다.
2. 데이터 탭에서 `firebase/seed.json`을 가져옵니다. **새 빈 데이터베이스에서만** 가져오세요. 기존 데이터베이스라면 루트를 덮어쓰지 말고 `/public/app` 노드만 직접 추가합니다.
3. 규칙 탭에 `firebase/database.rules.json` 내용을 붙여넣고 게시합니다. 기존 데이터베이스라면 기존 규칙과 검토하여 병합합니다.
4. 데이터베이스 URL을 `.env.local` 또는 Vercel의 `FIREBASE_DATABASE_URL`에 입력합니다. 예: `https://YOUR-PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app`.

공개 설정 노드만 누구나 읽을 수 있고, 웹앱의 쓰기는 전부 차단합니다. 수정은 Firebase 콘솔의 권한 있는 운영자만 합니다. 공개 노드에 개인 정보나 API 키를 넣지 마세요.

```json
{"public":{"app":{"v":1,"enabled":true}}}
```

필요할 때만 `notice`에 160자 이하 공지 문구를 추가합니다. `enabled: false`로 임시 중단할 수 있습니다. 캐시 때문에 반영까지 약 5분 이상 걸릴 수 있습니다. 즉시 AI 접근 차단이 필요하면 Vercel 측에서 조치하세요. Firebase 주소를 설정했는데 읽기에 실패하면 서비스를 일시 중단하도록 했습니다. 주소를 비워두면 기본 설정으로 작동합니다.

## 저장 용량 최소화

| 정보 | 저장 위치 | Firebase 누적 |
|---|---|---|
| 소스 코드·화면·스타일 | GitHub / Vercel | 없음 |
| 마이크 음성 | 브라우저 음성 인식 서비스에서 처리; 앱 파일 저장 없음 | 없음 |
| 원문·AI 결과 | 현재 페이지 메모리 | 없음 |
| 글씨 크기·읽는 속도·자동 읽기 | 사용자 기기 localStorage | 없음 |
| 앱 공통 설정 | RTDB `/public/app` | 기본 JSON 22바이트 |

22바이트는 `{"v":1,"enabled":true}`의 UTF-8 payload 크기입니다. 전체 seed JSON은 41바이트입니다. 서비스의 메타데이터·키 경로·프로토콜·과금량과 같다는 뜻은 아닙니다. 대화 횟수와 관계없이 앱의 RTDB 데이터는 늘어나지 않습니다.

서버는 `/public/app.json`만 단발 GET으로 읽고 Next.js 캐시에 300초 보관합니다. 데이터베이스 루트 읽기, 실시간 리스너, 사용자 계정, 접속 로그, 사용량 카운터, 대화 기록, 임베딩, 음성/Base64 저장은 없습니다. 캐시는 배포·리전·캐시 갱신 등에 영향을 받으므로 프로젝트 전체에서 정확히 5분에 한 번만 읽는다는 보장은 없습니다. 저장 용량과 다운로드 트래픽은 다른 항목입니다.

## Vercel 배포

1. Vercel에서 **Add New → Project**로 GitHub 저장소를 가져옵니다.
2. Framework Preset은 **Next.js**, Root Directory는 이 `package.json`이 있는 폴더로 선택합니다.
3. Node.js 22 이상을 선택합니다. 설치 명령은 `pnpm install --frozen-lockfile`, 빌드 명령은 `pnpm build`입니다.
4. 환경변수를 설정합니다.

| 변수 | 값 |
|---|---|
| `OPENAI_API_KEY` | OpenAI API 키. 서버 전용이며 필수 |
| `OPENAI_MODEL` | 기본 `gpt-4.1-mini`. 계정에서 사용 가능한 Structured Outputs 지원 모델로 변경 가능 |
| `FIREBASE_DATABASE_URL` | 위에서 만든 Realtime Database 주소. 선택 |

5. Deploy를 누릅니다. 환경변수를 변경한 뒤에는 다시 배포합니다.
6. 배포 주소를 휴대폰에서 열고 마이크 권한을 허용합니다. 음성 입력과 읽어주기를 실기기에서 확인합니다.

API 키에 `NEXT_PUBLIC_` 접두사를 붙이지 마세요. Firebase SDK, Firebase API 키, 서비스 계정 키는 이 읽기 전용 구성에 필요하지 않습니다.

## 공개 서비스 운영

회원가입 없는 공개 API입니다. 입력은 2,000자, 요청 본문은 16,000바이트, AI 요청은 45초로 제한했습니다. 동일 출처 확인은 브라우저의 잘못된 요청을 줄일 뿐 봇 접근을 막지 못합니다. 이 앱에는 분산 요청 횟수 제한을 구현하지 않았습니다. 공개 운영 전 Vercel Firewall에서 `/api/simplify` POST 요청 제한을 설정하고 OpenAI 프로젝트 예산·사용량 알림을 설정하세요. 서버 메모리만으로 제한하면 Vercel 인스턴스 사이에서 공유되지 않으므로 신뢰할 수 있는 제한으로 제시하지 않았습니다. RTDB에는 제한용 카운터도 쌓지 않습니다.

## 화면과 접근성

- 홈, 듣는 중, 변환 중, 결과, 오류, 설정 화면
- 18px 기본 본문, 큰 결과 문장, 큰 터치 영역과 키보드 포커스
- 0.75배/1배 음성 속도, 자동 읽기, 더 큰 결과 글씨
- 들은 말 보기·수정, 직접 글 입력, 읽기 중지, 변환 취소
- 빈 정보 카드는 숨김, 불명확한 결과의 행동 안내는 제거
- 원문·결과는 새로고침 또는 처음으로 이동 시 사라짐

음성 인식은 브라우저의 Web Speech API에 의존하며 HTTPS 또는 localhost에서 사용합니다. 지원 여부는 기기·브라우저에 따라 다르고, 미지원 시 글 입력을 제공합니다. 마지막 인식 후 5초, 처음 침묵 12초, 최대 60초에 중지합니다. 브라우저 자체 동작으로 더 일찍 끝날 수도 있습니다. 잡음 크기를 직접 측정하지 않으므로 소음 오류를 단정하지 않습니다. 한국어 읽기 음성과 자동 재생은 기기 설정·브라우저 정책에 따라 달라집니다.

AI는 숫자·조건 보존과 불명확한 정보의 추측 금지를 지시받지만 의미 보존이나 STT 정확도를 보장하지 않습니다. 특히 약·금액·날짜는 상대방에게 확인하도록 화면에 안내합니다. 실제 사용자·보호자와의 사용성 평가 및 음성 실기기 검증이 필요합니다.

## 개인 정보 처리

앱은 음성 파일을 녹음 저장하지 않습니다. 음성은 브라우저의 음성 인식 제공업체에 전송될 수 있습니다. 인식된 텍스트는 Vercel 서버를 거쳐 OpenAI로 전송되며, Responses API에 `store:false`를 설정합니다. 이는 공급자의 모든 보존 정책을 없애거나 Zero Data Retention을 보장하는 설정이 아닙니다. 앱 코드에 원문·결과 로그나 분석 도구는 없습니다. Vercel 및 각 공급자의 운영 로그·보존 정책은 별도로 검토해야 합니다.

## 파일 구조

```text
src/app/page.tsx                 서버 공통 설정 로드
src/app/api/simplify/route.ts     비밀 키를 보호하는 AI 호출
src/components/easy-words-app.tsx 화면 상태와 전체 흐름
src/components/result-cards.tsx  쉬운 말·행동·중요 정보 카드
src/components/settings.tsx      기기 설정
src/hooks/use-speech-input.ts    한국어 STT 수명주기
src/lib/prompt.ts                의미 보존 규칙
src/lib/result.ts                JSON 검증과 불확실성 처리
src/lib/config.ts                최소 RTDB 읽기와 캐시
firebase/                       초기 데이터와 보안 규칙
tests/                          결과 안전 처리 테스트
```

## 참고 문서

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Firebase REST API](https://firebase.google.com/docs/reference/rest/database)
- [Next.js 설치](https://nextjs.org/docs/app/getting-started/installation)

GitHub 업로드, 실제 Firebase 프로젝트 생성 및 Vercel 배포는 이 폴더를 전달하는 것과 별개입니다. 사용자 계정이나 배포 주소는 코드에 포함되어 있지 않습니다.
