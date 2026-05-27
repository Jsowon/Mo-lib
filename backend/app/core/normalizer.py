import re

from pydantic import BaseModel

# TMDB genre_id → 장르명 (영화)
_TMDB_GENRE_MAP: dict[int, str] = {
    28: "액션",
    12: "어드벤처",
    16: "애니메이션",
    35: "코미디",
    80: "범죄",
    99: "다큐멘터리",
    18: "드라마",
    10751: "가족",
    14: "판타지",
    36: "역사",
    27: "공포",
    10402: "음악",
    9648: "미스터리",
    10749: "로맨스",
    878: "SF",
    10770: "TV영화",
    53: "스릴러",
    10752: "전쟁",
    37: "서부",
}


class ContentItem(BaseModel):
    domain: str
    title: str
    description: str
    genre: list[str]
    creator: str
    keywords: list[str]
    thumbnail_url: list[str] = []


def normalize_spotify_track(item: dict) -> ContentItem:
    """Spotify Search API track 객체 → ContentItem.

    genre: Spotify track 검색 응답에 장르가 없으므로 빈 리스트.
           장르가 필요하면 Artist API를 별도 호출해 genres 필드를 전달할 것.
    """
    artists = [a["name"] for a in item.get("artists", [])]

    images = item.get("album", {}).get("images", [])
    thumbnail_list = [img["url"] for img in images] if images else []
    return ContentItem(
        domain="music",
        title=item.get("name", ""),
        description="",
        genre=item.get("genres", []),
        creator=", ".join(artists),
        keywords=[],
        thumbnail_url=thumbnail_list,
    )


def normalize_aladin_book(item: dict) -> ContentItem:
    """알라딘 ItemSearch API item 객체 → ContentItem.

    author 예: "김영하 (지은이), 이명랑 (옮긴이)" → "(역할)" 부분 제거 후 사용.
    categoryName 예: "소설>한국소설" → ">" 기준 분리.
    """
    raw_author = item.get("author", "")
    creator = re.sub(r"\s*\([^)]*\)", "", raw_author).strip().rstrip(",").strip()

    raw_category = item.get("categoryName", "")
    genre = (
        [g.strip() for g in raw_category.split(">") if g.strip()]
        if raw_category
        else []
    )

    return ContentItem(
        domain="book",
        title=item.get("title", ""),
        description=item.get("description", ""),
        genre=genre,
        creator=creator,
        keywords=[],
    )


def normalize_tmdb_movie(item: dict) -> ContentItem:
    """TMDB Search Movie API result 객체 → ContentItem.

    genre: genre_ids를 장르명으로 변환. 알 수 없는 id는 제외.
    creator: 감독 정보는 별도 Credits API 호출이 필요하므로 빈 문자열.
    """
    genre_ids: list[int] = item.get("genre_ids", [])
    genre = [_TMDB_GENRE_MAP[gid] for gid in genre_ids if gid in _TMDB_GENRE_MAP]

    return ContentItem(
        domain="film",
        title=item.get("title", ""),
        description=item.get("overview", ""),
        genre=genre,
        creator="",
        keywords=[],
    )
