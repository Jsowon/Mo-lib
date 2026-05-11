"""fix domain check movie to film

Revision ID: 91a4c476188c
Revises: fd6f975b3584
Create Date: 2026-05-11 01:43:02.784577

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '91a4c476188c'
down_revision: Union[str, None] = 'fd6f975b3584'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 기존 'movie' 제약 제거 후 'film'으로 교체
    op.drop_constraint('ck_nodes_domain', 'nodes', type_='check')
    op.create_check_constraint(
        'ck_nodes_domain',
        'nodes',
        "domain IN ('film', 'music', 'book')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_nodes_domain', 'nodes', type_='check')
    op.create_check_constraint(
        'ck_nodes_domain',
        'nodes',
        "domain IN ('movie', 'music', 'book')",
    )
