import { apiClient } from './client';
import {
  Map,
  Node,
  Edge,
  RecommendationResponse,
} from '../types';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { email: string; password: string; nickname: string }) =>
    apiClient.post<{ message: string; user_id: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ access_token: string; token_type: string; nickname: string }>('/auth/login', data),

  logout: () =>
    apiClient.post<{ message: string }>('/auth/logout'),
};

// ── Maps ──────────────────────────────────────────────────────────────────────
export const mapsAPI = {
  getList: () =>
    apiClient.get<{ maps: Map[] }>('/maps'),

  create: (data: { title?: string }) =>
    apiClient.post<Map>('/maps', data),

  getDetail: (mapId: string) =>
    apiClient.get<{ id: string; title: string; nodes: Node[]; edges: Edge[] }>(`/maps/${mapId}`),

  updateTitle: (mapId: string, title: string) =>
    apiClient.patch<Map>(`/maps/${mapId}`, { title }),

  delete: (mapId: string) =>
    apiClient.delete(`/maps/${mapId}`),
};

// ── Nodes ─────────────────────────────────────────────────────────────────────
export const nodesAPI = {
  add: (mapId: string, data: {
    source_node_id: string | null;
    domain: string;
    external_id: string | null;
    title: string;
    description: string | null;
    image_url: string | null;
    emotion_tags: string[];
    metadata: Record<string, unknown>;
  }) =>
    apiClient.post<Node>(`/maps/${mapId}/nodes`, data),

  toggleArchive: (mapId: string, nodeId: string, is_archived: boolean) =>
    apiClient.patch<{ id: string; is_archived: boolean }>(
      `/maps/${mapId}/nodes/${nodeId}`,
      { is_archived }
    ),
};

// ── Recommendation ────────────────────────────────────────────────────────────
export const recommendationAPI = {
  get: (data: { node_id: string; title: string; domain: string }) =>
    apiClient.post<RecommendationResponse>('/recommendation', data),
};

// ── Archive ───────────────────────────────────────────────────────────────────
export const archiveAPI = {
  getList: (params?: { map_id?: string; domain?: string; page?: number; size?: number }) =>
    apiClient.get<{ nodes: Node[]; total: number }>('/archive', { params }),
};

// ── Content Search ────────────────────────────────────────────────────────────
export const contentAPI = {
  search: (params: { domain: string; q: string; page?: number; size?: number }) =>
    apiClient.get('/content/search', { params }),
};
