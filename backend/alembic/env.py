import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

# ⚠️ 중요: 새 모델 파일 추가 시 반드시 여기에 import 추가할 것
# 누락 시 alembic revision --autogenerate 가 변경을 감지하지 못함
# 예시:
# import app.models.user    # noqa: F401
# import app.models.content # noqa: F401
import app.models  # noqa: F401
from alembic import context

# Mo:lib: 앱 모델 메타데이터 연결
from app.database import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DATABASE_URL 환경변수 주입 — 없으면 즉시 명확한 오류 발생
db_url = os.environ.get("DATABASE_URL")
if not db_url:
    raise RuntimeError(
        "환경변수 DATABASE_URL이 설정되지 않았습니다.\n"
        ".env 파일을 확인하거나 'cp .env.example .env' 후 값을 채워주세요."
    )
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
