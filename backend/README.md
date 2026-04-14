# Mo:lib

콘텐츠 과몰입 크로스 도메인 큐레이션 서비스. 영화 · 음악 · 도서를 감성·테마 축으로 연결하고 몰입 지도(노드 그래프)로 시각화한다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| 백엔드 | FastAPI (Python 3.11) |
| DB | PostgreSQL 16 |
| ORM / 마이그레이션 | SQLAlchemy + Alembic |
| 인증 | JWT + bcrypt |
| 컨테이너 | Docker + Docker Compose |
| 배포 | AWS EC2 |
| AI | GPT-4o mini |

## 외부 API

- 영화: TMDB
- 음악: Spotify
- 도서: 알라딘

## 최초 세팅

```bash
# 1. 레포 클론 후 .env 생성
cp .env.example .env

# 2. JWT 시크릿 생성 후 .env에 붙여넣기
openssl rand -hex 32

# 3. Docker 빌드 및 실행
docker compose up --build

# 4. 헬스체크
curl http://localhost:8000/health
```

- API 서버: http://localhost:8000
- Swagger 문서: http://localhost:8000/docs

## Docker 사용법

```bash
# 최초 빌드 또는 requirements/Dockerfile 변경 후
docker compose up --build

# 일반 실행
docker compose up

# 백그라운드 실행
docker compose up -d

# 종료
docker compose down

# 컨테이너 + DB 볼륨까지 전체 삭제 (주의: DB 데이터 사라짐)
docker compose down -v

# 로그 실시간 확인
docker compose logs -f api

# 컨테이너 안에서 명령 실행
docker compose exec api <명령>
```

### Docker 주의점

- **모든 파이썬 도구는 컨테이너 안에서 실행한다.** `ruff`, `alembic`, `pip-audit`, `python` 전부 `docker compose exec api <명령>` 형태.
- 로컬 PC에 `pip install` 하지 않는다. 컨테이너가 전부 처리한다.
- `requirements.txt` 수정 후에는 반드시 `--build` 플래그로 재빌드. 그냥 `docker compose up`만으로는 새 패키지가 반영되지 않는다.
- `.py` 파일 수정은 바인드 마운트 덕에 즉시 반영되고 uvicorn이 자동 reload 한다. 재빌드 불필요.
- `docker compose down -v`는 DB 볼륨까지 삭제한다. 실수로 치면 지금까지의 DB 데이터가 전부 날아간다.
- Docker Desktop이 꺼져 있으면 `Cannot connect to the Docker daemon` 에러가 난다. 트레이 아이콘 확인.

## Alembic 마이그레이션

```bash
# 새 마이그레이션 자동 생성
docker compose exec api alembic revision --autogenerate -m "설명"

# 최신 상태로 적용
docker compose exec api alembic upgrade head

# 한 단계 롤백
docker compose exec api alembic downgrade -1

# 현재 리비전 확인
docker compose exec api alembic current

# 히스토리 확인
docker compose exec api alembic history
```

### 마이그레이션 주의점

- **새 모델 파일 추가 시 `alembic/env.py`의 `import app.models` 부분에 반드시 import 추가할 것.** 누락 시 `--autogenerate`가 변경을 감지하지 못한다.
- **자동 생성된 마이그레이션 파일(`alembic/versions/*.py`)을 항상 검토한 후 커밋한다.** autogenerate가 완벽하지 않아서 때때로 의도하지 않은 drop/rename을 만든다.
- 마이그레이션 파일은 반드시 git에 커밋한다. 팀원이 pull 받을 때 같은 스키마로 맞춰진다.
- `downgrade`는 로컬 테스트용으로만 사용한다. 프로덕션에서는 금지.
- `alembic.ini`는 프로젝트 루트에 있다. `alembic/` 폴더 안이 아니라 바깥. 의도된 구조이니 옮기지 말 것.

## CI 전 로컬 체크리스트

PR 올리기 전 반드시 실행:

```bash
# 1. 포맷팅 자동 적용
docker compose exec api ruff format .

# 2. 린트 자동 수정
docker compose exec api ruff check . --fix

# 3. 린트 최종 확인
docker compose exec api ruff check .

# 4. import smoke test
docker compose exec api python -c "import app.main; print('OK')"

# 5. 보안 취약점 검사
docker compose exec api pip-audit -r requirements.txt \
  --ignore-vuln GHSA-jr27-m4p2-rc6r \
  --ignore-vuln GHSA-2c2j-9gv5-cj73 \
  --ignore-vuln GHSA-7f5h-v6xp-fcq8
```

무시 목록 사유는 `SECURITY_NOTES.md` 참조.

## .env 주의점

- **절대 커밋 금지.** `.gitignore`에 등록되어 있다.
- 새 환경변수 추가 시 `.env.example`에도 함께 추가한다.
- `.env`는 개발자마다 다른 값이어도 된다. `.env.example`이 공식 템플릿.
- JWT 시크릿은 `openssl rand -hex 32`로 생성한 64자 hex 문자열을 쓴다.

## GitHub Secrets (CI용)

GitHub 저장소 → Settings → Secrets and variables → Actions 에서 등록:

| Secret 이름 | 설명 |
|---|---|
| `CI_JWT_SECRET_KEY` | CI 전용 JWT 키 |
| `CI_TMDB_API_KEY` | CI 전용 TMDB 키 |
| `CI_SPOTIFY_CLIENT_ID` | CI 전용 Spotify ID |
| `CI_SPOTIFY_CLIENT_SECRET` | CI 전용 Spotify Secret |
| `CI_ALADIN_TTB_KEY` | CI 전용 알라딘 키 |

## 문서

- 개발 규칙: [CONVENTIONS.md](CONVENTIONS.md)
- 보안 무시 목록: [SECURITY_NOTES.md](SECURITY_NOTES.md)