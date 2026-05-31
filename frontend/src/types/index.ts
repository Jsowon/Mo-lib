// Domain
export type Domain = "movie" | "music" | "book";

// User
export interface User {
  id: string;
  email: string;
  nickname: string;
}

// Map (지도 / 여정)
export interface LastNode {
  id: string;
  title: string;
  domain: Domain;
  image_url: string | null;
  node_count?: number;
  last_node?: {
    id: string;
    title: string;
    image_url?: string;
  };
}

export interface Map {
  id: string;
  title: string;
  updated_at: string;
  last_node: LastNode | null;
}

// Node (콘텐츠 노드)
export interface Node {
  id: string;
  map_id: string;
  domain: Domain;
  external_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  emotion_tags: string[];
  is_root: boolean;
  is_archived: boolean;
  step_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Edge (노드 간 연결)
export interface Edge {
  id: string;
  map_id: string;
  source_node_id: string;
  target_node_id: string;
  reason: string | null;
}

// Recommendation (AI 추천 요청 / 응답)
export interface RecommendationRequest {
  content_id: string;
  title: string;
  domain: Domain;
  metadata?: Record<string, unknown>;
  history?: unknown[];
  exclude_domains?: string[];
}

export interface AIRecommendationItem {
  title: string;
  reason: string;
  tags: string[];
  connection_keyword: string;
}

export interface RecommendationResponse {
  recommendations: {
    [domain: string]: AIRecommendationItem[];
  };
  map_title?: string | null;
}

// Content Search (검색 결과)
export interface SearchContentItem {
  domain: string;
  title: string;
  description: string;
  genre: string[];
  creator: string;
  keywords: string[];
  thumbnail_url: string[];
}

export interface SearchResponse {
  results: SearchContentItem[];
  total: number;
  error?: string | null;
}

// 기존 ContentItem 유지 (SearchResultScreen에서 사용 중)
export interface ContentItemMetadata {
  // 영화
  director?: string;
  original_title?: string;
  rating?: number;
  genres?: string[];
  // 책
  author?: string;
  publisher?: string;
  // 음악
  artist?: string;
  album?: string;
}

export interface ContentItem {
  external_id: string;
  domain: Domain;
  title: string;
  description: string | null;
  image_url: string | null;
  year: number | null;
  country: string | null;
  metadata: ContentItemMetadata;
}

// Node creation request (백엔드 NodeSaveRequest 명세에 맞춤)
export interface CreateNodeRequest {
  title: string;
  domain: Domain;
  step_order: number;
  external_id?: string | null;
  description?: string | null;
  image_url?: string | null;
  emotion_tags?: string[];
  is_root?: boolean;
  metadata?: Record<string, unknown>;
}

// Edge creation request
export interface EdgeSaveRequest {
  source_node_id: string;
  target_node_id: string;
  reason?: string | null;
}
