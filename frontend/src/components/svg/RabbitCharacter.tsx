import React from "react";
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Ellipse,
  Circle,
  Path,
} from "react-native-svg";

export default function RabbitCharacter({ size = 260 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 260 260">
      <Defs>
        {/* 몸통 그라디언트 */}
        <RadialGradient id="bodyGrad" cx="45%" cy="40%" r="60%">
          <Stop offset="0%" stopColor="#A78BFA" stopOpacity="1" />
          <Stop offset="50%" stopColor="#7C5FCF" stopOpacity="1" />
          <Stop offset="100%" stopColor="#EC6FA0" stopOpacity="1" />
        </RadialGradient>
        {/* 귀 그라디언트 */}
        <RadialGradient id="earGrad" cx="40%" cy="30%" r="65%">
          <Stop offset="0%" stopColor="#C4B5FD" stopOpacity="1" />
          <Stop offset="100%" stopColor="#DB6FA8" stopOpacity="1" />
        </RadialGradient>
        {/* 글로우 */}
        <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#9B6FD4" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#9B6FD4" stopOpacity="0" />
        </RadialGradient>
        {/* 치마 그라디언트 */}
        <RadialGradient id="skirtGrad" cx="50%" cy="20%" r="70%">
          <Stop offset="0%" stopColor="#C084FC" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#F472B6" stopOpacity="0.8" />
        </RadialGradient>
      </Defs>

      {/* 글로우 후광 */}
      <Ellipse cx="130" cy="145" rx="85" ry="90" fill="url(#glowGrad)" />

      {/* 왼쪽 귀 */}
      <Ellipse
        cx="95"
        cy="62"
        rx="22"
        ry="48"
        fill="url(#earGrad)"
        opacity="0.95"
        rotation="-15"
        originX="95"
        originY="62"
      />
      {/* 오른쪽 귀 */}
      <Ellipse
        cx="158"
        cy="55"
        rx="20"
        ry="46"
        fill="url(#earGrad)"
        opacity="0.95"
        rotation="10"
        originX="158"
        originY="55"
      />

      {/* 몸통 */}
      <Ellipse cx="130" cy="145" rx="62" ry="68" fill="url(#bodyGrad)" />

      {/* 치마 (하단 퍼지는 부분) */}
      <Path
        d="M68 175 Q80 230 130 240 Q180 230 192 175 Q165 210 130 212 Q95 210 68 175Z"
        fill="url(#skirtGrad)"
        opacity="0.9"
      />
      {/* 치마 레이어 2 */}
      <Path
        d="M75 185 Q85 235 130 245 Q175 235 185 185 Q160 218 130 220 Q100 218 75 185Z"
        fill="#F472B6"
        opacity="0.5"
      />

      {/* 머리 */}
      <Ellipse cx="130" cy="108" rx="48" ry="46" fill="url(#bodyGrad)" />

      {/* 볼 (왼) */}
      <Ellipse cx="102" cy="118" rx="14" ry="10" fill="#F472B6" opacity="0.6" />
      {/* 볼 (오) */}
      <Ellipse cx="158" cy="118" rx="14" ry="10" fill="#F472B6" opacity="0.6" />

      {/* 눈 흰자 (왼) */}
      <Ellipse cx="114" cy="108" rx="9" ry="10" fill="white" />
      {/* 눈 흰자 (오) */}
      <Ellipse cx="146" cy="108" rx="9" ry="10" fill="white" />

      {/* 눈동자 (왼) */}
      <Circle cx="115" cy="109" r="5" fill="#1A0A2E" />
      {/* 눈동자 (오) */}
      <Circle cx="147" cy="109" r="5" fill="#1A0A2E" />

      {/* 눈 하이라이트 (왼) */}
      <Circle cx="117" cy="106" r="2" fill="white" />
      {/* 눈 하이라이트 (오) */}
      <Circle cx="149" cy="106" r="2" fill="white" />

      {/* 미소 */}
      <Path
        d="M122 122 Q130 129 138 122"
        stroke="white"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* 주변 빛 파티클 */}
      <Circle cx="58" cy="130" r="3" fill="white" opacity="0.8" />
      <Circle cx="52" cy="148" r="1.5" fill="white" opacity="0.6" />
      <Circle cx="62" cy="162" r="2" fill="white" opacity="0.7" />
      <Circle cx="200" cy="125" r="2.5" fill="white" opacity="0.8" />
      <Circle cx="207" cy="145" r="1.5" fill="white" opacity="0.6" />
      <Circle cx="198" cy="160" r="2" fill="white" opacity="0.7" />
    </Svg>
  );
}
