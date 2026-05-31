import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors } from '../../constants/colors';

interface NodeCircleProps {
  id: string;
  title: string;
  domain: 'movie' | 'music' | 'book';
  is_root: boolean;
  step_order: number;
  isCurrentLeaf: boolean; // step_order가 최대값인 리프 노드 여부
  isPending?: boolean; // pending 노드 여부 (기본값: false)
  onPress: (id: string) => void;
}

const DOMAIN_ICONS: Record<'movie' | 'music' | 'book', string> = {
  movie: '▶',
  music: '♪',
  book: '📖',
};

const DOMAIN_COLORS: Record<'movie' | 'music' | 'book', string> = {
  movie: '#E05C6E',
  book: '#5CA8E0',
  music: '#7C5CE0',
};

export default function NodeCircle({
  id,
  title,
  domain,
  is_root,
  isCurrentLeaf,
  isPending = false,
  onPress,
}: NodeCircleProps) {
  console.log('[NodeCircle] render', id, title, 'is_root:', is_root, 'isPending:', isPending);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 루트 노드 회전 애니메이션
  useEffect(() => {
    if (is_root) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [is_root, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // 노드 크기 결정 (pending 노드는 항상 48px)
  const nodeSize = isPending ? 48 : (is_root || isCurrentLeaf ? 56 : 48);

  // 노드 스타일 결정
  const getNodeStyle = () => {
    const domainColor = DOMAIN_COLORS[domain];

    if (is_root) {
      return {
        width: nodeSize,
        height: nodeSize,
        borderRadius: nodeSize / 2,
        backgroundColor: Colors.accent.orbit,
        borderWidth: 2,
        borderColor: Colors.accent.pulsar,
      };
    }
    if (isCurrentLeaf) {
      return {
        width: nodeSize,
        height: nodeSize,
        borderRadius: nodeSize / 2,
        backgroundColor: Colors.accent.nebulaRose,
      };
    }
    // pending 노드: domain별 색상 (opacity는 MapCanvas에서 처리)
    if (isPending) {
      return {
        width: nodeSize,
        height: nodeSize,
        borderRadius: nodeSize / 2,
        backgroundColor: domainColor,
      };
    }
    // confirmed 일반 노드: 기존 회색
    return {
      width: nodeSize,
      height: nodeSize,
      borderRadius: nodeSize / 2,
      backgroundColor: Colors.background.dust,
      borderWidth: 1,
      borderColor: Colors.background.comet,
    };
  };

  // 부제 텍스트
  const getSubtitle = () => {
    if (is_root) return '여정의 시작';
    if (isCurrentLeaf) return '현재 과몰입 중';
    return null;
  };

  const subtitle = getSubtitle();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={styles.nodeWrapper}>
        {/* 루트 노드 - 회전하는 점선 링 */}
        {is_root && (
          <Animated.View
            style={[
              styles.rotatingRing,
              {
                width: nodeSize + 16,
                height: nodeSize + 16,
                borderRadius: (nodeSize + 16) / 2,
                transform: [{ rotate: rotation }],
              },
            ]}
          />
        )}

        {/* 현재 진행 중 노드 - 글로우 링 효과 */}
        {isCurrentLeaf && (
          <>
            <View
              style={[
                styles.glowRing,
                {
                  width: nodeSize + 20,
                  height: nodeSize + 20,
                  borderRadius: (nodeSize + 20) / 2,
                  backgroundColor: Colors.accent.nebulaRose,
                  opacity: 0.2,
                },
              ]}
            />
            <View
              style={[
                styles.glowRing,
                {
                  width: nodeSize + 12,
                  height: nodeSize + 12,
                  borderRadius: (nodeSize + 12) / 2,
                  backgroundColor: Colors.accent.nebulaRose,
                  opacity: 0.4,
                },
              ]}
            />
          </>
        )}

        {/* 노드 본체 */}
        <View style={[styles.node, getNodeStyle()]}>
          <Text style={styles.icon}>{DOMAIN_ICONS[domain]}</Text>
        </View>
      </View>

      {/* 하단 텍스트 */}
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              isCurrentLeaf && { color: Colors.accent.nebulaRose },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    color: Colors.text.starlight,
  },
  rotatingRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.accent.pulsar,
    borderStyle: 'dashed',
  },
  glowRing: {
    position: 'absolute',
  },
  textContainer: {
    marginTop: 8,
    alignItems: 'center',
    maxWidth: 80,
  },
  title: {
    fontSize: 11,
    color: Colors.text.starlight,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 9,
    color: Colors.text.moonmist,
    textAlign: 'center',
    marginTop: 2,
  },
});
