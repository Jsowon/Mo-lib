import { create } from "zustand";
import { Node, Domain, Map as MapItem } from "../types";
import { archiveAPI, mapsAPI } from "../api/endpoints";

const PAGE_SIZE = 20;

interface ArchiveState {
  // 필터 상태 (파트B가 store에서 읽어 타임라인 갱신)
  selectedMapId: string | null;
  selectedDomain: Domain | null;

  // 지도 목록 (지도별 필터 pill용)
  maps: MapItem[];
  mapsLoading: boolean;

  // 아카이브 노드 데이터
  nodes: Node[];
  total: number;
  page: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  fetchError: boolean;

  // Actions
  fetchMaps: () => Promise<void>;
  fetchArchive: () => Promise<void>; // 필터 초기화 + 1페이지 재조회
  fetchMore: () => Promise<void>;    // 다음 페이지 추가 로드
  setMapFilter: (mapId: string | null) => void;
  setDomainFilter: (domain: Domain | null) => void;
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  selectedMapId: null,
  selectedDomain: null,

  maps: [],
  mapsLoading: false,

  nodes: [],
  total: 0,
  page: 1,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  fetchError: false,

  fetchMaps: async () => {
    set({ mapsLoading: true });
    try {
      const res = await mapsAPI.getList();
      set({ maps: res.data.maps });
    } catch {
      // 필터 pill에 지도 목록이 안 보일 뿐 — silent fail
    } finally {
      set({ mapsLoading: false });
    }
  },

  fetchArchive: async () => {
    const { selectedMapId, selectedDomain } = get();
    set({ isLoading: true, fetchError: false, nodes: [], page: 1 });
    try {
      const res = await archiveAPI.getList({
        map_id: selectedMapId ?? undefined,
        domain: selectedDomain ?? undefined,
        page: 1,
        size: PAGE_SIZE,
      });
      set({
        nodes: res.data.nodes,
        total: res.data.total,
        hasMore: res.data.nodes.length < res.data.total,
        page: 1,
      });
    } catch {
      set({ fetchError: true });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMore: async () => {
    const { isLoadingMore, hasMore, nodes, page, selectedMapId, selectedDomain } = get();
    if (isLoadingMore || !hasMore) return;

    const nextPage = page + 1;
    set({ isLoadingMore: true });
    try {
      const res = await archiveAPI.getList({
        map_id: selectedMapId ?? undefined,
        domain: selectedDomain ?? undefined,
        page: nextPage,
        size: PAGE_SIZE,
      });
      const merged = [...nodes, ...res.data.nodes];
      set({
        nodes: merged,
        page: nextPage,
        hasMore: merged.length < res.data.total,
      });
    } catch {
      // 페이지네이션 실패 — silent fail, 기존 목록 유지
    } finally {
      set({ isLoadingMore: false });
    }
  },

  // 필터 변경 시 자동으로 1페이지부터 재조회
  setMapFilter: (mapId) => {
    set({ selectedMapId: mapId });
    get().fetchArchive();
  },

  setDomainFilter: (domain) => {
    set({ selectedDomain: domain });
    get().fetchArchive();
  },
}));
