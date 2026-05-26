import React from "react";
import { Dimensions } from "react-native";
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Circle,
} from "react-native-svg";

const { width, height } = Dimensions.get("window");

const stars = [
  { cx: 45, cy: 120, r: 1.2 },
  { cx: 180, cy: 60, r: 0.8 },
  { cx: 320, cy: 90, r: 1.5 },
  { cx: 80, cy: 280, r: 1.0 },
  { cx: 260, cy: 200, r: 0.7 },
  { cx: 350, cy: 320, r: 1.3 },
  { cx: 30, cy: 450, r: 0.9 },
  { cx: 200, cy: 380, r: 1.1 },
  { cx: 370, cy: 500, r: 0.6 },
  { cx: 120, cy: 600, r: 1.4 },
  { cx: 290, cy: 550, r: 0.8 },
  { cx: 60, cy: 700, r: 1.2 },
  { cx: 340, cy: 680, r: 1.0 },
  { cx: 160, cy: 750, r: 0.7 },
  { cx: 240, cy: 820, r: 1.3 },
  { cx: 50, cy: 880, r: 0.9 },
  { cx: 310, cy: 900, r: 1.1 },
  { cx: 140, cy: 950, r: 0.6 },
  { cx: 380, cy: 150, r: 1.0 },
  { cx: 100, cy: 180, r: 0.8 },
  { cx: 220, cy: 480, r: 1.2 },
  { cx: 360, cy: 760, r: 0.7 },
  { cx: 75, cy: 350, r: 1.5 },
  { cx: 280, cy: 720, r: 1.0 },
  { cx: 175, cy: 130, r: 0.9 },
  { cx: 330, cy: 420, r: 1.1 },
];

export default function StarBackground() {
  return (
    <Svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <Defs>
        {/* 메인 배경 그라디언트 — 딥 네이비 */}
        <RadialGradient id="bgGrad" cx="70%" cy="45%" r="65%">
          <Stop offset="0%" stopColor="#2D2680" stopOpacity="1" />
          <Stop offset="45%" stopColor="#1A1650" stopOpacity="1" />
          <Stop offset="100%" stopColor="#080714" stopOpacity="1" />
        </RadialGradient>
        {/* 보조 빛 — 오른쪽 중앙 */}
        <RadialGradient id="glowGrad" cx="75%" cy="42%" r="40%">
          <Stop offset="0%" stopColor="#5B52CC" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#5B52CC" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* 배경 */}
      <Rect x="0" y="0" width={width} height={height} fill="url(#bgGrad)" />
      {/* 빛 오버레이 */}
      <Rect x="0" y="0" width={width} height={height} fill="url(#glowGrad)" />

      {/* 별 */}
      {stars.map((star, i) => (
        <Circle
          key={i}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill="#FFFFFF"
          opacity={0.3 + Math.random() * 0.5}
        />
      ))}
    </Svg>
  );
}
