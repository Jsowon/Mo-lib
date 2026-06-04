import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useDerivedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import EdgeLine from '../components/graph/EdgeLine';
import NodeCircle from '../components/graph/NodeCircle';
import NodeDetailSheet from '../components/common/NodeDetailSheet';
import { calculateAllNodePositions, Edge as LayoutEdge } from '../utils/layoutUtils';
import ErrorBoundary from '../components/ErrorBoundary';
import { Node, LocalNode, Edge, Domain, AIRecommendationItem, Map } from '../types';
import { RootTabParamList } from '../navigation/types';
import { recommendationAPI, nodesAPI, edgesAPI, mapsAPI } from '../api/endpoints';
import { useMapPendingStore } from '../store/mapPendingStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 캔버스 크기 상수 (Android 4096px 한도 고려)
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

// 우주 뷰 - 맵 클러스터 배치 상수
const CANVAS_CX = CANVAS_WIDTH / 2;   // 1000
const CANVAS_CY = CANVAS_HEIGHT / 2;  // 1000

// 황금각(137.5°) 기반 나선 배치 → 정렬 없이 자연스럽게 흩어진 느낌
const GOLDEN_ANGLE = 2.39996; // 2π / φ²

// 우주 그라디언트 색상 팔레트 - Pan 방향별 무드
const GRADIENT_PALETTES = {
  CENTER: ['#0A0914', '#0F0E19', '#13111F'], // 기본 — 깊은 우주
  LEFT:   ['#0F0E19', '#1C1A2E', '#3D3475'], // 왼쪽 — 심연
  RIGHT:  ['#13111F', '#3D3475', '#7B6FD4'], // 오른쪽 — 성운 빛
  UP:     ['#0A0914', '#0D0B1E', '#1C1A2E'], // 위 — 우주 먼지
  DOWN:   ['#1C1A2E', '#3D3475', '#C97BAF'], // 아래 — 핑크 성운
};

function getClusterCenter(index: number, total: number): { x: number; y: number } {
  if (total <= 1) return { x: CANVAS_CX, y: CANVAS_CY };
  const radius = 220 + 160 * Math.sqrt(index + 1); // index 커질수록 더 멀리
  const angle = index * GOLDEN_ANGLE;
  return {
    x: CANVAS_CX + radius * Math.cos(angle),
    y: CANVAS_CY + radius * Math.sin(angle),
  };
}

// 네비게이션 타입
type MapRouteProp = RouteProp<RootTabParamList, 'Map'>;

function MapCanvasContent() {
  const route = useRoute<MapRouteProp>();
  const { setIsPendingMode: setGlobalPendingMode, registerClearHandler } = useMapPendingStore();

  // API 데이터 상태
  const [mapList, setMapList] = useState<Map[]>([]);
  const [allMapsData, setAllMapsData] = useState<Record<string, { nodes: Node[]; edges: Edge[] }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // State
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<LocalNode | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  // 추천 관련 상태
  const [pendingNodes, setPendingNodes] = useState<LocalNode[]>([]); // 임시 추천 노드 목록
  const [pendingEdges, setPendingEdges] = useState<LayoutEdge[]>([]); // 임시 엣지 목록
  const [isRecommending, setIsRecommending] = useState(false); // 추천 API 호출 중
  const [sourceNodeForRecommendation, setSourceNodeForRecommendation] = useState<string | null>(null); // 추천 기준 노드 ID
  const [isPendingMode, setIsPendingMode] = useState(false); // 임시노드 확인 모드
  const [recsCache, setRecsCache] = useState<Record<string, AIRecommendationItem[]> | null>(null); // API 응답 전체 캐시
  const [recsOffset, setRecsOffset] = useState(0); // 현재 표시 중인 추천 인덱스

  // 별 배경 랜덤 생성 (개선: 더 많은 별, 다양한 크기와 투명도)
  const stars = useMemo(() => {
    const count = 25;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: Math.random() * 2 + 1, // 1~3px
      opacity: Math.random() * 0.6 + 0.2, // 0.2~0.8
    }));
  }, []);

  // Reanimated shared values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 별 레이어 시차 효과 (Pan 이동과 미세한 offset) - SharedValue 이후 선언
  const starsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value * 0.02 },
      { translateY: translateY.value * 0.02 },
    ],
  }));

  // 그라디언트 블렌딩 - Pan 방향에 따라 각 팔레트의 opacity 조절
  const gradientOpacities = useDerivedValue(() => {
    'worklet';
    const PAN_THRESHOLD = 300;

    // X, Y 축 정규화 (-1 ~ 1)
    const normalizedX = Math.max(-1, Math.min(1, translateX.value / PAN_THRESHOLD));
    const normalizedY = Math.max(-1, Math.min(1, translateY.value / PAN_THRESHOLD));

    // 각 방향별 opacity 계산 (0 ~ 1)
    const leftOpacity = Math.max(0, -normalizedX);   // 왼쪽 드래그 시
    const rightOpacity = Math.max(0, normalizedX);   // 오른쪽 드래그 시
    const upOpacity = Math.max(0, -normalizedY);     // 위 드래그 시
    const downOpacity = Math.max(0, normalizedY);    // 아래 드래그 시

    // CENTER는 항상 기본 배경으로 표시 (다른 레이어들이 위에 겹침)
    return {
      left: leftOpacity,
      right: rightOpacity,
      up: upOpacity,
      down: downOpacity,
    };
  });

  // 각 그라디언트 레이어의 opacity 스타일
  const leftGradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacities.value.left,
  }));
  const rightGradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacities.value.right,
  }));
  const upGradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacities.value.up,
  }));
  const downGradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacities.value.down,
  }));

  const clearPendingState = useCallback(() => {
    setPendingNodes([]);
    setPendingEdges([]);
    setIsPendingMode(false);
    setSourceNodeForRecommendation(null);
    setRecsCache(null);
    setRecsOffset(0);
  }, []);

  // 공통 경고 함수: pending 모드에서 차단된 동작 시도 시
  const showPendingWarning = (onConfirm: () => void) => {
    Alert.alert(
      '추천 선택 미완료',
      '추천을 종료하시겠습니까?\n아직 선택이 저장되지 않았습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추천 종료',
          style: 'destructive',
          onPress: onConfirm,
        },
      ]
    );
  };

  // API 호출 함수
  const loadMapList = async () => {
    try {
      setIsLoading(true);
      const res = await mapsAPI.getList();
      const maps: Map[] = res.data.maps || [];
      setMapList(maps);

      if (maps.length > 0) {
        setSelectedMapId(maps[maps.length - 1].id);
      }

      // 모든 맵 상세 병렬 로드 → 우주 뷰
      const results = await Promise.all(
        maps.map((m: Map) =>
          mapsAPI.getDetail(m.id)
            .then(r => ({ id: m.id, data: r.data }))
            .catch(() => null)
        )
      );
      const newData: Record<string, { nodes: Node[]; edges: Edge[] }> = {};
      results.forEach(r => { if (r) newData[r.id] = { nodes: r.data.nodes, edges: r.data.edges }; });
      setAllMapsData(newData);
    } catch (err: any) {
      Alert.alert('오류', err.message || '지도 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMapDetail = async (mapId: string) => {
    try {
      const res = await mapsAPI.getDetail(mapId);

      // [DEBUG] image_url 확인
      console.log('[loadMapDetail] nodes image_url:', res.data.nodes.map(n => ({ title: n.title, image_url: n.image_url })));

      setAllMapsData(prev => ({ ...prev, [mapId]: { nodes: res.data.nodes, edges: res.data.edges } }));
    } catch (err: any) {
      setMapLoadError(`지도를 불러올 수 없습니다 (ID: ${mapId})`);
    }
  };

  // 팬 제스처
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .minPointers(1)
    .maxPointers(1)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxX = CANVAS_WIDTH;
      const maxY = CANVAS_HEIGHT;
      translateX.value = Math.max(-maxX, Math.min(maxX, savedTranslateX.value + event.translationX));
      translateY.value = Math.max(-maxY, Math.min(maxY, savedTranslateY.value + event.translationY));
    });

  // 핀치 제스처
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      // 스케일 제한 (0.5 ~ 3)
      const newScale = Math.max(0.5, Math.min(3, savedScale.value * event.scale));
      scale.value = newScale;

      // 핀치 중심점을 기준으로 줌
      const scaleDiff = newScale - savedScale.value;
      translateX.value = savedTranslateX.value - (event.focalX - SCREEN_WIDTH / 2) * scaleDiff / savedScale.value;
      translateY.value = savedTranslateY.value - (event.focalY - SCREEN_HEIGHT / 2) * scaleDiff / savedScale.value;
    });

  // 팬과 핀치를 동시에 처리
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // 애니메이션 스타일
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // 컴포넌트 마운트 시 맵 목록 로드
  useEffect(() => {
    loadMapList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // isPendingMode를 전역 store에 동기화 (Tab.Navigator 레벨 인터셉트용)
  useEffect(() => {
    setGlobalPendingMode(isPendingMode);
  }, [isPendingMode, setGlobalPendingMode]);

  // clearPendingState 핸들러를 store에 등록 (navigator에서 호출 가능하도록)
  useEffect(() => {
    registerClearHandler(clearPendingState);
    return () => registerClearHandler(null);
  }, [registerClearHandler, clearPendingState]);


  // selectedMapId 변경 시 맵 상세 데이터 로드
  useEffect(() => {
    if (selectedMapId) {
      loadMapDetail(selectedMapId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMapId]);

  // selectedMapId 변경 시 클러스터 중앙으로 포커스
  useEffect(() => {
    if (!selectedMapId) return;
    const idx = mapList.findIndex(m => m.id === selectedMapId);
    if (idx === -1) return;
    const center = getClusterCenter(idx, mapList.length);
    translateX.value = withSpring(SCREEN_WIDTH / 2 - center.x, { damping: 20, stiffness: 90 });
    translateY.value = withSpring(SCREEN_HEIGHT / 2 - center.y, { damping: 20, stiffness: 90 });
    scale.value = withSpring(1, { damping: 20, stiffness: 90 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMapId, mapList.length]);

  // 모든 맵 노드를 클러스터 위치로 배치한 결과
  const allPositionedNodes = useMemo((): LocalNode[] => {
    if (mapList.length === 0) return [];
    return mapList.flatMap((map, index) => {
      const mapData = allMapsData[map.id];
      if (!mapData) return [];
      const confirmed = mapData.nodes.filter((n: Node) => n.map_id === map.id && !n.is_archived);
      if (confirmed.length === 0) return [];
      const local: LocalNode[] = confirmed.map((n: Node) => ({ ...n, nodeStatus: 'confirmed' as const }));
      const positioned = calculateAllNodePositions(local, mapData.edges) as LocalNode[];
      const root = positioned.find(n => n.is_root);
      const rx = root?.x ?? 0;
      const ry = root?.y ?? 0;
      const center = getClusterCenter(index, mapList.length);
      return positioned.map(n => ({ ...n, x: center.x + (n.x! - rx), y: center.y + (n.y! - ry) }));
    });
  }, [mapList, allMapsData]);

  const allPositionedEdges = useMemo((): LayoutEdge[] => {
    const nodeIds = new Set(allPositionedNodes.map(n => n.id));
    return mapList.flatMap(map => {
      const mapData = allMapsData[map.id];
      if (!mapData) return [];
      return (mapData.edges as LayoutEdge[]).filter(
        (e: LayoutEdge) => nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id)
      );
    });
  }, [mapList, allMapsData, allPositionedNodes]);

  // 선택된 맵 노드 (추천/여정 추가 등 조작용)
  const selectedMapNodes = useMemo(() => {
    return [...allPositionedNodes.filter(n => n.map_id === selectedMapId), ...pendingNodes];
  }, [allPositionedNodes, selectedMapId, pendingNodes]);

  const selectedMapEdges = useMemo(() => {
    const mapData = allMapsData[selectedMapId];
    if (!mapData) return pendingEdges;
    const nodeIds = new Set(selectedMapNodes.map(n => n.id));
    const confirmed = (mapData.edges as LayoutEdge[]).filter(
      (e: LayoutEdge) => nodeIds.has(e.source_node_id) && nodeIds.has(e.target_node_id)
    );
    return [...confirmed, ...pendingEdges];
  }, [allMapsData, selectedMapId, selectedMapNodes, pendingEdges]);

  // 선택된 맵의 최대 step_order 계산
  const maxStepInMap = useMemo(() => {
    if (selectedMapNodes.length === 0) return 0;
    return Math.max(...selectedMapNodes.map((n) => n.step_order));
  }, [selectedMapNodes]);

  // 클러스터 중심점 계산 (바운딩 박스의 중심)
  // route params에서 mapId 수신 처리
  useEffect(() => {
    const incomingMapId = route.params?.mapId;
    if (!incomingMapId) return;
    if (mapList.length === 0) return;

    const mapExists = mapList.find(m => m.id === incomingMapId);
    if (mapExists) {
      setSelectedMapId(incomingMapId);
      setMapLoadError(null);
    } else {
      mapsAPI.getList()
        .then((res) => {
          const maps = res.data.maps || [];
          setMapList(maps);
          const found = maps.find((m: { id: string }) => m.id === incomingMapId);
          if (found) {
            setSelectedMapId(incomingMapId);
            setMapLoadError(null);
            loadMapDetail(incomingMapId);
          } else {
            setMapLoadError(`지도를 찾을 수 없습니다 (ID: ${incomingMapId})`);
          }
        })
        .catch(() => {
          setMapLoadError(`지도를 찾을 수 없습니다 (ID: ${incomingMapId})`);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.mapId, mapList]);

  // pill 탭 시 해당 클러스터로 fly
  const handlePillPress = (mapId: string) => {
    if (isPendingMode) {
      showPendingWarning(() => {
        clearPendingState();
        setSelectedMapId(mapId);
        const idx = mapList.findIndex(m => m.id === mapId);
        if (idx === -1) return;
        const center = getClusterCenter(idx, mapList.length);
        translateX.value = withSpring(SCREEN_WIDTH / 2 - center.x, { damping: 20, stiffness: 90 });
        translateY.value = withSpring(SCREEN_HEIGHT / 2 - center.y, { damping: 20, stiffness: 90 });
        scale.value = withSpring(1, { damping: 20, stiffness: 90 });
      });
      return;
    }

    // isPendingMode 아닐 때: 혹시 남아있을 수 있는 상태 초기화 후 전환
    clearPendingState();
    setSelectedMapId(mapId);
    const idx = mapList.findIndex(m => m.id === mapId);
    if (idx === -1) return;
    const center = getClusterCenter(idx, mapList.length);
    translateX.value = withSpring(SCREEN_WIDTH / 2 - center.x, { damping: 20, stiffness: 90 });
    translateY.value = withSpring(SCREEN_HEIGHT / 2 - center.y, { damping: 20, stiffness: 90 });
    scale.value = withSpring(1, { damping: 20, stiffness: 90 });
  };

  // 노드 클릭 핸들러 - NodeDetailSheet 열기
  const handleNodePress = (id: string) => {
    // confirmed 노드와 pending 노드 모두에서 검색
    const node = selectedMapNodes.find((n) => n.id === id);
    if (!node) return;

    // isPendingMode일 때 pending 노드가 아닌 노드 클릭 시 경고
    if (isPendingMode && node.nodeStatus !== 'pending') {
      showPendingWarning(() => {
        clearPendingState();
        setSelectedNode(node);
        setIsSheetVisible(true);
      });
      return;
    }

    // 기존 로직 유지
    setSelectedNode(node);
    setIsSheetVisible(true);
  };

  // NodeDetailSheet 닫기
  const closeNodeDetailSheet = () => {
    setIsSheetVisible(false);
    setSelectedNode(null);
  };

  type HistoryItem = {
    step: number;
    domain: string;
    title: string;
    context_keywords: string[];
    connection_keyword?: string;
  };

  // 캐시된 추천 결과에서 offset 위치의 3개를 pending 노드로 빌드
  const buildPendingFromRecs = (
    recommendationsObj: Record<string, AIRecommendationItem[]>,
    offset: number,
    sourceNode: LocalNode
  ) => {
    const nodeId = sourceNode.id;
    const domainKeys = Object.keys(recommendationsObj);
    const topRecommendations: Array<AIRecommendationItem & { domain: string }> = [];

    for (let i = offset; topRecommendations.length < 3 && i < offset + 10; i++) {
      for (const domain of domainKeys) {
        if (topRecommendations.length >= 3) break;
        const items = recommendationsObj[domain] as AIRecommendationItem[];
        if (items && items[i]) {
          topRecommendations.push({ ...items[i], domain });
        }
      }
    }

    if (topRecommendations.length === 0) return false;

    const sourceX = sourceNode.x!;
    const sourceY = sourceNode.y!;
    const NODE_SPACING = 200;
    const COLLISION_RADIUS = 100;

    const isOverlapping = (x: number, y: number, nodes: Array<{ x?: number; y?: number }>): boolean =>
      nodes.some(n => {
        if (n.x === undefined || n.y === undefined) return false;
        return Math.sqrt(Math.pow(n.x - x, 2) + Math.pow(n.y - y, 2)) < COLLISION_RADIUS;
      });

    const childNodeIds = selectedMapEdges
      .filter(e => e.source_node_id === nodeId)
      .map(e => e.target_node_id);
    const existingChildren = selectedMapNodes.filter(
      n => childNodeIds.includes(n.id) && n.nodeStatus === 'confirmed'
    );

    let initialPositions: Array<{ x: number; y: number }>;
    if (existingChildren.length > 0) {
      const ec = existingChildren.length;
      const startX = sourceX - ((ec + 2) * NODE_SPACING) / 2;
      initialPositions = [0, 1, 2].map(i => ({
        x: startX + (ec + i) * NODE_SPACING,
        y: sourceY + NODE_SPACING,
      }));
    } else {
      initialPositions = [
        { x: sourceX - NODE_SPACING, y: sourceY + NODE_SPACING },
        { x: sourceX,                y: sourceY + NODE_SPACING },
        { x: sourceX + NODE_SPACING, y: sourceY + NODE_SPACING },
      ];
    }

    const confirmedOnly = selectedMapNodes.filter(n => n.nodeStatus === 'confirmed');
    const pendingPositions = initialPositions.map(pos => {
      let y = pos.y;
      let retries = 0;
      while (retries < 10 && isOverlapping(pos.x, y, confirmedOnly)) { y += NODE_SPACING; retries++; }
      return { x: pos.x, y };
    });

    const newPendingNodes: LocalNode[] = topRecommendations.map((rec, index) => ({
      id: `pending-${nodeId}-${offset}-${index}`,
      map_id: selectedMapId,
      title: rec.title,
      domain: rec.domain as Domain,
      description: rec.reason,
      emotion_tags: rec.tags || [],
      is_root: false,
      is_archived: false,
      step_order: sourceNode.step_order + 1,
      metadata: {},
      created_at: new Date().toISOString(),
      x: pendingPositions[index].x,
      y: pendingPositions[index].y,
      nodeStatus: 'pending',
      external_id: null,
      image_url: rec.image_url || null,
      reason: rec.connection_keyword,
    }));

    const newPendingEdges: LayoutEdge[] = newPendingNodes.map(node => ({
      id: `edge-${nodeId}-${node.id}`,
      source_node_id: nodeId,
      target_node_id: node.id,
    }));

    setPendingNodes(newPendingNodes);
    setPendingEdges(newPendingEdges);
    setIsPendingMode(true);
    return true;
  };

  // 추천 API 호출 및 pending 노드 생성 (공통 로직)
  const fetchRecommendations = async (sourceNodeId: string, history: HistoryItem[] = []) => {
    const sourceNode = selectedMapNodes.find(n => n.id === sourceNodeId && n.nodeStatus === 'confirmed');
    if (!sourceNode || sourceNode.x === undefined || sourceNode.y === undefined) {
      Alert.alert('오류', '기준 노드를 찾을 수 없습니다.');
      return;
    }

    const nodeId = sourceNode.id;
    const nodeDomain = sourceNode.domain;
    const nodeTitle = sourceNode.title;
    const nodeMetadata = sourceNode.metadata || {};
    const contentId = sourceNode.external_id || nodeId;

    setIsRecommending(true);
    setSourceNodeForRecommendation(nodeId);

    try {
      // 1. 추천 API 호출
      const reqBody = {
        domain: nodeDomain,
        content_id: contentId,
        title: nodeTitle,
        metadata: nodeMetadata,
        history: history,
        exclude_domains: [],
      };
      console.log('[추천 요청]', JSON.stringify(reqBody));
      const res = await recommendationAPI.get(reqBody);

      console.log('[추천 응답 원본]', JSON.stringify(res.data.recommendations));

      const recommendationsObj = res.data.recommendations || {};

      // 2. 전체 응답 캐시 저장, offset 초기화
      setRecsCache(recommendationsObj);
      setRecsOffset(0);

      buildPendingFromRecs(recommendationsObj, 0, sourceNode);
    } catch (err: any) {
      Alert.alert(
        '추천 오류',
        err.message || '추천을 불러오는 중 오류가 발생했어요. 다시 시도해 주세요.'
      );
    } finally {
      setIsRecommending(false);
    }
  };

  // [과몰입 계속하기] 핸들러 - confirmed 노드에서 추천 받기
  const handleContinueObsession = async () => {
    if (!selectedNode || selectedNode.nodeStatus === 'pending') return;
    setIsSheetVisible(false);
    setSelectedNode(null);
    await fetchRecommendations(selectedNode.id);
  };

  // [새로고침] 핸들러 - 캐시에서 다음 인덱스 표시, 소진 시 새 API 호출
  const handleRefreshRecommendations = async () => {
    if (!sourceNodeForRecommendation || isRecommending) return;

    const nextOffset = recsOffset + 1;
    const sourceNode = selectedMapNodes.find(
      n => n.id === sourceNodeForRecommendation && n.nodeStatus === 'confirmed'
    );

    // 캐시에 다음 항목이 있으면 API 호출 없이 표시
    if (recsCache && sourceNode) {
      const hasMore = Object.values(recsCache).some(items => items[nextOffset]);
      if (hasMore) {
        setPendingNodes([]);
        setPendingEdges([]);
        setRecsOffset(nextOffset);
        buildPendingFromRecs(recsCache, nextOffset, sourceNode);
        return;
      }
    }

    // 캐시 소진 시 API 재호출
    setPendingNodes([]);
    setPendingEdges([]);
    setRecsCache(null);
    setRecsOffset(0);
    await fetchRecommendations(sourceNodeForRecommendation);
  };

  // [여정에 추가] 핸들러 - pending 노드를 confirmed로 전환
  const handleAddToJourney = async () => {
    if (!selectedNode || selectedNode.nodeStatus !== 'pending') return;

    const pendingNode = selectedNode;
    const parentNodeId = sourceNodeForRecommendation;

    if (!parentNodeId) {
      Alert.alert('오류', '부모 노드를 찾을 수 없습니다.');
      return;
    }

    // Sheet 닫기
    setIsSheetVisible(false);
    setSelectedNode(null);

    try {
      // [DEBUG] 저장 전 pending 노드 데이터 확인
      console.log('[AddToJourney] image_url:', pendingNode.image_url);
      console.log('[AddToJourney] emotion_tags:', pendingNode.emotion_tags);
      console.log('[AddToJourney] metadata:', JSON.stringify(pendingNode.metadata));

      // 1. 노드 추가 API 호출
      const nodeRes = await nodesAPI.add(selectedMapId, {
        title: pendingNode.title,
        domain: pendingNode.domain,
        step_order: selectedMapNodes.length, // 현재 지도 노드 수 = step_order
        is_root: false,
        description: pendingNode.description || null,
        image_url: pendingNode.image_url || null,
        emotion_tags: pendingNode.emotion_tags || [],
        external_id: pendingNode.external_id || null,
        metadata: {},
      });

      const newNodeId = nodeRes.data.id;

      // 2. 엣지 추가 API 호출
      await edgesAPI.save(selectedMapId, {
        source_node_id: parentNodeId,
        target_node_id: newNodeId,
        reason: pendingNode.reason || null, // connection_keyword를 reason으로 전달
      });

      // 3. 1개 선택 완료 → 나머지 추천 노드 전부 제거하고 pending 모드 종료
      clearPendingState();

      // 4. 맵 상세 데이터 리로드
      await loadMapDetail(selectedMapId);
    } catch (err: any) {
      Alert.alert(
        '추가 오류',
        err.message || '노드 추가 중 오류가 발생했어요. 다시 시도해 주세요.'
      );
    }
  };

  const handleComplete = () => {
    clearPendingState();
  };

  // 줌 버튼 핸들러
  const handleZoomIn = () => {
    const newScale = Math.min(scale.value + 0.2, 3);
    scale.value = withSpring(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale.value - 0.2, 0.5);
    scale.value = withSpring(newScale);
  };

  const handleReset = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const getNodeById = (id: string) => {
    try {
      return [...allPositionedNodes, ...pendingNodes].find((n) => n?.id === id);
    } catch (error) {
      return undefined;
    }
  };

  // 지도 로드 에러
  if (mapLoadError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{mapLoadError}</Text>
        <Text style={styles.emptyText}>다른 지도를 선택하거나 홈에서 새로 시작하세요.</Text>
      </View>
    );
  }

  // 로딩 상태 체크
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.accent.nebulaRose} />
        <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
      </View>
    );
  }

  // 노드가 없는 경우
  if (allPositionedNodes.length === 0 && Object.keys(allMapsData).length > 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>지도에 노드가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        {/* 우주 그라디언트 배경 - 레이어드 블렌딩 */}
        {/* 기본 CENTER 팔레트 */}
        <LinearGradient
          colors={GRADIENT_PALETTES.CENTER as [string, string, string]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
        {/* LEFT 팔레트 (왼쪽 드래그 시 표시) */}
        <Animated.View style={[StyleSheet.absoluteFill, leftGradientStyle]}>
          <LinearGradient
            colors={GRADIENT_PALETTES.LEFT as [string, string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />
        </Animated.View>
        {/* RIGHT 팔레트 (오른쪽 드래그 시 표시) */}
        <Animated.View style={[StyleSheet.absoluteFill, rightGradientStyle]}>
          <LinearGradient
            colors={GRADIENT_PALETTES.RIGHT as [string, string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />
        </Animated.View>
        {/* UP 팔레트 (위 드래그 시 표시) */}
        <Animated.View style={[StyleSheet.absoluteFill, upGradientStyle]}>
          <LinearGradient
            colors={GRADIENT_PALETTES.UP as [string, string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />
        </Animated.View>
        {/* DOWN 팔레트 (아래 드래그 시 표시) */}
        <Animated.View style={[StyleSheet.absoluteFill, downGradientStyle]}>
          <LinearGradient
            colors={GRADIENT_PALETTES.DOWN as [string, string, string]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />
        </Animated.View>

        {/* 별 배경 (시차 효과) */}
        <Animated.View style={[StyleSheet.absoluteFill, starsAnimatedStyle]}>
          {stars.map((star) => (
            <View
              key={star.id}
              style={[
                styles.star,
                {
                  left: star.x,
                  top: star.y,
                  width: star.size,
                  height: star.size,
                  opacity: star.opacity,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* 제스처 캔버스 */}
        <GestureDetector gesture={composedGesture}>
          <View style={styles.canvasContainer}>
            {/* 엣지 + 노드 통합 레이어 (동일한 transform 적용) */}
            <Animated.View style={[styles.graphLayer, animatedStyle]}>
              {/* 엣지 레이어 (화면 크기 고정 SVG) */}
              <Svg
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                style={styles.svgLayer}
              >
                {[...allPositionedEdges, ...pendingEdges].map((edge) => {
                  try {
                    const source = getNodeById(edge?.source_node_id);
                    const target = getNodeById(edge?.target_node_id);
                    if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) {
                      return null;
                    }
                    return (
                      <EdgeLine
                        key={edge.id}
                        sourceX={source.x}
                        sourceY={source.y}
                        targetX={target.x}
                        targetY={target.y}
                      />
                    );
                  } catch (error) {
                    return null;
                  }
                })}
              </Svg>

              {[...allPositionedNodes, ...pendingNodes].map((node) => {
                try {
                  if (!node || node.x === undefined || node.y === undefined) {
                    console.log('[Render] Skipping node - undefined x or y:', node?.id);
                    return null;
                  }
                  const isPending = node.nodeStatus === 'pending';
                  console.log('[Render] Rendering node:', node.id, 'x:', node.x, 'y:', node.y, 'left:', node.x, 'top:', node.y);
                  return (
                    <View
                      key={node.id}
                      style={[
                        styles.nodeWrapper,
                        {
                          left: node.x,
                          top: node.y,
                          opacity: isPending ? 0.5 : 1.0,
                        },
                      ]}
                    >
                      <NodeCircle
                        id={node.id}
                        title={node.title || 'Untitled'}
                        domain={node.domain}
                        is_root={node.is_root || false}
                        step_order={node.step_order || 0}
                        isCurrentLeaf={node.step_order === maxStepInMap && !node.is_root && !isPending}
                        isPending={isPending}
                        onPress={handleNodePress}
                      />
                    </View>
                  );
                } catch (error) {
                  return null;
                }
              })}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* 좌측 하단 줌 버튼 */}
        <View style={styles.zoomButtons}>
          <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
            <Text style={styles.zoomButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
            <Text style={styles.zoomButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.zoomButton} onPress={handleReset}>
            <Text style={styles.zoomButtonText}>↔</Text>
          </TouchableOpacity>
        </View>

        {/* 하단 pill 컴포넌트 */}
        <View style={styles.pillContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillScrollContent}
          >
            {mapList.map((map) => (
              <TouchableOpacity
                key={map.id}
                style={[
                  styles.pill,
                  selectedMapId === map.id && styles.pillSelected,
                ]}
                onPress={() => handlePillPress(map.id)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedMapId === map.id && styles.pillTextSelected,
                  ]}
                >
                  {map.title}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pillAdd}>
              <Text style={styles.pillAddText}>+</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* pending 모드 버튼 */}
        {isPendingMode && (
          <>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshRecommendations}>
              <Text style={styles.refreshButtonText}>↺</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
              <Text style={styles.completeButtonText}>완료</Text>
            </TouchableOpacity>
          </>
        )}

        {/* 추천 로딩 오버레이 */}
        {isRecommending && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.accent.nebulaRose} size="large" />
              <Text style={styles.loadingText}>추천을 불러오는 중...</Text>
            </View>
          </View>
        )}

        {/* NodeDetailSheet */}
        <NodeDetailSheet
          visible={isSheetVisible}
          onClose={closeNodeDetailSheet}
          node={selectedNode ? {
            id: selectedNode.id,
            map_id: selectedNode.map_id,
            domain: selectedNode.domain,
            external_id: selectedNode.external_id || null,
            title: selectedNode.title,
            description: selectedNode.description,
            image_url: selectedNode.image_url || null,
            emotion_tags: selectedNode.emotion_tags,
            is_root: selectedNode.is_root,
            is_archived: false,
            step_order: selectedNode.step_order,
            metadata: {},
            created_at: new Date().toISOString(),
          } as Node : null}
          nodeStatus={selectedNode?.nodeStatus || 'confirmed'}
          onContinueObsession={handleContinueObsession}
          onAddToJourney={handleAddToJourney}
          isPendingMode={isPendingMode}
          onPendingWarning={showPendingWarning}
        />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    position: 'absolute',
    backgroundColor: Colors.text.starlight,
    borderRadius: 999,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.moonmist,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.moonmist,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.accent.nebulaRose,
    textAlign: 'center',
    marginBottom: 8,
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
  },
  graphLayer: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    position: 'absolute',
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  nodeWrapper: {
    position: 'absolute',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  zoomButtons: {
    position: 'absolute',
    left: 16,
    bottom: 80,
    gap: 8,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.nebulaBase,
    borderWidth: 1,
    borderColor: Colors.background.comet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    fontSize: 18,
    color: Colors.text.starlight,
    fontWeight: '600',
  },
  // Pill 스타일
  pillContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: `${Colors.accent.orbit}33`,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  pillScrollContent: {
    gap: 8,
    paddingHorizontal: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent.pulsar,
    backgroundColor: Colors.ui.transparent,
  },
  pillSelected: {
    backgroundColor: Colors.accent.pulsar,
    borderColor: Colors.accent.pulsar,
  },
  pillText: {
    fontSize: 14,
    color: Colors.text.moonmist,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: Colors.text.starlight,
  },
  pillAdd: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillAddText: {
    fontSize: 18,
    color: Colors.text.starlight,
    fontWeight: '600',
  },
  // [완료] 버튼
  refreshButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.input,
    borderWidth: 1,
    borderColor: Colors.accent.nebulaRose,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.ui.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  refreshButtonText: {
    fontSize: 20,
    color: Colors.accent.nebulaRose,
    fontWeight: '700',
  },
  completeButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: Colors.accent.nebulaRose,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: Colors.ui.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  completeButtonText: {
    fontSize: 16,
    color: Colors.text.starlight,
    fontWeight: '700',
  },
  // 로딩 오버레이
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingBox: {
    backgroundColor: Colors.background.nebulaBase,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
  },
});

// ErrorBoundary로 감싸서 export
export default function MapCanvas() {
  return (
    <ErrorBoundary>
      <MapCanvasContent />
    </ErrorBoundary>
  );
}
