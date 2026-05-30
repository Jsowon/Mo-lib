import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomSheet from "./BottomSheet";
import { Node, Domain } from "../../types";

const DOMAIN_LABEL: Record<Domain, string> = {
  movie: "영화",
  book: "책",
  music: "음악",
};

const DOMAIN_COLOR: Record<Domain, string> = {
  movie: "#E05C6E",
  book: "#5CA8E0",
  music: "#7C5CE0",
};

export interface NodeDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  node: Node | null;
  nodeStatus?: 'confirmed' | 'pending'; // 노드 상태
  onContinueObsession?: () => void; // [과몰입 계속하기] 콜백 (confirmed)
  onAddToJourney?: () => void; // [여정에 추가] 콜백 (pending)
}

export default function NodeDetailSheet({
  visible,
  onClose,
  node,
  nodeStatus = 'confirmed',
  onContinueObsession,
  onAddToJourney,
}: NodeDetailSheetProps) {
  if (!node) return null;

  const domainColor = DOMAIN_COLOR[node.domain];
  const isPending = nodeStatus === 'pending';

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 도메인 배지 */}
        <Text style={[styles.domainBadge, { color: domainColor }]}>
          {DOMAIN_LABEL[node.domain]}
        </Text>

        {/* 썸네일 + 제목 */}
        <View style={styles.headerRow}>
          <View style={styles.thumbnailContainer}>
            {node.image_url ? (
              <Image
                source={{ uri: node.image_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.thumbnail,
                  { backgroundColor: domainColor + "33" },
                ]}
              />
            )}
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>{node.title}</Text>
          </View>
        </View>

        {/* 감정 태그 */}
        {node.emotion_tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionLabel}>감정 태그</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsRow}
            >
              {node.emotion_tags.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 설명 */}
        {node.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionLabel}>설명</Text>
            <Text style={styles.description}>{node.description}</Text>
          </View>
        )}

        {/* 버튼 영역 - 상세 보기 + 주요 액션 */}
        <View style={styles.buttonRow}>
          {/* 상세 보기 버튼 (TODO: 향후 외부 링크 또는 상세 정보 화면으로 이동) */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Alert.alert("준비 중", "상세 보기 기능은 곧 제공될 예정입니다.")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>상세 보기</Text>
          </TouchableOpacity>

          {/* 주요 액션 버튼 - 노드 상태에 따라 분기 */}
          {isPending ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onAddToJourney}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>여정에 추가</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onContinueObsession}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>과몰입 계속하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 16,
  },
  domainBadge: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: 80,
    height: 110,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 25,
  },
  tagsSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8899BB",
    marginBottom: 8,
  },
  tagsRow: {
    gap: 8,
  },
  tagChip: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: "#D97BA0",
  },
  descriptionSection: {
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: "#C5CDE0",
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#1E293B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#8899BB",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#C084A0",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
