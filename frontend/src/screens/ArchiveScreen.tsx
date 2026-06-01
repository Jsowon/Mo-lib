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
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import Header from "../components/common/Header";
import { useArchiveStore } from "../store/archiveStore";
import { Domain, Node } from "../types";
import { RootTabParamList } from "../navigation/types";

type ArchiveNavProp = BottomTabNavigationProp<RootTabParamList>;

// ── 상수 ──────────────────────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<Domain, string> = {
  movie: "#E05C6E",
  book: "#5CA8E0",
  music: "#7C5CE0",
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

  const metaParts = [
    formatDate(node.created_at),
    creator,
    year ? String(year) : null,
    DOMAIN_LABELS[node.domain],
  ].filter(Boolean).join(" · ");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={() => {}}>
          {/* 핸들 */}
          <View style={sheetStyles.handle} />

          {/* 헤더 행: 지도 배지 + 닫기 */}
          <View style={sheetStyles.headerRow}>
            <View style={sheetStyles.mapBadge}>
              <Text style={sheetStyles.mapBadgeText} numberOfLines={1}>
                {mapTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sheetStyles.closeBtn}>
              <Text style={sheetStyles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 제목 */}
          <Text style={sheetStyles.title}>{node.title}</Text>

          {/* 메타 정보 */}
          <Text style={sheetStyles.meta}>{metaParts}</Text>

          <View style={sheetStyles.divider} />

          {/* 설명 */}
          {node.description ? (
            <>
              <Text style={sheetStyles.sectionLabel}>설명</Text>
              <View style={sheetStyles.descBox}>
                <Text style={sheetStyles.descText}>{node.description}</Text>
              </View>
            </>
          ) : null}

          {/* 감정 태그 */}
          {node.emotion_tags && node.emotion_tags.length > 0 ? (
            <View style={sheetStyles.tagsRow}>
              {node.emotion_tags.map((tag, i) => (
                <View key={i} style={sheetStyles.tag}>
                  <Text style={sheetStyles.tagText}>
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

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
          <ActivityIndicator size="large" color="#C084A0" />
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
              <ActivityIndicator color="#C084A0" style={styles.footerSpinner} />
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
    backgroundColor: "#0A0E1A",
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
    backgroundColor: "#1A1830",
  },
  pillActive: {
    backgroundColor: "#C084A0",
  },
  pillText: {
    fontSize: 13,
    color: "#AAAACC",
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#FFFFFF",
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
    backgroundColor: "#2A2845",
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
    backgroundColor: "#141B2D",
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
    backgroundColor: "#C084A0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: "55%",
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dateText: {
    fontSize: 12,
    color: "#555577",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  cardDomain: {
    fontSize: 13,
    color: "#AAAACC",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: "#555577",
  },
  footerSpinner: {
    marginVertical: 16,
  },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#151D30",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2A2845",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mapBadge: {
    backgroundColor: "#C084A0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    maxWidth: "70%",
  },
  mapBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: "#6B7A99",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: "#6B7A99",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#1E293B",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  descBox: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  descText: {
    fontSize: 14,
    color: "#CBD5E1",
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 13,
    color: "#A0AEC0",
    fontWeight: "600",
  },
  navBtn: {
    backgroundColor: "#C084A0",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  unarchiveBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E05C6E",
    alignItems: "center",
  },
  unarchiveBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#E05C6E",
  },
});
