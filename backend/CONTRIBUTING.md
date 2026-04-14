# 개발 규칙

## 브랜치 전략
main ─────────────────────────── 배포용 (항상 안정적)
└── develop ─────────────────── 개발 통합 (여기서 테스트)
├── feature/infra ──────── 연우: Docker/CI/인증
├── feature/db ─────────── 연우: DB 스키마
├── feature/recommend ─── 정민: 추천/AI
├── feature/map ────────── 정민: 지도 CRUD
├── feature/spotify ────── 민서: Spotify
├── feature/aladin ─────── 민서: 알라딘
├── feature/tmdb ───────── 소원: TMDB
└── feature/archive ────── 소원,민서: 아카이브

### 규칙

1. **main에 직접 푸시 금지.** 항상 develop을 거쳐서 합친다.
2. 새 기능 시작할 때 develop에서 브랜치를 딴다.
```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/기능이름
```
3. 기능 완성하면 develop으로 PR 올린다.
4. PR은 다른 팀원 1명 이상이 리뷰 후 머지한다.
5. develop에서 충분히 테스트되면 마일스톤 단위로 main에 머지한다.

### 브랜치 이름 규칙

- `feature/기능명` — 새 기능 (예: feature/jwt-auth)
- `fix/버그명` — 버그 수정 (예: fix/cache-ttl-error)
- `hotfix/긴급수정` — main에서 긴급 수정
- `chore/작업명` — 설정/인프라 변경

### 커밋 메시지 규칙
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 추가
chore: 설정, 빌드 등 기타

예시: `feat: Spotify 트랙 검색 API 연동`, `fix: 캐시 TTL 오류 수정`

## 코딩 컨벤션

### 네이밍

- 변수/함수: `snake_case` (예: `user_name`, `get_recommendation`)
- 클래스: `PascalCase` (예: `RecommendationService`, `UserSchema`)
- 상수: `UPPER_SNAKE_CASE` (예: `MAX_CACHE_TTL`)

### 도구

- **포맷터 + 린터 + import 정렬**: Ruff (하나로 통합)
- Black, isort, flake8 사용 안 함

### VS Code 설정

VS Code 확장 설치: `Ruff`, `Python`, `Docker`
저장 시 Ruff가 자동으로 포맷팅 + import 정렬 수행.

### CI 자동 검사

PR 올리면 GitHub Actions가 자동으로 실행:
- ruff check (린트)
- ruff format --check (포맷)
- pip-audit (보안 취약점)
- gitleaks (시크릿 누출)
- docker build (이미지 빌드)

**PR 올리기 전에 로컬에서 반드시 먼저 실행:**
```bash
docker compose exec api ruff format .
docker compose exec api ruff check . --fix
docker compose exec api pip-audit -r requirements.txt \
  --ignore-vuln GHSA-jr27-m4p2-rc6r \
  --ignore-vuln GHSA-2c2j-9gv5-cj73 \
  --ignore-vuln GHSA-7f5h-v6xp-fcq8
```

## PR 규칙

### PR 제목

커밋 메시지 형식과 동일. 예: `feat: Spotify 트랙 검색 API 연동`

### PR 체크리스트

레포의 `.github/pull_request_template.md`가 자동으로 채워진다. 모든 항목 확인 후 제출.

### PR 크기

- 가능하면 500줄 이하로 유지
- 한 PR에 여러 기능 섞지 않기
- 리팩토링과 기능 추가 분리

### 머지 조건

1. CI 전체 통과 (그린 빌드)
2. 최소 1명 Approve
3. 리뷰 코멘트 모두 반영
4. develop과 충돌 없음

## .env 파일

- **절대 커밋 금지.** `.gitignore`에 등록됨
- 새 환경변수 추가 시 `.env.example`에도 같이 추가
- JWT 시크릿 생성: `openssl rand -hex 32`

## 의존성 / DB 변경

```bash
# 의존성 추가: requirements.txt에 버전 고정으로 추가 후
docker compose up --build

# DB 스키마 변경: 모델 수정 후
docker compose exec api alembic revision --autogenerate -m "설명"
docker compose exec api alembic upgrade head
```

마이그레이션 파일도 반드시 커밋한다. 취약점 발견 시 `SECURITY_NOTES.md`에 사유 기록.
