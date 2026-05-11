from pydantic import BaseModel


class ContentItem(BaseModel):
    domain: str
    title: str
    description: str
    genre: list[str]
    creator: str
    keywords: list[str]


def normalize_spotify_track(item: dict) -> ContentItem:
    """Spotify Search API track 객체 → ContentItem.

    genre: Spotify track 검색 응답에 장르가 없으므로 빈 리스트.
           장르가 필요하면 Artist API를 별도 호출해 genres 필드를 전달할 것.
    """
    artists = [a["name"] for a in item.get("artists", [])]
    return ContentItem(
        domain="music",
        title=item.get("name", ""),
        description="",
        genre=item.get("genres", []),
        creator=", ".join(artists),
        keywords=[],
    )
