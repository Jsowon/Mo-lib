import React, { useMemo, useState, useEffect } from 'react';
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
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import EdgeLine from '../components/graph/EdgeLine';
import NodeCircle from '../components/graph/NodeCircle';
import NodeDetailSheet from '../components/common/NodeDetailSheet';
import { calculateAllNodePositions, Node as LayoutNode, Edge as LayoutEdge } from '../utils/layoutUtils';
import ErrorBoundary from '../components/ErrorBoundary';
import { Node, AIRecommendationItem } from '../types';
import { RootTabParamList, HomeStackParamList } from '../navigation/types';
import { recommendationAPI, nodesAPI, edgesAPI } from '../api/endpoints';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 네비게이션 타입
type MapRouteProp = RouteProp<RootTabParamList, 'Map'>;
type MapNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Map'>,
  NativeStackNavigationProp<HomeStackParamList>
>;

// 타입 정의
type DomainType = 'movie' | 'music' | 'book';
type NodeStatus = 'confirmed' | 'pending';

interface NodeData extends LayoutNode {
  title: string;
  domain: DomainType;
  description: string;
  emotion_tags: string[];
  nodeStatus?: NodeStatus; // 노드 상태 (기본값: 'confirmed')
  external_id?: string | null; // 외부 API ID (추천 노드에서 사용)
  image_url?: string | null; // 이미지 URL
  reason?: string | null; // 추천 이유 (pending 노드에서 사용)
}


// 목 데이터 (x, y 좌표 제거 - 레이아웃 알고리즘으로 자동 계산)
const MOCK_NODES_RAW: NodeData[] = [
  // Map 1: 명량 (node1-4)
  {
    id: 'node1',
    map_id: 'map1',
    title: '명량',
    domain: 'movie' as const,
    is_root: true,
    step_order: 0,
    description: '조선 최고의 전투',
    emotion_tags: ['#웅장함'],
  },
  {
    id: 'node2',
    map_id: 'map1',
    title: 'Norwegian Wood',
    domain: 'music' as const,
    is_root: false,
    step_order: 1,
    description: '비틀즈의 명곡',
    emotion_tags: ['#몽환'],
  },
  {
    id: 'node3',
    map_id: 'map1',
    title: '해변의 카프카',
    domain: 'book' as const,
    is_root: false,
    step_order: 2,
    description: '무라카미 하루키',
    emotion_tags: ['#고독'],
  },
  {
    id: 'node4',
    map_id: 'map1',
    title: '멜랑꼴리아',
    domain: 'movie' as const,
    is_root: false,
    step_order: 3,
    description: '현재 과몰입 중',
    emotion_tags: ['#우울'],
  },
  // Map 2: Fly to the moon (node5-7)
  {
    id: 'node5',
    map_id: 'map2',
    title: 'Fly Me to the Moon',
    domain: 'music' as const,
    is_root: true,
    step_order: 0,
    description: '프랭크 시나트라',
    emotion_tags: ['#로맨틱'],
  },
  {
    id: 'node6',
    map_id: 'map2',
    title: 'La La Land',
    domain: 'movie' as const,
    is_root: false,
    step_order: 1,
    description: '꿈을 향한 도전',
    emotion_tags: ['#감성'],
  },
  {
    id: 'node7',
    map_id: 'map2',
    title: '달',
    domain: 'book' as const,
    is_root: false,
    step_order: 2,
    description: '파커 하비의 시집',
    emotion_tags: ['#몽환'],
  },
  // Map 3: 프로젝트 헤일메리 (node8-10)
  {
    id: 'node8',
    map_id: 'map3',
    title: '프로젝트 헤일메리',
    domain: 'book' as const,
    is_root: true,
    step_order: 0,
    description: '앤디 위어의 SF 소설',
    emotion_tags: ['#스릴'],
  },
  {
    id: 'node9',
    map_id: 'map3',
    title: '인터스텔라',
    domain: 'movie' as const,
    is_root: false,
    step_order: 1,
    description: '우주를 향한 여정',
    emotion_tags: ['#웅장함'],
  },
  {
    id: 'node10',
    map_id: 'map3',
    title: 'Space Oddity',
    domain: 'music' as const,
    is_root: false,
    step_order: 2,
    description: '데이비드 보위',
    emotion_tags: ['#고독'],
  },
];

const MOCK_EDGES: LayoutEdge[] = [
  // Map 1 edges
  { id: 'e1', source_node_id: 'node1', target_node_id: 'node2' },
  { id: 'e2', source_node_id: 'node2', target_node_id: 'node3' },
  { id: 'e3', source_node_id: 'node3', target_node_id: 'node4' },
  // Map 2 edges
  { id: 'e4', source_node_id: 'node5', target_node_id: 'node6' },
  { id: 'e5', source_node_id: 'node6', target_node_id: 'node7' },
  // Map 3 edges
  { id: 'e6', source_node_id: 'node8', target_node_id: 'node9' },
  { id: 'e7', source_node_id: 'node9', target_node_id: 'node10' },
];

const MOCK_MAPS = [
  { id: 'map1', title: '명량' },
  { id: 'map2', title: 'Fly to the moon' },
  { id: 'map3', title: '프로젝트 헤일메리' },
];

function MapCanvasContent() {
  const navigation = useNavigation<MapNavProp>();
  const route = useRoute<MapRouteProp>();

  const MOCK_NODES = useMemo(() => {
    try {
      if (!MOCK_NODES_RAW || MOCK_NODES_RAW.length === 0) {
        return [];
      }

      if (!MOCK_EDGES || MOCK_EDGES.length === 0) {
        return MOCK_NODES_RAW.map(node => ({ ...node, x: 0, y: 0 }));
      }

      const positioned = calculateAllNodePositions(MOCK_NODES_RAW, MOCK_EDGES);
      return positioned || [];
    } catch (error) {
      return [];
    }
  }, []);

  // 별 배경 랜덤 생성
  const stars = useMemo(() => {
    const count = Math.floor(Math.random() * 6) + 10; // 10~15개
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: Math.random() * 1 + 2, // 2~3px
      opacity: Math.random() * 0.4 + 0.3, // 0.3~0.7
    }));
  }, []);

  // State
  const [selectedMapId, setSelectedMapId] = useState<string>(MOCK_MAPS[MOCK_MAPS.length - 1]?.id || 'map1');
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  // 추천 관련 상태
  const [pendingNodes, setPendingNodes] = useState<NodeData[]>([]); // 임시 추천 노드 목록
  const [pendingEdges, setPendingEdges] = useState<LayoutEdge[]>([]); // 임시 엣지 목록
  const [isRecommending, setIsRecommending] = useState(false); // 추천 API 호출 중
  const [sourceNodeForRecommendation, setSourceNodeForRecommendation] = useState<string | null>(null); // 추천 기준 노드 ID
  const [isPendingMode, setIsPendingMode] = useState(false); // 임시노드 확인 모드

  // Reanimated shared values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 팬 제스처
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
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

  const selectedMapNodes = useMemo(() => {
    try {
      if (!MOCK_NODES || !Array.isArray(MOCK_NODES) || MOCK_NODES.length === 0) {
        return [];
      }
      const confirmedNodes = MOCK_NODES.filter((node) => node?.map_id === selectedMapId);
      const allNodes = [...confirmedNodes, ...pendingNodes];
      return allNodes;
    } catch (error) {
      return [];
    }
  }, [selectedMapId, MOCK_NODES, pendingNodes]);

  const selectedMapEdges = useMemo(() => {
    try {
      if (!selectedMapNodes || selectedMapNodes.length === 0) {
        return [];
      }
      const nodeIds = new Set(selectedMapNodes.map((n) => n?.id).filter(Boolean));
      const confirmedEdges = MOCK_EDGES.filter(
        (edge) => edge && nodeIds.has(edge.source_node_id) && nodeIds.has(edge.target_node_id)
      );
      const allEdges = [...confirmedEdges, ...pendingEdges];
      return allEdges;
    } catch (error) {
      return [];
    }
  }, [selectedMapNodes, pendingEdges]);

  // 선택된 맵의 최대 step_order 계산
  const maxStepInMap = useMemo(() => {
    if (selectedMapNodes.length === 0) return 0;
    return Math.max(...selectedMapNodes.map((n) => n.step_order));
  }, [selectedMapNodes]);

  // 클러스터 중심점 계산 (바운딩 박스의 중심)
  const getMapClusterCenter = (mapId: string) => {
    const mapNodes = MOCK_NODES.filter((node) => node.map_id === mapId);
    if (mapNodes.length === 0) return { x: 0, y: 0 };

    const xs = mapNodes.map((n) => n.x);
    const ys = mapNodes.map((n) => n.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };
  };

  // route params에서 mapId 수신 처리
  useEffect(() => {
    const incomingMapId = route.params?.mapId;
    setMapLoadError(null);

    if (incomingMapId) {
      // 해당 mapId가 존재하는지 확인
      const mapExists = MOCK_MAPS.find(m => m.id === incomingMapId);
      if (mapExists) {
        setSelectedMapId(incomingMapId);
        // 해당 맵의 중심으로 포커스 이동
        const center = getMapClusterCenter(incomingMapId);
        const centerX = SCREEN_WIDTH / 2 - center.x;
        const centerY = SCREEN_HEIGHT / 2 - center.y;
        translateX.value = centerX;
        translateY.value = centerY;
        scale.value = 1;
        return;
      } else {
        // mapId가 유효하지 않은 경우 에러 표시
        setMapLoadError(`지도를 찾을 수 없습니다 (ID: ${incomingMapId})`);
      }
    }
    // mapId가 없거나 유효하지 않으면 마지막 맵의 리프 노드로 자동 포커스
    if (selectedMapId && selectedMapNodes.length > 0) {
      const maxStep = Math.max(...selectedMapNodes.map((n) => n.step_order));
      const leafNode = selectedMapNodes.find((n) => n.step_order === maxStep);

      if (leafNode) {
        const centerX = SCREEN_WIDTH / 2 - leafNode.x;
        const centerY = SCREEN_HEIGHT / 2 - leafNode.y;
        translateX.value = centerX;
        translateY.value = centerY;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.mapId]); // route.params?.mapId 변경 시 실행

  // pill 탭 시 포커스 이동
  const handlePillPress = (mapId: string) => {
    setSelectedMapId(mapId);

    // 해당 맵의 클러스터 중심으로 이동
    const center = getMapClusterCenter(mapId);
    const centerX = SCREEN_WIDTH / 2 - center.x;
    const centerY = SCREEN_HEIGHT / 2 - center.y;

    translateX.value = withSpring(centerX, {
      damping: 20,
      stiffness: 90,
    });
    translateY.value = withSpring(centerY, {
      damping: 20,
      stiffness: 90,
    });

    // 줌 레벨도 적절하게 조정 (선택 사항)
    scale.value = withSpring(1, {
      damping: 20,
      stiffness: 90,
    });
  };

  // 노드 클릭 핸들러 - NodeDetailSheet 열기
  const handleNodePress = (id: string) => {
    // confirmed 노드와 pending 노드 모두에서 검색
    const node = selectedMapNodes.find((n) => n.id === id);
    if (node) {
      setSelectedNode(node as NodeData);
      setIsSheetVisible(true);
    }
  };

  // NodeDetailSheet 닫기
  const closeNodeDetailSheet = () => {
    setIsSheetVisible(false);
    setSelectedNode(null);
  };

  // [과몰입 계속하기] 핸들러 - confirmed 노드에서 추천 받기
  const handleContinueObsession = async () => {
    if (!selectedNode || selectedNode.nodeStatus === 'pending') return;

    const nodeId = selectedNode.id;
    const nodeTitle = selectedNode.title;
    const nodeDomain = selectedNode.domain;
    // external_id가 있으면 사용, 없으면 nodeId를 임시로 사용
    const contentId = selectedNode.external_id || nodeId; // TODO: external_id가 null인 경우 백엔드 처리 확인 필요

    // Sheet 닫기
    setIsSheetVisible(false);
    setSelectedNode(null);

    // 로딩 시작
    setIsRecommending(true);
    setSourceNodeForRecommendation(nodeId);

    try {
      // 1. 추천 API 호출
      const res = await recommendationAPI.get({
        content_id: contentId,
        title: nodeTitle,
        domain: nodeDomain,
      });

      const recommendationsObj = res.data.recommendations || {};

      // 2. 모든 도메인의 추천 아이템을 flat하게 합침 (최대 3개)
      const allRecommendations: Array<AIRecommendationItem & { domain: string }> = [];
      Object.entries(recommendationsObj).forEach(([domain, items]) => {
        (items as AIRecommendationItem[]).forEach(item => {
          allRecommendations.push({ ...item, domain });
        });
      });

      const topRecommendations = allRecommendations.slice(0, 3);

      // 3. pending 노드 생성
      // 기준 노드(source)의 좌표 가져오기 - selectedMapNodes(layoutNodes)에서 찾기
      const sourceNode = selectedMapNodes.find(n => n.id === nodeId);
      if (!sourceNode || sourceNode.x === undefined || sourceNode.y === undefined) {
        throw new Error('기준 노드의 좌표를 찾을 수 없습니다.');
      }

      const sourceX = sourceNode.x;
      const sourceY = sourceNode.y;
      const NODE_SPACING = 200; // 노드 간 간격 (기존 150 → 200으로 확대)
      const COLLISION_RADIUS = 80; // 충돌 감지 반경

      // 충돌 감지 함수: 주어진 좌표가 기존 노드와 겹치는지 확인
      const isOverlapping = (x: number, y: number, existingNodes: Array<{ x?: number; y?: number }>, radius: number = COLLISION_RADIUS): boolean => {
        return existingNodes.some(node => {
          if (node.x === undefined || node.y === undefined) return false;
          const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
          return distance < radius;
        });
      };

      // pending 노드 초기 위치 계산 (아래 방향 고정)
      // 노드 1: 왼쪽 하단 (x - 간격, y + 간격)
      // 노드 2: 중앙 하단 (x, y + 간격)
      // 노드 3: 오른쪽 하단 (x + 간격, y + 간격)
      const initialPositions = [
        { x: sourceX - NODE_SPACING, y: sourceY + NODE_SPACING }, // 왼쪽
        { x: sourceX, y: sourceY + NODE_SPACING },                // 중앙
        { x: sourceX + NODE_SPACING, y: sourceY + NODE_SPACING }, // 오른쪽
      ];

      // 기존 confirmed 노드들만 가져오기 (pending 노드 제외)
      const confirmedNodesOnly = MOCK_NODES.filter((node) => node?.map_id === selectedMapId);

      // 충돌 방지: 기존 노드와 겹치면 y값 추가로 내리기 (최대 3회 재시도)
      const pendingPositions = initialPositions.map(pos => {
        let adjustedY = pos.y;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries && isOverlapping(pos.x, adjustedY, confirmedNodesOnly)) {
          adjustedY += NODE_SPACING;
          retries++;
        }

        return { x: pos.x, y: adjustedY };
      });

      const newPendingNodes: NodeData[] = topRecommendations.map((rec, index: number) => ({
        id: `pending-${nodeId}-${index}`,
        map_id: selectedMapId,
        title: rec.title,
        domain: rec.domain as DomainType,
        description: rec.reason, // description 대신 reason 사용
        emotion_tags: rec.tags || [], // emotion_tags → tags로 변경
        is_root: false,
        step_order: selectedNode.step_order + 1,
        x: pendingPositions[index].x,
        y: pendingPositions[index].y,
        nodeStatus: 'pending',
        external_id: null, // AIRecommendationItem에는 external_id 없음
        image_url: null, // AIRecommendationItem에는 image_url 없음
        reason: rec.connection_keyword, // connection_keyword를 reason으로 저장
      }));

      // 4. pending 엣지 생성 (source = 선택한 노드, target = 각 pending 노드)
      const newPendingEdges: LayoutEdge[] = newPendingNodes.map((node) => ({
        id: `edge-${nodeId}-${node.id}`,
        source_node_id: nodeId,
        target_node_id: node.id,
      }));

      // 5. 상태 업데이트
      setPendingNodes(newPendingNodes);
      setPendingEdges(newPendingEdges);
      setIsPendingMode(true);
    } catch (err: any) {
      Alert.alert(
        '추천 오류',
        err.message || '추천을 불러오는 중 오류가 발생했어요. 다시 시도해 주세요.'
      );
    } finally {
      setIsRecommending(false);
    }
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

      // 3. pending 노드를 confirmed로 전환
      setPendingNodes(prev =>
        prev.map(node =>
          node.id === pendingNode.id
            ? { ...node, nodeStatus: 'confirmed' as NodeStatus }
            : node
        )
      );
    } catch (err: any) {
      Alert.alert(
        '추가 오류',
        err.message || '노드 추가 중 오류가 발생했어요. 다시 시도해 주세요.'
      );
    }
  };

  const handleComplete = () => {
    setPendingNodes([]);
    setPendingEdges([]);
    setIsPendingMode(false);
    setSourceNodeForRecommendation(null);
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
      return selectedMapNodes?.find((n) => n?.id === id);
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
  if (!MOCK_NODES || MOCK_NODES.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.accent.nebulaRose} />
        <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
      </View>
    );
  }

  // 선택된 맵에 노드가 없는 경우
  if (!selectedMapNodes || selectedMapNodes.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>선택된 지도에 노드가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        {/* 별 배경 */}
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

        {/* 제스처 캔버스 */}
        <GestureDetector gesture={composedGesture}>
          <View style={styles.canvasContainer}>
            {/* 엣지 + 노드 통합 레이어 (동일한 transform 적용) */}
            <Animated.View style={[styles.graphLayer, animatedStyle]}>
              {/* 엣지 레이어 (화면 크기 고정 SVG) */}
              <Svg
                width={SCREEN_WIDTH * 4}
                height={SCREEN_HEIGHT * 4}
                viewBox={`${-SCREEN_WIDTH * 2} ${-SCREEN_HEIGHT * 2} ${SCREEN_WIDTH * 4} ${SCREEN_HEIGHT * 4}`}
                style={styles.svgLayer}
              >
                {selectedMapEdges?.map((edge) => {
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

              {selectedMapNodes?.map((node) => {
                try {
                  if (!node || node.x === undefined || node.y === undefined) {
                    return null;
                  }
                  const isPending = node.nodeStatus === 'pending';
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
            {MOCK_MAPS.map((map) => (
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

        {/* [완료] 버튼 - isPendingMode일 때만 표시 */}
        {isPendingMode && (
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>완료</Text>
          </TouchableOpacity>
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
        />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.deepSpace,
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
    width: SCREEN_WIDTH * 4,
    height: SCREEN_HEIGHT * 4,
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
    backgroundColor: 'transparent',
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
  completeButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: Colors.accent.nebulaRose,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#000',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
