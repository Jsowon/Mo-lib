from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func

from app.core.deps import get_current_user
from app.database import get_db
from app.models.map import Map
from app.models.node import Node
from app.models.user import User
from app.schemas.user import UserStatsResponse

router = APIRouter(prefix="/users", tags=["users"])


def _monday_of_this_week() -> datetime:
    """현재 주의 월요일 00:00:00 (UTC) 반환."""
    now = datetime.now(timezone.utc)
    monday = now.replace(hour=0, minute=0, second=0, microsecond=0)
    monday -= timedelta(days=now.weekday())
    return monday


@router.get(
    "/me/stats",
    response_model=UserStatsResponse,
    summary="내 홈 통계 조회",
)
def get_my_stats(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """홈 화면에 표시할 사용자 통계를 반환합니다."""
    user_map_ids = db.query(Map.id).filter(Map.user_id == current_user.id).subquery()

    total_archived = (
        db.query(func.count(Node.id))
        .filter(Node.map_id.in_(user_map_ids), Node.is_archived.is_(True))
        .scalar()
    )

    total_maps = (
        db.query(func.count(Map.id)).filter(Map.user_id == current_user.id).scalar()
    )

    monday = _monday_of_this_week()
    weekly_nodes = (
        db.query(func.count(Node.id))
        .filter(Node.map_id.in_(user_map_ids), Node.created_at >= monday)
        .scalar()
    )

    return UserStatsResponse(
        total_archived=total_archived,
        total_maps=total_maps,
        weekly_nodes=weekly_nodes,
    )
