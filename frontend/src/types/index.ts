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
  map_title?: string;  // 백엔드 응답에 포함 시 사용 가능 (optional)
}

// LocalNode (Node를 확장한 로컬 UI 상태 타입)
export interface LocalNode extends Node {
  nodeStatus?: 'confirmed' | 'pending';   // 로컬 UI 상태
  reason?: string | null;                  // pending 노드용 연결 이유
  x?: number;                              // 레이아웃 좌표
  y?: number;
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
  metadata: Record<string, unknown>; // 백엔드 required 필드
  history?: unknown[];
  exclude_domains?: string[];
  exclude_titles?: string[];
}

export interface AIRecommendationItem {
  title: string;
  reason: string;
  tags: string[];
  connection_keyword: string;
  image_url?: string | null;
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
  image_url?: string | null;  // 백엔드 신규 필드
  external_id: string | null;  // 백엔드가 항상 내려주는 필드 (optional 제거)
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
