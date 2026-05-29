import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../components/common/Header";
import { useArchiveStore } from "../store/archiveStore";
import { Domain, Node } from "../types";

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

// ── 타임라인 카드 ─────────────────────────────────────────────────────────────
// TODO (파트B): onPress → BottomSheet 오픈, 숨김 기능 연결
function ArchiveCard({
  node,
  mapTitle,
  isFirst,
  isLast,
}: {
  node: Node;
  mapTitle: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const dotColor = DOMAIN_COLORS[node.domain];

  return (
    <TouchableOpacity activeOpacity={0.75} style={styles.cardRow}>
      {/* 타임라인 세로선 + dot */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineLine, isFirst && styles.invisible]} />
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        <View style={[styles.timelineLine, isLast && styles.invisible]} />
      </View>

      {/* 카드 */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          {/* 지도명 배지 */}
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText} numberOfLines={1}>
              {mapTitle}
            </Text>
          </View>
          {/* 날짜 */}
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
  } = useArchiveStore();

  // map_id → 지도 제목 조회용 맵
  const mapLookup = useMemo(
    () => maps.reduce<Record<string, string>>((acc, m) => ({ ...acc, [m.id]: m.title }), {}),
    [maps]
  );

  // 탭 포커스될 때마다 최신 데이터 로드
  useFocusEffect(
    useCallback(() => {
      fetchMaps();
      fetchArchive();
    }, [fetchMaps, fetchArchive])
  );

  return (
    <View style={styles.container}>
      <Header />

      {/* 지도별 필터 pill */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
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
          onEndReached={() => {
            if (hasMore) fetchMore();
          }}
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
              mapTitle={mapLookup[item.map_id] ?? "지도"}
              isFirst={index === 0}
              isLast={index === nodes.length - 1}
            />
          )}
        />
      )}
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },

  // 필터
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
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

  // 타임라인
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

  // 카드
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
    backgroundColor: "rgba(192, 132, 160, 0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: "55%",
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97BA0",
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

  // 상태
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
