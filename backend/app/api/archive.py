import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.map import Map
from app.models.node import Node
from app.models.user import User

router = APIRouter(prefix="/archive", tags=["archive"])


class ArchiveNodeResponse(BaseModel):
    id: str
    map_id: str
    map_title: str
    domain: str
    external_id: Optional[str]
    title: str
    description: Optional[str]
    image_url: Optional[str]
    emotion_tags: Optional[list[str]]
    is_root: bool
    step_order: int
    is_archived: bool
    created_at: str

    class Config:
        from_attributes = True


class ArchiveListResponse(BaseModel):
    nodes: list[ArchiveNodeResponse]
    total: int


@router.get(
    "",
    response_model=ArchiveListResponse,
    summary="아카이브 목록 조회",
    description="아카이브에 저장된 노드 목록을 반환합니다. map_id, domain 필터 및 페이지네이션 지원.",  # noqa: E501
)
async def get_archive(
    map_id: Optional[str] = Query(None, description="지도 ID 필터"),
    domain: Optional[str] = Query(None, description="도메인 필터 (film/music/book)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = (
        select(Node, Map.title.label("map_title"))
        .join(Map, Node.map_id == Map.id)
        .where(Node.is_archived == True, Map.user_id == current_user.id)  # noqa: E712
    )

    if map_id:
        base = base.where(Node.map_id == uuid.UUID(map_id))
    if domain:
        base = base.where(Node.domain == domain)

    count_result = await db.execute(base)
    total = len(count_result.all())

    paged = base.order_by(Node.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(paged)
    rows = result.all()

    nodes = [
        ArchiveNodeResponse(
            id=str(row.Node.id),
            map_id=str(row.Node.map_id),
            map_title=row.map_title,
            domain=row.Node.domain,
            external_id=row.Node.external_id,
            title=row.Node.title,
            description=row.Node.description,
            image_url=row.Node.image_url,
            emotion_tags=row.Node.emotion_tags,
            is_root=row.Node.is_root,
            step_order=row.Node.step_order,
            is_archived=row.Node.is_archived,
            created_at=str(row.Node.created_at),
        )
        for row in rows
    ]

    return ArchiveListResponse(nodes=nodes, total=total)


@router.delete(
    "/{node_id}",
    status_code=204,
    summary="아카이브에서 제거",
    description="노드를 아카이브에서 제거합니다 (is_archived=False). 노드 자체는 삭제되지 않습니다.",  # noqa: E501
)
async def remove_from_archive(
    node_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Node)
        .join(Map, Node.map_id == Map.id)
        .where(Node.id == uuid.UUID(node_id), Map.user_id == current_user.id)
    )
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
async def add_to_archive(
    node_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Node, Map.title.label("map_title"))
        .join(Map, Node.map_id == Map.id)
        .where(Node.id == uuid.UUID(node_id), Map.user_id == current_user.id)
    )
    row = result.one_or_none()

    if not row:
        raise NotFoundException("노드를 찾을 수 없습니다.")

    node, map_title = row.Node, row.map_title
    node.is_archived = True
    await db.commit()
    await db.refresh(node)

    return ArchiveNodeResponse(
        id=str(node.id),
        map_id=str(node.map_id),
        map_title=map_title,
        domain=node.domain,
        external_id=node.external_id,
        title=node.title,
        description=node.description,
        image_url=node.image_url,
        emotion_tags=node.emotion_tags,
        is_root=node.is_root,
        step_order=node.step_order,
        is_archived=node.is_archived,
        created_at=str(node.created_at),
    )
