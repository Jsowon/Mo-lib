import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 레이아웃 상수
const VERTICAL_SPACING = 150; // 노드 간 세로 간격
const HORIZONTAL_SPACING = 150; // 노드 간 가로 간격
const START_Y = 200; // 시작 Y 좌표

export interface Node {
  id: string;
  map_id: string;
  is_root: boolean;
  step_order: number;
  [key: string]: any;
}

export interface Edge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  reason?: string | null;
}

export interface PositionedNode extends Node {
  x: number;
  y: number;
}

/**
 * step_order 기반 레이어 레이아웃 알고리즘
 * - 루트 노드는 상단 중앙에 배치
 * - step_order가 높을수록 아래쪽에 배치
 * - 같은 step_order의 노드는 가로로 균등 배치
 */
export function calculateNodePositions(
  nodes: Node[],
  _edges: Edge[],
  mapId: string
): PositionedNode[] {
  // 해당 맵의 노드만 필터링
  const mapNodes = nodes.filter((n) => n.map_id === mapId);

  if (mapNodes.length === 0) {
    return [];
  }

  // step_order별로 노드 그룹화
  const layerMap = new Map<number, Node[]>();

  mapNodes.forEach((node) => {
    const layer = node.step_order;
    if (!layerMap.has(layer)) {
      layerMap.set(layer, []);
    }
    layerMap.get(layer)!.push(node);
  });

  // 캔버스 중심점
  const centerX = SCREEN_WIDTH / 2;

  // 각 레이어의 노드 위치 계산
  const positions = new Map<string, { x: number; y: number }>();

  layerMap.forEach((layerNodes, layer) => {
    const y = START_Y + layer * VERTICAL_SPACING;
    const nodeCount = layerNodes.length;

    // 레이어 전체 너비 계산
    const totalWidth = (nodeCount - 1) * HORIZONTAL_SPACING;
    const startX = centerX - totalWidth / 2;

    // 각 노드를 균등하게 배치
    layerNodes.forEach((node, index) => {
      const x = startX + index * HORIZONTAL_SPACING;
      positions.set(node.id, { x, y });
    });
  });

  // 최종 결과 생성
  return mapNodes.map((node) => {
    const pos = positions.get(node.id) || { x: centerX, y: START_Y };
    return {
      ...node,
      x: pos.x,
      y: pos.y,
    };
  });
}

/**
 * 여러 맵의 모든 노드 위치를 계산
 */
export function calculateAllNodePositions(
  nodes: Node[],
  edges: Edge[]
): PositionedNode[] {
  console.log('[calculateAllNodePositions] nodes:', nodes.length, 'edges:', edges.length);
  const mapIds = Array.from(new Set(nodes.map((n) => n.map_id)));
  console.log('[calculateAllNodePositions] mapIds:', mapIds);

  let allPositionedNodes: PositionedNode[] = [];
  let currentXOffset = 0;

  mapIds.forEach((mapId) => {
    const mapPositionedNodes = calculateNodePositions(nodes, edges, mapId);
    console.log('[calculateAllNodePositions] mapId:', mapId, 'positioned:', mapPositionedNodes.length);
    if (mapPositionedNodes.length > 0) {
      console.log('[positioned node]', JSON.stringify(mapPositionedNodes[0]));
    }

    // 각 맵 클러스터를 가로로 배치 (겹치지 않도록)
    const offsetNodes = mapPositionedNodes.map((node) => ({
      ...node,
      x: node.x + currentXOffset,
    }));

    allPositionedNodes = [...allPositionedNodes, ...offsetNodes];

    // 다음 맵을 위한 오프셋 계산
    if (mapPositionedNodes.length > 0) {
      const maxX = Math.max(...mapPositionedNodes.map((n) => n.x));
      const minX = Math.min(...mapPositionedNodes.map((n) => n.x));
      const clusterWidth = maxX - minX;
      currentXOffset += clusterWidth + HORIZONTAL_SPACING * 3; // 맵 간 여유 공간
    }
  });

  return allPositionedNodes;
}
