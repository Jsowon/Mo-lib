# 보안 노트

## pip-audit 무시 목록

CI와 로컬 검사에서 `--ignore-vuln`으로 제외된 CVE. 새 취약점 추가 시 이 문서에 사유를 먼저 기록한 후 CI에 반영한다.

### GHSA-jr27-m4p2-rc6r (pyasn1)

- **체인:** `python-jose` → `rsa` → `pyasn1`
- **원인:** `python-jose==3.4.0`이 구버전 pyasn1을 강제함 (upstream 제약, Mo:lib에서 해결 불가)
- **취약점:** JWT 검증 시 BER 디코딩 CPU 소모 DoS
- **Mo:lib 영향:** 낮음. 자체 서버가 발급한 JWT만 검증하며, 외부 임의 ASN.1 데이터를 파싱하는 경로 없음
- **재평가:** M2 인증 작업 시 `PyJWT` 마이그레이션 검토

### GHSA-2c2j-9gv5-cj73 (starlette)

- **체인:** `fastapi` → `starlette`
- **원인:** FastAPI 0.115.x가 취약점 수정 전 starlette을 의존성으로 가짐
- **취약점:** multipart 파싱 DoS
- **Mo:lib 영향:** 해당 없음. Mo:lib는 multipart 사용 안 함 (파일 업로드 기능 없음, 프론트는 JSON만 전송)
- **재평가:** FastAPI 상위 버전 안정화 시 업데이트 검토

### GHSA-7f5h-v6xp-fcq8 (starlette)

- **체인:** `fastapi` → `starlette`
- **원인:** 위와 동일
- **취약점:** 요청 처리 관련 DoS
- **Mo:lib 영향:** 낮음. 캡스톤 데모 환경으로 외부 공격 노출 없음
- **재평가:** 위와 동일

### PYSEC-2026-161 (starlette)

- **체인:** `fastapi` → `starlette`
- **원인:** starlette 0.46.2에 보안 취약점, 수정 버전 1.0.1은 FastAPI 0.115.x와 호환 불가
- **Mo:lib 영향:** 낮음. 캡스톤 데모 환경으로 외부 공격 노출 없음
- **재평가:** FastAPI 메이저 업데이트 시 함께 업그레이드 검토

### GHSA-58qw-9mgm-455v (pip)

- **패키지:** pip 24.x (Docker 기본 이미지 내장)
- **취약점:** pip 패키지 설치 시 악의적 wheel 파일 처리 관련
- **수정 버전:** 없음 (no fix available)
- **Mo:lib 영향:** 없음. 컨테이너 빌드 시에만 사용되는 빌드 도구이며, 런타임 API 서버에 영향 없음. 캡스톤 환경에서 외부 패키지 설치 경로 없음
- **재평가:** M5 배포 전 pip 업스트림 수정 여부 재확인

## 검토 규칙

1. 새 취약점 발견 시 무조건 무시하지 말고 **영향 평가 먼저**
2. 무시 결정 시 반드시 이 문서에 사유 기록
3. M5(배포) 직전에 전체 항목 재검토
4. 실서비스 전환 시 전부 다시 평가

## 사용 위치

무시 플래그는 다음 두 곳에 동일하게 적용:

- `.github/workflows/ci.yml` (CI 자동 검사)
- 로컬 체크리스트 (README.md 참조)

한쪽만 수정하면 로컬/CI 불일치가 발생하니 반드시 동시 업데이트한다.
