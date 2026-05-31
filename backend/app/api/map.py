import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.edge import Edge
from app.models.map import Map
from app.models.node import Node
from app.schemas.recommendation import RecommendationRequest

router = APIRouter(prefix="/maps", tags=["map"])


# ─────────────────────────────────────────
# 요청 스키마
# ─────────────────────────────────────────


class MapCreateRequest(BaseModel):
    title: Optional[str] = None


class MapTitleUpdateRequest(BaseModel):
    title: str


class NodeSaveRequest(BaseModel):
    domain: str
    external_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    emotion_tags: Optional[list[str]] = None
    is_root: bool = False
    step_order: int
    metadata: Optional[dict] = None


class EdgeSaveRequest(BaseModel):
    source_node_id: str
    target_node_id: str
    reason: Optional[str] = None


# ─────────────────────────────────────────
# 응답 스키마
# ─────────────────────────────────────────


class NodeResponse(BaseModel):
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

    class Config:
        from_attributes = True


class EdgeResponse(BaseModel):
    id: str
    map_id: str
    source_node_id: str
    target_node_id: str
    reason: Optional[str]

    class Config:
        from_attributes = True


class MapResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MapDetailResponse(BaseModel):
    id: str
    title: str
    nodes: list[NodeResponse]
    edges: list[EdgeResponse]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────
# 지도 엔드포인트
# ─────────────────────────────────────────


@router.post(
    "",
    response_model=MapResponse,
    status_code=201,
    summary="지도 생성",
    description="새 몰입 지도를 생성합니다. title 미입력 시 오늘 날짜로 자동 설정됩니다.",  # noqa: E501
)
async def create_map(request: MapCreateRequest, db: AsyncSession = Depends(get_db)):
    map_title = request.title or (
        f"나의 탐색 {datetime.now(timezone.utc).strftime('%Y.%m.%d')}"
    )

    new_map = Map(
        title=map_title,
    )
    db.add(new_map)
    await db.commit()
    await db.refresh(new_map)

    return MapResponse(
        id=str(new_map.id),
        title=new_map.title,
        created_at=str(new_map.created_at),
        updated_at=str(new_map.updated_at),
    )


@router.get(
    "",
    response_model=list[MapResponse],
    summary="지도 목록 조회",
    description="내 지도 전체 목록을 최근 수정순으로 반환합니다.",
)
async def get_maps(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Map).order_by(Map.updated_at.desc()))
    maps = result.scalars().all()

    return [
        MapResponse(
            id=str(m.id),
            title=m.title,
            created_at=str(m.created_at),
            updated_at=str(m.updated_at),
        )
        for m in maps
    ]


@router.get(
    "/{map_id}",
    response_model=MapDetailResponse,
    summary="지도 상세 조회",
    description="특정 지도의 노드와 엣지를 포함한 전체 정보를 반환합니다.",
)
async def get_map(map_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Map).where(Map.id == uuid.UUID(map_id)))
    map_obj = result.scalar_one_or_none()

    if not map_obj:
        raise NotFoundException("지도를 찾을 수 없습니다.")

    # 노드 조회
    node_result = await db.execute(
        select(Node).where(Node.map_id == uuid.UUID(map_id)).order_by(Node.step_order)
    )
    nodes = node_result.scalars().all()

    # 엣지 조회
    edge_result = await db.execute(select(Edge).where(Edge.map_id == uuid.UUID(map_id)))
    edges = edge_result.scalars().all()

    return MapDetailResponse(
        id=str(map_obj.id),
        title=map_obj.title,
        nodes=[
            NodeResponse(
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
            )
            for n in nodes
        ],
        edges=[
            EdgeResponse(
                id=str(e.id),
                map_id=str(e.map_id),
                source_node_id=str(e.source_node_id),
                target_node_id=str(e.target_node_id),
                reason=e.reason,
            )
            for e in edges
        ],
        created_at=str(map_obj.created_at),
        updated_at=str(map_obj.updated_at),
    )


@router.patch(
    "/{map_id}",
    response_model=MapResponse,
    summary="지도 제목 수정",
)
async def update_map_title(
    map_id: str, request: MapTitleUpdateRequest, db: AsyncSession = Depends(get_db)
):
    """지도 이름 수정"""
    result = await db.execute(select(Map).where(Map.id == uuid.UUID(map_id)))
    map_obj = result.scalar_one_or_none()

    if not map_obj:
        raise NotFoundException("지도를 찾을 수 없습니다.")

    map_obj.title = request.title
    map_obj.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(map_obj)

    return MapResponse(
        id=str(map_obj.id),
        title=map_obj.title,
        created_at=str(map_obj.created_at),
        updated_at=str(map_obj.updated_at),
    )


@router.post(
    "/{map_id}/continue",
    summary="지도 이어서 탐색",
    description="기존 지도의 마지막 노드를 기준으로 새로운 추천을 요청합니다.",
)
async def continue_map(
    map_id: str, request: RecommendationRequest, db: AsyncSession = Depends(get_db)
):
    """기존 지도 이어서 탐색 - 마지막 노드 기준으로 추천 요청"""
    # 지도 존재 확인
    result = await db.execute(select(Map).where(Map.id == uuid.UUID(map_id)))
    map_obj = result.scalar_one_or_none()

    if not map_obj:
        raise NotFoundException("지도를 찾을 수 없습니다.")

    # 마지막 노드 조회
    node_result = await db.execute(
        select(Node)
        .where(Node.map_id == uuid.UUID(map_id))
        .order_by(Node.step_order.desc())
        .limit(1)
    )
    last_node = node_result.scalar_one_or_none()

    # history 구성
    from app.schemas.ai_interface import AIRecommendationRequest
    from app.services.ai_service import build_ai_history, get_ai_recommendation

    history = build_ai_history(last_node)

    ai_request = AIRecommendationRequest(
        domain=request.domain,
        content_id=request.content_id,
        title=request.title,
        metadata=request.metadata,
        history=history,
        exclude_domains=request.exclude_domains,
    )

    from app.schemas.recommendation import RecommendationResponse

    ai_response = await get_ai_recommendation(ai_request)

    return RecommendationResponse(
        recommendations=ai_response.recommendations, map_title=ai_response.map_title
    )


# ─────────────────────────────────────────
# 노드 / 엣지 엔드포인트
# ─────────────────────────────────────────


@router.post(
    "/{map_id}/nodes",
    response_model=NodeResponse,
    status_code=201,
    summary="노드 저장",
    description="추천 콘텐츠를 지도에 노드로 저장합니다.",
)
async def save_node(
    map_id: str, request: NodeSaveRequest, db: AsyncSession = Depends(get_db)
):
    """노드 저장 (사용자가 추천 선택 시)"""
    new_node = Node(
        map_id=uuid.UUID(map_id),
        domain=request.domain,
        external_id=request.external_id,
        title=request.title,
        description=request.description,
        image_url=request.image_url,
        emotion_tags=request.emotion_tags,
        is_root=request.is_root,
        step_order=request.step_order,
        metadata_=request.metadata,
    )
    db.add(new_node)
    await db.commit()
    await db.refresh(new_node)

    return NodeResponse(
        id=str(new_node.id),
        map_id=str(new_node.map_id),
        domain=new_node.domain,
        external_id=new_node.external_id,
        title=new_node.title,
        description=new_node.description,
        image_url=new_node.image_url,
        emotion_tags=new_node.emotion_tags,
        is_root=new_node.is_root,
        step_order=new_node.step_order,
    )


@router.post(
    "/{map_id}/edges",
    response_model=EdgeResponse,
    status_code=201,
    summary="엣지 저장",
    description="두 노드 사이의 연결(엣지)을 저장합니다.",
)
async def save_edge(
    map_id: str, request: EdgeSaveRequest, db: AsyncSession = Depends(get_db)
):
    """엣지 저장 (노드 간 연결)"""
    new_edge = Edge(
        map_id=uuid.UUID(map_id),
        source_node_id=uuid.UUID(request.source_node_id),
        target_node_id=uuid.UUID(request.target_node_id),
        reason=request.reason,
    )
    db.add(new_edge)
    await db.commit()
    await db.refresh(new_edge)

    return EdgeResponse(
        id=str(new_edge.id),
        map_id=str(new_edge.map_id),
        source_node_id=str(new_edge.source_node_id),
        target_node_id=str(new_edge.target_node_id),
        reason=new_edge.reason,
    )
