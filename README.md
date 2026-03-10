# Saramin Job Manager MVP

사람인 공고를 **반자동(수동 트리거)**으로 수집하고, 사용자가 승인/거절/보류/마감 상태를 관리하며, 승인된 기업의 분석 페이지로 진입할 수 있는 Next.js + Supabase 기반 MVP입니다.

## 1) 전체 아키텍처

- Frontend: Next.js 16 App Router + TypeScript
- UI: Tailwind CSS(v4) + shadcn 스타일 컴포넌트(`src/components/ui/*`)
- Auth/DB: Supabase(Auth + Postgres)
- Server Layer: Next Server Actions + Supabase Admin Client(service role)
- Collection: Adapter 인터페이스 + Mock Saramin Provider
- 구조: 단일 레포 모놀리식 웹앱

흐름:
1. 사용자가 로그인
2. 필터 프리셋 생성/기본 설정
3. `공고 업데이트` 버튼 수동 실행
4. Mock adapter 수집 → 중복 제거 → 신규 저장 → 만료 처리
5. 상태 탭에서 공고 관리(approved/rejected/hold/expired)
6. 승인 공고에서만 기업 분석 페이지 진입

## 2) 화면 구조

- `/auth/signup`: 회원가입(이메일 인증 메일 발송 구조)
- `/auth/login`: 이메일/비밀번호 로그인 + Google OAuth + Kakao/Naver 확장 슬롯
- `/dashboard`
  - 상단: 선택 프리셋 요약 + 공고 업데이트 버튼 + 상태 탭
  - 중단: 필터 프리셋 관리(저장, 기본 지정, 접기/펼치기)
  - 본문: 공고 카드 목록 + 상태 변경 버튼
- `/companies/[companyId]/analysis`
  - 탭: 분석 개요 / 점수 / 섹션 / 외부 링크 / 비교 확장
- `/compare`
  - 비교 세트 데이터 구조 확인용 스캐폴딩 화면

## 3) 핵심 사용자 흐름

1. 회원가입
   - 이메일/비밀번호 입력 → 인증 메일 수신 → 인증 후 로그인
2. 로그인
   - 실패 횟수 누적, 제한 횟수 초과 시 잠금
3. 프리셋 설정
   - 검색어/직무/지역/경력/학력을 프리셋으로 저장
4. 수동 업데이트
   - 버튼 클릭 시 저장된 프리셋으로 mock 수집 실행
   - 신규/중복/만료 처리 결과 표시
5. 상태 관리
   - 카드에서 승인/거절/보류/활성 상태 전환
   - 상태 탭으로 보관함 조회
6. 기업 분석
   - 승인된 공고에서만 진입
   - 분석 레코드/점수/섹션 저장
   - 비교 세트에 추가

## 4) DB 스키마

마이그레이션 파일: `supabase/migrations/20260310_init.sql`

포함 테이블:
- `users`
- `oauth_accounts`
- `filter_presets`
- `jobs`
- `external_company_links`
- `job_state_logs` (decisions 역할)
- `companies`
- `company_analysis_templates`
- `company_analysis_records`
- `analysis_scores`
- `analysis_sections`
- `update_runs`
- `company_comparison_sets` (비교 확장)
- `company_comparison_items` (비교 확장)

중복 제약:
- `(user_id, source_url)` unique (partial)
- `(user_id, source_job_id)` unique (partial)
- `(user_id, dedupe_hash)` unique

## 5) 주요 API / Server Action 설계

Server Actions:
- `src/app/actions/auth.ts`
  - `signUpAction`, `signInAction`, `startGoogleOAuthAction`, `signOutAction`
- `src/app/actions/dashboard.ts`
  - `createPresetAction`, `setDefaultPresetAction`, `togglePresetCollapsedAction`
  - `updateJobsAction`, `changeJobStatusAction`
- `src/app/actions/analysis.ts`
  - `updateAnalysisMetaAction`, `upsertAnalysisScoreAction`, `upsertAnalysisSectionAction`
  - `addToComparisonSetAction`

Route:
- `src/app/auth/callback/route.ts` (OAuth callback + 계정 동기화)

## 6) 업데이트 버튼 동작 로직

`updateJobsAction` 로직:
1. 선택 프리셋 로드
2. `update_runs`에 running 레코드 생성
3. mock adapter(`mockSaraminAdapter`) 수집
4. 기존 공고 키셋 로드 후 중복 판정
   - `source_url`
   - `source_job_id`
   - `title + company_name + deadline` 해시
5. 신규만 저장
6. 마감일 지난 공고 `expired` 처리
7. `update_runs` 완료/실패 결과 저장
8. 화면에 신규/중복/만료 요약 표시

## 7) 회사명 정규화 및 외부 링크 매칭

- 정규화: `src/lib/services/company-normalizer.ts`
  - `(주)`, `주식회사`, `inc`, `ltd` 등 노이즈 제거
  - 공백/특수문자 제거 후 소문자 canonical key 생성
- 링크 매칭: `src/lib/services/company-link-matcher.ts`
  - 현재 mock 맵 기반(`jobplanet`, `blind`)
  - 추후 합법적 API/데이터 소스로 교체 가능

## 8) 기업 분석 확장 구조

- 템플릿: `company_analysis_templates`
  - 탭 순서, 섹션 스키마(JSON)
- 레코드: `company_analysis_records`
  - 회사별 분석 문서 메타
- 점수: `analysis_scores`
  - metric 단위 점수/가중치 저장
- 섹션: `analysis_sections`
  - 섹션 키 단위 내용 저장
- 비교 확장: `company_comparison_sets`, `company_comparison_items`
  - 비교 대상 구성 저장
  - 실제 비교 알고리즘/리포트는 2차 구현

## 9) 초기 MVP 개발 우선순위

구현 완료 기준으로 반영됨:
1. 로그인, 필터 프리셋, 공고 목록, 상태 변경, 보관함
2. 업데이트 버튼 + 중복 제거 + 만료 처리 + 결과 요약
3. 외부 링크 구조 + 회사명 정규화 구조
4. 기업 분석 상세 페이지 스캐폴딩
5. 비교 기능 스캐폴딩

## 10) 실제 실행 가능한 코드 / 로컬 실행

## 사전 준비

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/20260310_init.sql` 실행
3. 필요 시 `supabase/seed.sql` 실행 후:
   - `select public.seed_user_mvp_data('<YOUR_AUTH_USER_UUID>');`

## 환경변수

`.env.example`를 복사해 `.env.local` 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH_LOGIN_MAX_ATTEMPTS=5
AUTH_LOGIN_LOCK_MINUTES=15
```

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run lint
npm run build
```

빌드/린트 통과 상태입니다.

## 배포

Vercel 또는 Netlify에 배포 가능.
- Build command: `npm run build`
- Publish: Next.js 런타임(플랫폼 기본 감지)
- Environment variables: `.env.local`과 동일 키 등록

## 컴플라이언스/수집 정책

- MVP는 mock provider 기반 반자동 수집 구조를 사용
- 무단 크롤링을 전제로 하지 않음
- 실제 연동은 약관/법적 검토 후 adapter 교체 방식으로 확장
