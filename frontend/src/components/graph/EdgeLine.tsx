import React from 'react';
import { Line, Path } from 'react-native-svg';
import { Colors } from '../../constants/colors';

interface EdgeLineProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export default function EdgeLine({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeLineProps) {
  // 화살표 방향 계산 (노드 반지름만큼 떨어진 지점에서 시작/끝)
  const nodeRadius = 28; // NodeCircle 크기의 절반 (48/2 = 24) + 여유공간
  const arrowSize = 10; // 화살표 크기

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // 단위 벡터
  const unitX = dx / length;
  const unitY = dy / length;

  // 노드 경계에서 시작/끝
  const startX = sourceX + unitX * nodeRadius;
  const startY = sourceY + unitY * nodeRadius;
  const endX = targetX - unitX * (nodeRadius + arrowSize);
  const endY = targetY - unitY * (nodeRadius + arrowSize);

  // 화살표 삼각형 좌표 계산
  const arrowTipX = targetX - unitX * nodeRadius;
  const arrowTipY = targetY - unitY * nodeRadius;

  // 화살표의 좌우 날개 (수직 벡터 활용)
  const perpX = -unitY;
  const perpY = unitX;

  const arrowBase1X = arrowTipX - unitX * arrowSize + perpX * (arrowSize * 0.6);
  const arrowBase1Y = arrowTipY - unitY * arrowSize + perpY * (arrowSize * 0.6);
  const arrowBase2X = arrowTipX - unitX * arrowSize - perpX * (arrowSize * 0.6);
  const arrowBase2Y = arrowTipY - unitY * arrowSize - perpY * (arrowSize * 0.6);

  return (
    <>
      {/* 엣지 라인 - 외곽선 (glow 효과) */}
      <Line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={Colors.accent.pulsar}
        strokeWidth="3"
        opacity={0.15}
      />
      {/* 엣지 라인 - 메인 */}
      <Line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={Colors.background.comet}
        strokeWidth="2"
        opacity={0.7}
      />
      {/* 화살표 삼각형 - 외곽 glow */}
      <Path
        d={`M ${arrowTipX},${arrowTipY} L ${arrowBase1X},${arrowBase1Y} L ${arrowBase2X},${arrowBase2Y} Z`}
        fill={Colors.accent.pulsar}
        opacity={0.3}
      />
      {/* 화살표 삼각형 - 메인 */}
      <Path
        d={`M ${arrowTipX},${arrowTipY} L ${arrowBase1X},${arrowBase1Y} L ${arrowBase2X},${arrowBase2Y} Z`}
        fill={Colors.accent.pulsar}
        opacity={0.8}
      />
    </>
  );
}
