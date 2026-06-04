import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomSheet from "./BottomSheet";
import { Node, Domain } from "../../types";
import { Colors } from "../../constants/colors";

const DOMAIN_LABEL: Record<Domain, string> = {
  movie: "영화",
  book: "도서",
  music: "음악",
};

const DOMAIN_COLOR: Record<Domain, string> = {
  movie: Colors.domain.movie,
  book: Colors.domain.book,
  music: Colors.domain.music,
};

export interface NodeDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  node: Node | null;
  nodeStatus?: 'confirmed' | 'pending'; // 노드 상태
  onContinueObsession?: () => void; // [과몰입 계속하기] 콜백 (confirmed)
  onAddToJourney?: () => void; // [여정에 추가] 콜백 (pending)
  isPendingMode?: boolean; // 추천 선택 중 모드 여부
  onPendingWarning?: (onConfirm: () => void) => void; // pending 모드 경고 콜백
}

export default function NodeDetailSheet({
  visible,
  onClose,
  node,
  nodeStatus = 'confirmed',
  onContinueObsession,
  onAddToJourney,
  isPendingMode = false,
  onPendingWarning,
}: NodeDetailSheetProps) {
  const [detailVisible, setDetailVisible] = useState(false);

  if (!node) return null;

  const domainColor = DOMAIN_COLOR[node.domain];
  const isPending = nodeStatus === 'pending';

  // 크리에이터 · 연도 (도메인별 분기)
  const getCreator = (n: Node): string => {
    const meta = n.metadata as Record<string, unknown>;
    if (n.domain === "movie") return (meta?.director as string) ?? "";
    if (n.domain === "book") return (meta?.author as string) ?? "";
    if (n.domain === "music") return (meta?.artist as string) ?? "";
    return "";
  };

  const creator = getCreator(node);
  const meta = node.metadata as Record<string, unknown>;
  const year = meta?.year as string | number | undefined;

  const creatorYearParts: string[] = [];
  if (node.domain === "movie") {
    if (creator) creatorYearParts.push(creator);
    if (year) creatorYearParts.push(String(year));
  } else if (node.domain === "music") {
    if (creator) creatorYearParts.push(creator);
  } else if (node.domain === "book") {
    if (creator) creatorYearParts.push(creator);
    if (year) creatorYearParts.push(String(year));
  }
  const creatorYearText = creatorYearParts.join(" · ");

  // 장르 태그 (영화만)
  const genres = node.domain === "movie" ? (meta?.genres as string[] | undefined) : undefined;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 이미지 */}
        {node.image_url ? (
          <Image
            source={{ uri: node.image_url }}
            style={styles.sheetImage}
            resizeMode="cover"
          />
        ) : null}

        {/* 도메인 배지 */}
        <View style={[styles.sheetDomainBadge, { backgroundColor: domainColor }]}>
          <Text style={styles.sheetDomainBadgeText}>{DOMAIN_LABEL[node.domain]}</Text>
        </View>

        {/* 제목 */}
        <Text style={styles.title}>{node.title}</Text>

        {/* 감정 태그 */}
        {node.emotion_tags.length > 0 && (
          <View style={styles.sheetTagRow}>
            {node.emotion_tags.map((tag, idx) => (
              <View key={idx} style={styles.sheetTag}>
                <Text style={styles.sheetTagText}>
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 구분선 */}
        <View style={styles.sheetDivider} />

        {/* 버튼 영역 - 상세 보기 + 주요 액션 */}
        <View style={styles.buttonRow}>
          {/* 상세 보기 버튼 */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setDetailVisible(true)}
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
              style={[
                styles.primaryButton,
                isPendingMode && { opacity: 0.4 }
              ]}
              onPress={() => {
                if (isPendingMode && onPendingWarning && onContinueObsession) {
                  onPendingWarning(() => onContinueObsession());
                  return;
                }
                if (onContinueObsession) {
                  onContinueObsession();
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>과몰입 계속하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 상세보기 모달 */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailVisible(false)}
      >
        <Pressable
          style={styles.detailOverlay}
          onPress={() => setDetailVisible(false)}
        >
          <Pressable
            style={styles.detailSheet}
            onPress={(e) => e.stopPropagation()}
          >
            {/* 이미지 */}
            {node.image_url ? (
              <Image
                source={{ uri: node.image_url }}
                style={styles.detailImage}
                resizeMode="cover"
              />
            ) : null}

            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={styles.detailCloseBtn}
              onPress={() => setDetailVisible(false)}
            >
              <Text style={styles.detailCloseBtnText}>✕</Text>
            </TouchableOpacity>

            {/* 도메인 배지 */}
            <View
              style={[
                styles.detailBadge,
                { backgroundColor: domainColor },
              ]}
            >
              <Text style={styles.detailBadgeText}>
                {DOMAIN_LABEL[node.domain]}
              </Text>
            </View>

            {/* 제목 */}
            <Text style={styles.detailTitle}>{node.title}</Text>

            {/* 크리에이터 · 연도 */}
            {creatorYearText ? (
              <Text style={styles.detailCreatorText}>{creatorYearText}</Text>
            ) : null}

            {/* 구분선 */}
            <View style={styles.detailDivider} />

            {/* 설명 */}
            {node.description ? (
              <View style={styles.detailDescBox}>
                <Text style={styles.detailDesc}>{node.description}</Text>
              </View>
            ) : null}

            {/* 감정 태그 */}
            {node.emotion_tags && node.emotion_tags.length > 0 && (
              <View style={styles.detailTagRow}>
                {node.emotion_tags.map((tag, i) => (
                  <View key={i} style={styles.detailTag}>
                    <Text style={styles.detailTagText}>
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* 장르 태그 (영화만) */}
            {genres && genres.length > 0 && (
              <View style={styles.detailTagRow}>
                {genres.map((g, i) => (
                  <View key={i} style={styles.detailGenreTag}>
                    <Text style={styles.detailGenreTagText}>{g}</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 16,
  },
  sheetImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  sheetDomainBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  sheetDomainBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text.starlight,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.starlight,
    lineHeight: 25,
    marginBottom: 12,
  },
  sheetTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  sheetTag: {
    backgroundColor: Colors.accent.orbit,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sheetTagText: {
    fontSize: 12,
    color: Colors.text.starlight,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Colors.background.comet,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.background.comet,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.moonmist,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.accent.nebulaRose,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.starlight,
  },
  // 상세보기 모달 스타일
  detailOverlay: {
    flex: 1,
    backgroundColor: Colors.background.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailSheet: {
    width: "100%",
    backgroundColor: Colors.background.nebulaBase,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "80%",
  },
  detailImage: {
    width: "100%",
    height: 180,
  },
  detailCloseBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: Colors.background.overlayLight,
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCloseBtnText: {
    color: Colors.text.starlight,
    fontSize: 14,
  },
  detailBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    margin: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  detailBadgeText: {
    color: Colors.text.starlight,
    fontSize: 12,
    fontWeight: "600",
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text.starlight,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  detailCreatorText: {
    fontSize: 13,
    color: Colors.text.moonmist,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  detailDateText: {
    fontSize: 12,
    color: Colors.text.dusk,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.background.comet,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  detailDescBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.background.dust,
    borderRadius: 12,
    padding: 14,
  },
  detailDesc: {
    fontSize: 14,
    color: Colors.text.moonmist,
    lineHeight: 22,
  },
  detailTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  detailTag: {
    backgroundColor: Colors.accent.orbit,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  detailTagText: {
    color: Colors.text.starlight,
    fontSize: 12,
  },
  detailGenreTag: {
    backgroundColor: Colors.background.dust,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  detailGenreTagText: {
    color: Colors.text.moonmist,
    fontSize: 12,
  },
});
