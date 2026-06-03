import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import Header from "../components/common/Header";
import { useArchiveStore } from "../store/archiveStore";
import { Domain, Node } from "../types";
import { RootTabParamList } from "../navigation/types";
import { Colors } from "../constants/colors";

type ArchiveNavProp = BottomTabNavigationProp<RootTabParamList>;

// ── 상수 ──────────────────────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<Domain, string> = {
  movie: Colors.domain.movie,
  book: Colors.domain.book,
  music: Colors.domain.music,
};

const DOMAIN_LABELS: Record<Domain, string> = {
  movie: "영화",
  book: "도서",
  music: "음악",
};

const DOMAIN_FILTER_OPTIONS: { label: string; value: Domain | null }[] = [
  { label: "전체", value: null },
  { label: "영화", value: "movie" },
  { label: "도서", value: "book" },
  { label: "음악", value: "music" },
];

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function getCreator(node: Node): string {
  const meta = node.metadata as Record<string, unknown>;
  if (node.domain === "movie") return (meta?.director as string) ?? "";
  if (node.domain === "book") return (meta?.author as string) ?? "";
  if (node.domain === "music") return (meta?.artist as string) ?? "";
  return "";
}

// ── 아카이브 상세 BottomSheet ─────────────────────────────────────────────────
function ArchiveDetailSheet({
  node,
  mapTitle,
  visible,
  onClose,
  onNavigateToMap,
  onUnarchive,
}: {
  node: Node | null;
  mapTitle: string;
  visible: boolean;
  onClose: () => void;
  onNavigateToMap: () => void;
  onUnarchive: () => void;
}) {
  if (!node) return null;

  const creator = getCreator(node);
  const meta = node.metadata as Record<string, unknown>;
  const year = meta?.year as string | number | undefined;

  // 크리에이터 · 연도 구성 (도메인별 분기)
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={() => {}}>
          {/* 이미지 */}
          {node.image_url ? (
            <Image
              source={{ uri: node.image_url }}
              style={sheetStyles.thumbnail}
              resizeMode="cover"
            />
          ) : null}

          {/* 닫기 버튼 */}
          <TouchableOpacity onPress={onClose} style={sheetStyles.closeBtn}>
            <Text style={sheetStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* 배지 행 */}
          <View style={sheetStyles.badgeRow}>
            <View style={sheetStyles.mapBadge}>
              <Text style={sheetStyles.mapBadgeText} numberOfLines={1}>
                {mapTitle}
              </Text>
            </View>
            <View style={[sheetStyles.domainBadge, { backgroundColor: DOMAIN_COLORS[node.domain] }]}>
              <Text style={sheetStyles.domainBadgeText}>{DOMAIN_LABELS[node.domain]}</Text>
            </View>
          </View>

          {/* 제목 */}
          <Text style={sheetStyles.title}>{node.title}</Text>

          {/* 크리에이터 · 연도 */}
          {creatorYearText ? (
            <Text style={sheetStyles.creatorText}>{creatorYearText}</Text>
          ) : null}

          {/* 저장한 날짜 */}
          <Text style={sheetStyles.dateText}>{formatDate(node.created_at)}</Text>

          <View style={sheetStyles.divider} />

          {/* 설명 */}
          {node.description ? (
            <View style={sheetStyles.descBox}>
              <Text style={sheetStyles.descText}>{node.description}</Text>
            </View>
          ) : null}

          {/* 감정 태그 */}
          {node.emotion_tags && node.emotion_tags.length > 0 ? (
            <View style={sheetStyles.tagRow}>
              {node.emotion_tags.map((tag, i) => (
                <View key={i} style={sheetStyles.tag}>
                  <Text style={sheetStyles.tagText}>
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* 장르 태그 (영화만) */}
          {genres && genres.length > 0 ? (
            <View style={sheetStyles.tagRow}>
              {genres.map((g, i) => (
                <View key={i} style={sheetStyles.genreTag}>
                  <Text style={sheetStyles.genreTagText}>{g}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={sheetStyles.divider} />

          {/* 여정 지도로 이동 */}
          <TouchableOpacity style={sheetStyles.navBtn} onPress={onNavigateToMap}>
            <Text style={sheetStyles.navBtnText}>해당 여정지도로 이동</Text>
          </TouchableOpacity>

          {/* 아카이브 해제 */}
          <TouchableOpacity style={sheetStyles.unarchiveBtn} onPress={onUnarchive}>
            <Text style={sheetStyles.unarchiveBtnText}>아카이브 해제</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── 타임라인 카드 ─────────────────────────────────────────────────────────────
function ArchiveCard({
  node,
  mapTitle,
  isFirst,
  isLast,
  onPress,
}: {
  node: Node;
  mapTitle: string;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const dotColor = DOMAIN_COLORS[node.domain];

  return (
    <TouchableOpacity activeOpacity={0.75} style={styles.cardRow} onPress={onPress}>
      {/* 타임라인 세로선 + dot */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineLine, isFirst && styles.invisible]} />
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        <View style={[styles.timelineLine, isLast && styles.invisible]} />
      </View>

      {/* 카드 */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText} numberOfLines={1}>
              {mapTitle}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(node.created_at)}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {node.title}
        </Text>
        <Text style={styles.cardDomain}>{DOMAIN_LABELS[node.domain]}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────────────────────────
export default function ArchiveScreen() {
  const navigation = useNavigation<ArchiveNavProp>();

  const {
    selectedMapId,
    selectedDomain,
    maps,
    nodes,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchError,
    fetchMaps,
    fetchArchive,
    fetchMore,
    setMapFilter,
    setDomainFilter,
    unarchiveNode,
  } = useArchiveStore();

  const [sheetNode, setSheetNode] = useState<Node | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const mapLookup = useMemo(
    () => maps.reduce<Record<string, string>>((acc, m) => ({ ...acc, [m.id]: m.title }), {}),
    [maps]
  );

  useFocusEffect(
    useCallback(() => {
      fetchMaps();
      fetchArchive();
    }, [fetchMaps, fetchArchive])
  );

  const handleCardPress = (node: Node) => {
    setSheetNode(node);
    setSheetVisible(true);
  };

  const handleNavigateToMap = () => {
    if (!sheetNode) return;
    setSheetVisible(false);
    navigation.navigate("Map", { mapId: sheetNode.map_id });
  };

  const handleUnarchive = async () => {
    if (!sheetNode) return;
    setSheetVisible(false);
    await unarchiveNode(sheetNode.map_id, sheetNode.id);
  };

  return (
    <View style={styles.container}>
      <Header />

      {/* 지도별 필터 pill */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ flexGrow: 0, flexShrink: 0 }}
      >
        <TouchableOpacity
          style={[styles.pill, selectedMapId === null && styles.pillActive]}
          onPress={() => setMapFilter(null)}
        >
          <Text style={[styles.pillText, selectedMapId === null && styles.pillTextActive]}>
            전체
          </Text>
        </TouchableOpacity>
        {maps.map((map) => (
          <TouchableOpacity
            key={map.id}
            style={[styles.pill, selectedMapId === map.id && styles.pillActive]}
            onPress={() => setMapFilter(map.id)}
          >
            <Text style={[styles.pillText, selectedMapId === map.id && styles.pillTextActive]}>
              {map.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 도메인별 필터 pill */}
      <View style={styles.domainFilterRow}>
        {DOMAIN_FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[styles.pill, selectedDomain === opt.value && styles.pillActive]}
            onPress={() => setDomainFilter(opt.value)}
          >
            <Text style={[styles.pillText, selectedDomain === opt.value && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 타임라인 리스트 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent.primary} />
        </View>
      ) : (
        <FlatList
          data={nodes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={() => { if (hasMore) fetchMore(); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {fetchError ? "불러오기 실패" : "아카이브가 비어있어요"}
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator color={Colors.accent.primary} style={styles.footerSpinner} />
            ) : null
          }
          renderItem={({ item, index }) => (
            <ArchiveCard
              node={item}
              mapTitle={item.map_title ?? mapLookup[item.map_id] ?? "지도"}
              isFirst={index === 0}
              isLast={index === nodes.length - 1}
              onPress={() => handleCardPress(item)}
            />
          )}
        />
      )}

      {/* 아카이브 상세 BottomSheet */}
      <ArchiveDetailSheet
        node={sheetNode}
        mapTitle={sheetNode ? (sheetNode.map_title ?? mapLookup[sheetNode.map_id] ?? "지도") : ""}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onNavigateToMap={handleNavigateToMap}
        onUnarchive={handleUnarchive}
      />
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.void,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  domainFilterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background.card,
  },
  pillActive: {
    backgroundColor: Colors.accent.primary,
  },
  pillText: {
    fontSize: 13,
    color: Colors.text.moonmist,
    fontWeight: "600",
  },
  pillTextActive: {
    color: Colors.text.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  timelineCol: {
    width: 24,
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.ui.hover,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginVertical: 4,
  },
  invisible: {
    opacity: 0,
  },
  card: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 12,
    backgroundColor: Colors.background.modal,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  mapBadge: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: "55%",
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  dateText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text.primary,
    lineHeight: 24,
  },
  cardDomain: {
    fontSize: 13,
    color: Colors.text.moonmist,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.muted,
  },
  footerSpinner: {
    marginVertical: 16,
  },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.background.overlay,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: Colors.background.nebulaBase,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 0,
    maxHeight: "80%",
  },
  thumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: Colors.text.dusk,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  mapBadge: {
    backgroundColor: Colors.accent.orbit,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mapBadgeText: {
    fontSize: 12,
    color: Colors.text.starlight,
  },
  domainBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  domainBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text.starlight,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text.starlight,
    marginBottom: 6,
  },
  creatorText: {
    fontSize: 13,
    color: Colors.text.moonmist,
    marginTop: 4,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.text.dusk,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background.comet,
    marginBottom: 12,
  },
  descBox: {
    backgroundColor: Colors.background.dust,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  descText: {
    fontSize: 14,
    color: Colors.text.moonmist,
    lineHeight: 22,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: Colors.accent.orbit,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    color: Colors.text.starlight,
  },
  genreTag: {
    backgroundColor: Colors.background.dust,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  genreTagText: {
    fontSize: 12,
    color: Colors.text.moonmist,
  },
  navBtn: {
    backgroundColor: Colors.accent.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  unarchiveBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.semantic.errorBorder,
    alignItems: "center",
  },
  unarchiveBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.semantic.errorBorder,
  },
});
