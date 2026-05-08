from pydantic import BaseModel

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
        thumbnail_url=thumbnail_list
    )
    
def normalize_tmdb_movie(movie: dict) -> ContentItem:
    """TMDB Movie 객체 → ContentItem"""
    poster_path = movie.get("poster_path")
    # 포스터가 있으면 전체 주소를 리스트에 넣고, 없으면 빈 리스트를 반환합니다.
    thumbnail_list = [f"https://image.tmdb.org/t/p/w500{poster_path}"] if poster_path else []

    return ContentItem(
        domain="movie",
        title=movie.get("title", ""),
        description=movie.get("overview", ""),
        genre=[],  # 장르 매핑은 추후 구현
        creator="Director",  # 검색 결과엔 감독이 없으므로 기본값 설정
        keywords=[],
        thumbnail_url=thumbnail_list
    )

def normalize_aladin_book(book: dict) -> ContentItem:
    """알라딘 Book 객체 → ContentItem"""
    cover_url = book.get("cover")
    # 커버 이미지가 있으면 리스트에 담습니다.
    thumbnail_list = [cover_url] if cover_url else []
    
    return ContentItem(
        domain="book",
        title=book.get("title", ""),
        description=book.get("description", ""),
        genre=book.get("categoryName", "").split(">"),
        creator=book.get("author", ""),
        keywords=[],
        thumbnail_url=thumbnail_list
    )
