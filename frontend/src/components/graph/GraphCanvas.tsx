import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import NodeCircle from './NodeCircle';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 임시 노드/엣지 데이터
const MOCK_NODES = [
  { id: 'node1', x: 200, y: 150, title: '루트', domain: 'movie' as const, is_root: true, step_order: 0 },
  { id: 'node2', x: 100, y: 300, title: '중간1', domain: 'music' as const, is_root: false, step_order: 1 },
  { id: 'node3', x: 300, y: 300, title: '중간2', domain: 'book' as const, is_root: false, step_order: 2 },
  { id: 'node4', x: 200, y: 450, title: '현재', domain: 'movie' as const, is_root: false, step_order: 3 },
];

const MOCK_EDGES = [
  { source: 'node1', target: 'node2' },
  { source: 'node1', target: 'node3' },
  { source: 'node2', target: 'node4' },
  { source: 'node3', target: 'node4' },
];

export default function GraphCanvas() {
  // 최대 step_order 계산
  const maxStep = Math.max(...MOCK_NODES.map((n) => n.step_order));

  const handleNodePress = (id: string) => {
    // TODO: 노드 상세 정보 표시
  };

  // 줌/패닝 상태
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // 제스처 이전 상태 저장
  const prevScale = useSharedValue(1);
  const prevTranslateX = useSharedValue(0);
  const prevTranslateY = useSharedValue(0);

  // 핀치 제스처
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      prevScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(prevScale.value * event.scale, 3));
    });

  // 패닝 제스처
  const panGesture = Gesture.Pan()
    .onStart(() => {
      prevTranslateX.value = translateX.value;
      prevTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = prevTranslateX.value + event.translationX;
      translateY.value = prevTranslateY.value + event.translationY;
    });

  // 동시 제스처 (핀치 + 팬)
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // 애니메이션 스타일
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // 엣지 좌표 계산 헬퍼
  const getEdgeCoordinates = (sourceId: string, targetId: string) => {
    const source = MOCK_NODES.find((n) => n.id === sourceId);
    const target = MOCK_NODES.find((n) => n.id === targetId);
    if (!source || !target) return null;
    return {
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
    };
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.canvas, animatedStyle]}>
          {/* 엣지 렌더링 (SVG) */}
          <Svg
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            style={styles.svgLayer}
          >
            {MOCK_EDGES.map((edge, index) => {
              const coords = getEdgeCoordinates(edge.source, edge.target);
              if (!coords) return null;
              return (
                <Line
                  key={`edge-${index}`}
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  stroke={Colors.text.dusk}
                  strokeWidth="2"
                />
              );
            })}
          </Svg>

          {/* 노드 렌더링 (NodeCircle 컴포넌트) */}
          {MOCK_NODES.map((node) => (
            <View
              key={node.id}
              style={[
                styles.nodeWrapper,
                {
                  left: node.x,
                  top: node.y,
                },
              ]}
            >
              <NodeCircle
                id={node.id}
                title={node.title}
                domain={node.domain}
                is_root={node.is_root}
                step_order={node.step_order}
                isCurrentLeaf={node.step_order === maxStep && !node.is_root}
                onPress={handleNodePress}
              />
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.void,
  },
  canvas: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
});
