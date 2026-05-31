import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { searchAPI, mapsAPI, nodesAPI } from "../api/endpoints";
import { ContentItem, Domain, SearchContentItem } from "../types";
import { HomeStackParamList, RootTabParamList } from "../navigation/types";

// ── 네비게이션 타입 ───────────────────────────────────────────────────────────
type RoutePropType = RouteProp<HomeStackParamList, "SearchResult">;
type NavPropType = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, "SearchResult">,
  BottomTabNavigationProp<RootTabParamList>
>;

// ── 상수 ─────────────────────────────────────────────────────────────────────
const DOMAIN_LABEL: Record<Domain, string> = {
  movie: "영화",
  book: "책",
  music: "음악",
};

const DOMAIN_PLACEHOLDER: Record<Domain, string> = {
  movie: "영화 다시 검색하기",
  book: "책 다시 검색하기",
  music: "음악 다시 검색하기",
};

const DOMAIN_COLOR: Record<Domain, string> = {
  movie: "#E05C6E",
  book: "#5CA8E0",
  music: "#7C5CE0",
};

// ── 헬퍼 함수 ─────────────────────────────────────────────────────────────────
function getGenreText(item: ContentItem): string {
  return item.metadata.genres?.join(" / ") ?? "";
}

function getCreator(item: ContentItem): string {
  if (item.domain === "movie") return item.metadata.director ?? "";
  if (item.domain === "book") return item.metadata.author ?? "";
  if (item.domain === "music") return item.metadata.artist ?? "";
  return "";
}

function buildMetaLine(item: ContentItem): { creator: string; year: string; country: string; rating: string } {
  return {
    creator: getCreator(item),
    year: item.year ? `${item.year}년` : "",
    country: item.country ?? "",
    rating: item.metadata.rating ? String(item.metadata.rating) : "",
  };
}

// ── 검색 결과 카드 ─────────────────────────────────────────────────────────────
function ContentCard({
  item,
  domain,
  onPress,
}: {
  item: ContentItem;
  domain: Domain;
  onPress: () => void;
}) {
  const genre = getGenreText(item);
  const { creator, year, country, rating } = buildMetaLine(item);
  const subtitle = item.metadata.original_title ?? "";
  const domainColor = DOMAIN_COLOR[domain];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* 썸네일 */}
      <View style={styles.thumbnail}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnailFallback, { backgroundColor: domainColor + "33" }]} />
        )}
      </View>

      {/* 정보 영역 */}
      <View style={styles.cardInfo}>
        {genre ? (
          <Text style={[styles.genre, { color: domainColor }]}>{genre}</Text>
        ) : null}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.metaList}>
          {creator ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaIcon}>♟ </Text>
              {creator}
            </Text>
          ) : null}
          {year ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaIcon}>⊞ </Text>
              {year}
            </Text>
          ) : null}
          {country ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaIcon}>◎ </Text>
              {country}
            </Text>
          ) : null}
          {rating ? (
            <Text style={styles.metaItem}>
              <Text style={styles.metaIconStar}>★ </Text>
              {rating}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────────────────────────
export default function SearchResultScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavPropType>();
  const insets = useSafeAreaInsets();

  const { domain, query } = route.params;
  const domainTyped = domain as Domain;
  const domainColor = DOMAIN_COLOR[domainTyped];

  const [searchText, setSearchText] = useState(query);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 동명 콘텐츠 선택 Modal
  const [modalItems, setModalItems] = useState<ContentItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // 지도 생성 + 노드 추가 로딩 상태
  const [isCreating, setIsCreating] = useState(false);

  // ── API 호출 ────────────────────────────────────────────────────────────────
  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setLoading(true);
      setError(null);
      try {
        // domain에 따라 다른 엔드포인트 호출
        let res;
        if (domain === 'movie') {
          res = await searchAPI.movie(q.trim());
        } else if (domain === 'music') {
          res = await searchAPI.music(q.trim());
        } else if (domain === 'book') {
          res = await searchAPI.book(q.trim());
        } else {
          throw new Error('지원하지 않는 도메인입니다.');
        }

        // SearchResponse → ContentItem[] 매핑
        const mapped: ContentItem[] = res.data.results.map((item: SearchContentItem) => ({
          external_id: '', // SearchContentItem에는 external_id 없음 (빈 문자열로 대체)
          domain: item.domain as Domain,
          title: item.title,
          description: item.description,
          image_url: item.thumbnail_url?.[0] || null,
          year: null,
          country: null,
          metadata: {
            genres: item.genre,
            director: item.domain === 'movie' ? item.creator : undefined,
            author: item.domain === 'book' ? item.creator : undefined,
            artist: item.domain === 'music' ? item.creator : undefined,
          },
        }));

        setResults(mapped);
        setTotal(res.data.total ?? 0);
      } catch {
        setError("검색 중 오류가 발생했어요. 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    },
    [domain]
  );

  useEffect(() => {
    search(query);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 아이템 탭 처리 ──────────────────────────────────────────────────────────
  const handleItemPress = (item: ContentItem) => {
    // 동일 제목이 2건 이상이면 선택 Modal 표시
    const duplicates = results.filter((r) => r.title === item.title);
    if (duplicates.length >= 2) {
      setModalItems(duplicates);
      setModalVisible(true);
    } else {
      createMapAndNode(item);
    }
  };

  const handleModalSelect = (item: ContentItem) => {
    setModalVisible(false);
    createMapAndNode(item);
  };

  // ── 지도 생성 + 루트노드 추가 플로우 ──────────────────────────────────────
  const createMapAndNode = async (item: ContentItem) => {
    setIsCreating(true);
    try {
      // 1. 지도 생성
      const mapRes = await mapsAPI.create({ title: item.title });
      const mapId = mapRes.data.id;

      // 2. 루트노드 추가
      await nodesAPI.add(mapId, {
        title: item.title,
        domain: item.domain,
        step_order: 0,
        is_root: true,
        description: item.description,
        image_url: item.image_url,
        external_id: item.external_id,
        emotion_tags: [],
        metadata: item.metadata as Record<string, unknown>,
      });

      // 3. Map 탭으로 이동
      navigation.navigate("Map", { mapId });
    } catch (err: any) {
      Alert.alert(
        "오류",
        err.message || "지도 생성 중 오류가 발생했어요. 다시 시도해 주세요."
      );
    } finally {
      setIsCreating(false);
    }
  };

  // ── 렌더 ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Image
            source={
              domainTyped === "movie"
                ? require("../../assets/icon-movie.png")
                : domainTyped === "book"
                ? require("../../assets/icon-book.png")
                : require("../../assets/icon-music.png")
            }
            style={styles.domainIcon}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle} numberOfLines={1}>
            "{query}" 검색 결과
          </Text>
        </View>
      </View>

      {/* 재검색 바 */}
      <View style={styles.searchBar}>
        <Image
          source={require("../../assets/icon-search.png")}
          style={styles.searchBarIcon}
          resizeMode="contain"
        />
        <TextInput
          style={styles.searchInput}
          placeholder={DOMAIN_PLACEHOLDER[domainTyped]}
          placeholderTextColor="#4A5568"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (searchText.trim()) search(searchText.trim());
          }}
        />
      </View>

      {/* 결과 수 */}
      {!loading && !error && total > 0 && (
        <Text style={styles.countText}>
          총{" "}
          <Text style={styles.countHighlight}>{total}개</Text>의{" "}
          {DOMAIN_LABEL[domainTyped]}를 찾았어요
        </Text>
      )}

      {/* 리스트 / 로딩 / 에러 / 빈 결과 */}
      {loading ? (
        <ActivityIndicator color="#D97BA0" size="large" style={styles.loader} />
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => search(searchText)} style={styles.retryBtn}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>검색 결과가 없어요</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, idx) => item.external_id ?? String(idx)}
          renderItem={({ item }) => (
            <ContentCard
              item={item}
              domain={domainTyped}
              onPress={() => handleItemPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 동명 콘텐츠 선택 Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          {/* 내부 터치가 닫힘으로 전파되지 않도록 */}
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <Text style={styles.modalTitle}>어떤 콘텐츠인가요?</Text>
            <Text style={styles.modalSubtitle}>
              동일한 제목의 콘텐츠가 여러 개 있어요
            </Text>

            {modalItems.map((item, idx) => {
              const { creator, year, country } = buildMetaLine(item);
              const metaParts = [creator, year, country].filter(Boolean).join(" · ");
              return (
                <TouchableOpacity
                  key={item.external_id ?? idx}
                  style={styles.modalItem}
                  onPress={() => handleModalSelect(item)}
                  activeOpacity={0.7}
                >
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.modalItemThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.modalItemThumb,
                        { backgroundColor: domainColor + "33" },
                      ]}
                    />
                  )}
                  <View style={styles.modalItemText}>
                    <Text style={styles.modalItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {metaParts ? (
                      <Text style={styles.modalItemMeta} numberOfLines={1}>
                        {metaParts}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 지도 생성 중 로딩 오버레이 */}
      {isCreating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#D97BA0" size="large" />
            <Text style={styles.loadingOverlayText}>지도를 생성하는 중...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtn: {
    paddingRight: 4,
  },
  backArrow: {
    fontSize: 22,
    color: "#FFFFFF",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  domainIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },

  // 재검색 바
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151D30",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
  },
  searchBarIcon: {
    width: 44,
    height: 44,
    marginLeft: -8,
    marginRight: -4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
  },

  // 결과 수
  countText: {
    fontSize: 13,
    color: "#8899BB",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  countHighlight: {
    color: "#D97BA0",
    fontWeight: "700",
  },

  // 리스트
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  loader: {
    marginTop: 60,
  },

  // 빈 상태 / 에러
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#4A5568",
  },
  errorText: {
    fontSize: 14,
    color: "#E05C6E",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#1E293B",
    borderRadius: 10,
  },
  retryText: {
    color: "#D97BA0",
    fontWeight: "600",
  },

  // 결과 카드
  card: {
    flexDirection: "row",
    backgroundColor: "#141B2D",
    borderRadius: 14,
    overflow: "hidden",
    gap: 12,
    padding: 12,
  },
  thumbnail: {
    width: 90,
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  genre: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 21,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7A99",
  },
  metaList: {
    marginTop: 4,
    gap: 2,
  },
  metaItem: {
    fontSize: 12,
    color: "#8899BB",
  },
  metaIcon: {
    color: "#4A5A7A",
  },
  metaIconStar: {
    color: "#F4C430",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#151D30",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7A99",
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  modalItemThumb: {
    width: 44,
    height: 60,
    borderRadius: 6,
  },
  modalItemText: {
    flex: 1,
    gap: 4,
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalItemMeta: {
    fontSize: 12,
    color: "#6B7A99",
  },
  modalCancelBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "#1E293B",
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8899BB",
  },

  // 로딩 오버레이
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: "#151D30",
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: "center",
    gap: 16,
  },
  loadingOverlayText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
