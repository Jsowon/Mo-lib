// Domain
export type Domain = 'movie' | 'music' | 'book';

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

// Recommendation (AI 추천 결과 아이템)
export interface RecommendationItem {
  external_id: string | null;
  domain: Domain;
  title: string;
  description: string | null;
  image_url: string | null;
  emotion_tags: string[];
  reason: string;
  metadata: Record<string, unknown>;
}

export interface RecommendationResponse {
  cached: boolean;
  recommendations: RecommendationItem[];
}
