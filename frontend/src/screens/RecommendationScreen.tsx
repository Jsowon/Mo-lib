// @ts-nocheck
// DEPRECATED: 이 화면은 사용되지 않습니다.
// 추천 플로우는 MapCanvas 내부에서 처리됩니다.

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
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { recommendationAPI, mapsAPI, nodesAPI } from "../api/endpoints";
import { RecommendationItem, Domain, Map as MapType } from "../types";
import { HomeStackParamList, RootTabParamList } from "../navigation/types";

// ── 네비게이션 타입 ───────────────────────────────────────────────────────────
type RoutePropType = RouteProp<HomeStackParamList, "Recommendation">;
type NavPropType = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, "Recommendation">,
  BottomTabNavigationProp<RootTabParamList>
>;

// ── 상수 ─────────────────────────────────────────────────────────────────────
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

// ── 추천 카드 컴포넌트 ────────────────────────────────────────────────────────
function RecommendationCard({
  item,
  onPress,
}: {
  item: RecommendationItem;
  onPress: () => void;
}) {
  const domainColor = DOMAIN_COLOR[item.domain];

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
        <Text style={[styles.domainBadge, { color: domainColor }]}>
          {DOMAIN_LABEL[item.domain]}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.cardReason} numberOfLines={2}>
          💡 {item.reason}
        </Text>
        {item.emotion_tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.emotion_tags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {item.emotion_tags.length > 3 && (
              <Text style={styles.tagMore}>+{item.emotion_tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────────────────────────
export default function RecommendationScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavPropType>();
  const insets = useSafeAreaInsets();

  const { item } = route.params;

  // 상태 관리
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [cached, setCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RecommendationItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mapList, setMapList] = useState<MapType[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  // ── API: 추천 가져오기 ────────────────────────────────────────────────────
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await recommendationAPI.get({
        node_id: item.external_id,
        title: item.title,
        domain: item.domain,
      });
      setRecommendations(res.data.recommendations ?? []);
      setCached(res.data.cached ?? false);
    } catch (err) {
      setError("추천을 불러오는 중 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [item]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // ── 카드 선택 → Modal 표시 + 지도 목록 조회 ───────────────────────────────
  const handleCardPress = async (recommendationItem: RecommendationItem) => {
    setSelectedItem(recommendationItem);
    setModalVisible(true);

    // 기존 지도 목록 조회
    try {
      const res = await mapsAPI.getList();
      const maps = res.data.maps ?? [];
      setMapList(maps);
      // 기본 선택값: 첫 번째 지도 (있으면)
      if (maps.length > 0) {
        setSelectedMapId(maps[0].id);
      } else {
        setSelectedMapId(null);
      }
    } catch {
      // 지도 목록 조회 실패 시 빈 목록으로 처리 (새 지도 생성으로 fallback)
      setMapList([]);
      setSelectedMapId(null);
    }
  };

  // ── Modal: 확정 버튼 → 노드 추가 API 호출 ─────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedItem) return;

    setIsConfirming(true);
    try {
      let mapId: string;

      // 지도 선택 로직: selectedMapId가 "new"이거나 null이면 새 지도 생성
      if (selectedMapId === "new" || selectedMapId === null) {
        const mapRes = await mapsAPI.create({ title: item.title });
        mapId = mapRes.data.id;
      } else {
        // 기존 지도 재사용
        mapId = selectedMapId;
      }

      // 노드 추가
      await nodesAPI.add(mapId, {
        source_node_id: null,
        title: selectedItem.title,
        domain: selectedItem.domain,
        description: selectedItem.description,
        image_url: selectedItem.image_url,
        emotion_tags: selectedItem.emotion_tags,
        external_id: selectedItem.external_id,
        metadata: selectedItem.metadata,
      });

      setModalVisible(false);
      // Map 탭으로 이동
      navigation.navigate("Map", { mapId });
    } catch (err: any) {
      Alert.alert(
        "오류",
        err.message || "노드 추가 중 오류가 발생했어요. 다시 시도해 주세요."
      );
    } finally {
      setIsConfirming(false);
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
          <Text style={styles.headerTitle} numberOfLines={1}>
            "{item.title}" 추천
          </Text>
        </View>
      </View>

      {/* 로딩 / 에러 / 결과 */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#D97BA0" size="large" />
          <Text style={styles.loadingText}>추천을 불러오는 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchRecommendations} style={styles.retryBtn}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>추천 결과가 없어요</Text>
        </View>
      ) : (
        <>
          {/* 캐시 배지 */}
          {cached && (
            <View style={styles.cacheBadge}>
              <Text style={styles.cacheBadgeText}>⚡ 캐시된 결과입니다</Text>
            </View>
          )}

          {/* 추천 카드 목록 */}
          <FlatList
            data={recommendations}
            keyExtractor={(recommendationItem, idx) =>
              recommendationItem.external_id ?? String(idx)
            }
            renderItem={({ item: recommendationItem }) => (
              <RecommendationCard
                item={recommendationItem}
                onPress={() => handleCardPress(recommendationItem)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* 확정 Modal */}
      {selectedItem && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => !isConfirming && setModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => !isConfirming && setModalVisible(false)}
          >
            <Pressable style={styles.modalBox} onPress={() => {}}>
              <Text style={styles.modalTitle}>이 콘텐츠를 선택하시겠어요?</Text>

              {/* 선택된 아이템 정보 */}
              <View style={styles.modalItemInfo}>
                {selectedItem.image_url ? (
                  <Image
                    source={{ uri: selectedItem.image_url }}
                    style={styles.modalThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.modalThumb,
                      { backgroundColor: DOMAIN_COLOR[selectedItem.domain] + "33" },
                    ]}
                  />
                )}
                <View style={styles.modalItemText}>
                  <Text style={styles.modalItemTitle} numberOfLines={2}>
                    {selectedItem.title}
                  </Text>
                  {selectedItem.emotion_tags.length > 0 && (
                    <View style={styles.modalTagsRow}>
                      {selectedItem.emotion_tags.slice(0, 4).map((tag, idx) => (
                        <View key={idx} style={styles.modalTagChip}>
                          <Text style={styles.modalTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* 지도 선택 (지도가 1개 이상 있을 때만 표시) */}
              {mapList.length > 0 && (
                <View style={styles.mapSelectionSection}>
                  <Text style={styles.mapSelectionLabel}>지도 선택</Text>
                  {mapList.map((map) => (
                    <TouchableOpacity
                      key={map.id}
                      style={[
                        styles.mapOption,
                        selectedMapId === map.id && styles.mapOptionSelected,
                      ]}
                      onPress={() => setSelectedMapId(map.id)}
                      disabled={isConfirming}
                    >
                      <View style={styles.mapOptionRadio}>
                        {selectedMapId === map.id && (
                          <View style={styles.mapOptionRadioInner} />
                        )}
                      </View>
                      <Text style={styles.mapOptionText} numberOfLines={1}>
                        {map.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.mapOption,
                      selectedMapId === "new" && styles.mapOptionSelected,
                    ]}
                    onPress={() => setSelectedMapId("new")}
                    disabled={isConfirming}
                  >
                    <View style={styles.mapOptionRadio}>
                      {selectedMapId === "new" && (
                        <View style={styles.mapOptionRadioInner} />
                      )}
                    </View>
                    <Text style={styles.mapOptionText}>+ 새 지도 생성</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 버튼 */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setModalVisible(false)}
                  disabled={isConfirming}
                >
                  <Text style={styles.modalBtnTextCancel}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={handleConfirm}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalBtnTextConfirm}>이 콘텐츠로 확정</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // 중앙 상태 (로딩/에러/빈 결과)
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7A99",
  },
  emptyText: {
    fontSize: 15,
    color: "#4A5568",
  },
  errorText: {
    fontSize: 14,
    color: "#E05C6E",
    textAlign: "center",
    paddingHorizontal: 32,
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

  // 캐시 배지
  cacheBadge: {
    backgroundColor: "#2A3B4D",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 8,
  },
  cacheBadgeText: {
    fontSize: 13,
    color: "#8899BB",
    textAlign: "center",
  },

  // 리스트
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },

  // 추천 카드
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
    height: 130,
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
    justifyContent: "flex-start",
    gap: 6,
  },
  domainBadge: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 21,
  },
  cardDescription: {
    fontSize: 12,
    color: "#8899BB",
    lineHeight: 17,
  },
  cardReason: {
    fontSize: 12,
    color: "#C084A0",
    lineHeight: 17,
    fontStyle: "italic",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: "#D97BA0",
  },
  tagMore: {
    fontSize: 11,
    color: "#6B7A99",
    alignSelf: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#151D30",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginHorizontal: 32,
    minWidth: 300,
    gap: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  modalItemInfo: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  modalThumb: {
    width: 60,
    height: 80,
    borderRadius: 8,
  },
  modalItemText: {
    flex: 1,
    gap: 8,
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 21,
  },
  modalTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  modalTagChip: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalTagText: {
    fontSize: 10,
    color: "#D97BA0",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: "#1E293B",
  },
  modalBtnConfirm: {
    backgroundColor: "#C084A0",
  },
  modalBtnTextCancel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8899BB",
  },
  modalBtnTextConfirm: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // 지도 선택
  mapSelectionSection: {
    gap: 8,
  },
  mapSelectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8899BB",
    marginBottom: 4,
  },
  mapOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  mapOptionSelected: {
    borderColor: "#C084A0",
  },
  mapOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#4A5568",
    alignItems: "center",
    justifyContent: "center",
  },
  mapOptionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#C084A0",
  },
  mapOptionText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
