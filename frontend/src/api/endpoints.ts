import { apiClient, searchClient } from './client';
import {
  Map,
  Node,
  Edge,
  RecommendationRequest,
  RecommendationResponse,
  SearchResponse,
  CreateNodeRequest,
  EdgeSaveRequest,
} from '../types';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { email: string; password: string; nickname: string }) =>
    apiClient.post<{ access_token: string; token_type: string }>('/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<{ access_token: string; token_type: string }>('/auth/login', data),

  me: () =>
    apiClient.get<{ id: string; email: string; nickname: string }>('/auth/me'),

  logout: () =>
    apiClient.post<{ message: string }>('/auth/logout'),
};

// ── Maps ──────────────────────────────────────────────────────────────────────
export const mapsAPI = {
  getList: async () => {
    const res = await apiClient.get<Map[]>('/maps');
    return { ...res, data: { maps: res.data } };
  },

  create: (data: { title?: string }) => apiClient.post<Map>('/maps', data),

  getDetail: (mapId: string) =>
    apiClient.get<{ id: string; title: string; nodes: Node[]; edges: Edge[] }>(`/maps/${mapId}`),

  updateTitle: (mapId: string, title: string) =>
    apiClient.patch<Map>(`/maps/${mapId}`, { title }),

  delete: (mapId: string) =>
    apiClient.delete(`/maps/${mapId}`),
};

// ── Nodes ─────────────────────────────────────────────────────────────────────
export const nodesAPI = {
  add: (mapId: string, data: CreateNodeRequest) =>
    apiClient.post<Node>(`/maps/${mapId}/nodes`, data),

  toggleArchive: (mapId: string, nodeId: string, is_archived: boolean) =>
    apiClient.patch<{ id: string; is_archived: boolean }>(
      `/maps/${mapId}/nodes/${nodeId}`,
      { is_archived }
    ),
};

// ── Edges ─────────────────────────────────────────────────────────────────────
export const edgesAPI = {
  save: (mapId: string, data: EdgeSaveRequest) =>
    apiClient.post<Edge>(`/maps/${mapId}/edges`, data),
};

// ── Recommendation ────────────────────────────────────────────────────────────
export const recommendationAPI = {
  get: (data: RecommendationRequest) =>
    apiClient.post<RecommendationResponse>('/recommendations', data),
};

// ── Archive ───────────────────────────────────────────────────────────────────
export const archiveAPI = {
  getList: (params?: { map_id?: string; domain?: string; page?: number; size?: number }) =>
    apiClient.get<{ nodes: Node[]; total: number }>('/archive', { params }),
};

// ── Content Search ────────────────────────────────────────────────────────────
export const searchAPI = {
  movie: (q: string, limit: number = 10) =>
    searchClient.get<SearchResponse>('/search/movie', { params: { q, limit } }),

  music: (q: string, limit: number = 10) =>
    searchClient.get<SearchResponse>('/search/music', { params: { q, limit } }),

  book: (q: string, limit: number = 10) =>
    searchClient.get<SearchResponse>('/search/book', { params: { q, limit } }),
};
