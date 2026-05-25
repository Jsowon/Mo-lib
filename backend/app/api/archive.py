import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.node import Node

router = APIRouter(prefix="/archive", tags=["archive"])


class ArchiveNodeResponse(BaseModel):
    id: str
    map_id: str
    domain: str
    external_id: Optional[str]
    title: str
    description: Optional[str]
    image_url: Optional[str]
    emotion_tags: Optional[list[str]]
    is_root: bool
    step_order: int
    is_archived: bool

    class Config:
        from_attributes = True


@router.get(
    "",
    response_model=list[ArchiveNodeResponse],
    summary="아카이브 목록 조회",
    description="아카이브에 저장된 노드 목록을 반환합니다. step_order 오름차순 정렬.",
)
async def get_archive(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Node).where(Node.is_archived == True).order_by(Node.step_order)  # noqa: E712
    )
    nodes = result.scalars().all()

    return [
        ArchiveNodeResponse(
            id=str(n.id),
            map_id=str(n.map_id),
            domain=n.domain,
            external_id=n.external_id,
            title=n.title,
            description=n.description,
            image_url=n.image_url,
            emotion_tags=n.emotion_tags,
            is_root=n.is_root,
            step_order=n.step_order,
            is_archived=n.is_archived,
        )
        for n in nodes
    ]


@router.delete(
    "/{node_id}",
    status_code=204,
    summary="아카이브에서 제거",
    description="노드를 아카이브에서 제거합니다 (is_archived=False). 노드 자체는 삭제되지 않습니다.",
)
async def remove_from_archive(node_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.id == uuid.UUID(node_id)))
    node = result.scalar_one_or_none()

    if not node:
        raise NotFoundException("노드를 찾을 수 없습니다.")

    node.is_archived = False
    await db.commit()


@router.post(
    "/{node_id}",
    response_model=ArchiveNodeResponse,
    summary="아카이브에 추가",
    description="노드를 아카이브에 추가합니다 (is_archived=True).",
)
async def add_to_archive(node_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Node).where(Node.id == uuid.UUID(node_id)))
    node = result.scalar_one_or_none()

    if not node:
        raise NotFoundException("노드를 찾을 수 없습니다.")

    node.is_archived = True
    await db.commit()
    await db.refresh(node)

    return ArchiveNodeResponse(
        id=str(node.id),
        map_id=str(node.map_id),
        domain=node.domain,
        external_id=node.external_id,
        title=node.title,
        description=node.description,
        image_url=node.image_url,
        emotion_tags=node.emotion_tags,
        is_root=node.is_root,
        step_order=node.step_order,
        is_archived=node.is_archived,
    )
