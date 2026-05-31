from pydantic import BaseModel, Field


class UserStatsResponse(BaseModel):
    total_archived: int = Field(description="총 아카이빙된 노드 수")
    total_maps: int = Field(description="과몰입 지도 수")
    weekly_nodes: int = Field(description="이번 주 생성된 노드 수")
