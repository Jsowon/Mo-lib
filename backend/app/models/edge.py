import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Edge(Base):
    __tablename__ = "edges"
    __table_args__ = (
        UniqueConstraint(
            "source_node_id",
            "target_node_id",
            name="uq_edges_source_target",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    map_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("maps.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_utcnow
    )

    # relationships
    map: Mapped["Map"] = relationship(back_populates="edges")  # noqa: F821
    source_node: Mapped["Node"] = relationship(  # noqa: F821
        foreign_keys=[source_node_id], back_populates="edges_as_source"
    )
    target_node: Mapped["Node"] = relationship(  # noqa: F821
        foreign_keys=[target_node_id], back_populates="edges_as_target"
    )
