import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { HomeStackParamList, RootTabParamList } from "../navigation/types";
import { Map as MapItem } from "../types";
import { mapsAPI } from "../api/endpoints";
import Header from "../components/common/Header";

type NavProp = NativeStackNavigationProp<HomeStackParamList, "HomeMain">;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.65;

type Domain = "movie" | "book" | "music";

const DOMAIN_LABELS: Record<Domain, string> = {
  movie: "영화",
  book: "책",
  music: "음악",
};

const PLACEHOLDER: Record<Domain, string> = {
  movie: "영화 검색하기",
  book: "책 검색하기",
  music: "음악 검색하기",
};

type Stats = {
  totalArchived: number;
  totalMaps: number;
  weeklyNodes: number;
};

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const tabNavigation = useNavigation<TabNavProp>();

  const [selectedDomain, setSelectedDomain] = useState<Domain>("movie");
  const [searchText, setSearchText] = useState("");

  // TODO: API 연동 후 실제 값으로 교체 (GET /api/users/me/stats)
  const [stats] = useState<Stats>({
    totalArchived: 0,
    totalMaps: 0,
    weeklyNodes: 0,
  });

  // 최근 지도 (GET /maps — updated_at DESC 상위 3개)
  const [recentMaps, setRecentMaps] = useState<MapItem[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState(false);

  const fetchRecentMaps = useCallback(async () => {
    setMapsLoading(true);
    setMapsError(false);
    try {
      const res = await mapsAPI.getList();
      const sorted = [...res.data.maps]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3);
      setRecentMaps(sorted);
    } catch {
      setMapsError(true);
    } finally {
      setMapsLoading(false);
    }
  }, []);

  // 화면 포커스될 때마다 최신 데이터 로드
  useFocusEffect(
    useCallback(() => {
      fetchRecentMaps();
    }, [fetchRecentMaps])
  );

  const handleMapCardPress = (mapId: string) => {
    tabNavigation.navigate("Map", { mapId });
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 로고 */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* 검색바 */}
        <View style={styles.searchBar}>
          <Image
            source={require("../../assets/icon-search.png")}
            style={styles.searchIcon}
            resizeMode="contain"
          />
          <TextInput
            style={styles.searchInput}
            placeholder={PLACEHOLDER[selectedDomain]}
            placeholderTextColor="#555577"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (searchText.trim()) {
                navigation.navigate("SearchResult", {
                  domain: selectedDomain,
                  query: searchText.trim(),
                });
              }
            }}
          />
        </View>

        {/* 도메인 pill 탭 */}
        <View style={styles.domainTabs}>
          {(Object.keys(DOMAIN_LABELS) as Domain[]).map((domain) => (
            <TouchableOpacity
              key={domain}
              style={[
                styles.domainPill,
                selectedDomain === domain && styles.domainPillActive,
              ]}
              onPress={() => setSelectedDomain(domain)}
            >
              <Text
                style={[
                  styles.domainPillText,
                  selectedDomain === domain && styles.domainPillTextActive,
                ]}
              >
                {DOMAIN_LABELS[domain]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 통계 카드 */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalArchived}</Text>
            <Text style={styles.statLabel}>총 아카이빙</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalMaps}</Text>
            <Text style={styles.statLabel}>과몰입 지도</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.weeklyNodes}</Text>
            <Text style={styles.statLabel}>이번 주</Text>
          </View>
        </View>

        {/* 최근 아카이빙한 지도 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근에 아카이빙한 지도</Text>
        </View>

        {mapsLoading ? (
          <View style={styles.mapsLoadingContainer}>
            <ActivityIndicator size="small" color="#C084A0" />
          </View>
        ) : (
          <FlatList
            data={recentMaps}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapsListContent}
            ListEmptyComponent={
              <View style={styles.mapCardEmpty}>
                <Text style={styles.mapCardEmptyText}>
                  {mapsError ? "불러오기 실패" : "아직 지도가 없어요"}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.mapCard, index === 0 && styles.mapCardLarge]}
                onPress={() => handleMapCardPress(item.id)}
              >
                {item.last_node?.image_url ? (
                  <Image
                    source={{ uri: item.last_node.image_url }}
                    style={styles.mapCardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.mapCardImageFallback} />
                )}
                <View style={styles.mapCardOverlay}>
                  <Text style={styles.mapCardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.last_node && (
                    <Text style={styles.mapCardSubtitle} numberOfLines={1}>
                      {item.last_node.title}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // 로고
  logoContainer: {
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 0,
    margin: -20,
  },
  logo: {
    width: 280,
    height: 200,
  },

  // 검색바
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1830",
    borderRadius: 30,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  searchIcon: {
    width: 70,
    height: 70,
    marginRight: 0,
    marginLeft: -15,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
  },

  // 도메인 탭
  domainTabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  domainPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#1A1830",
  },
  domainPillActive: {
    backgroundColor: "#C084A0",
  },
  domainPillText: {
    fontSize: 14,
    color: "#AAAACC",
    fontWeight: "600",
  },
  domainPillTextActive: {
    color: "#FFFFFF",
  },

  // 통계 카드
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1A1830",
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#AAAACC",
  },

  // 최근 지도
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  mapsLoadingContainer: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  mapsListContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  mapCard: {
    width: CARD_WIDTH * 0.6,
    height: 180,
    backgroundColor: "#1A1830",
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  mapCardLarge: {
    width: CARD_WIDTH,
  },
  mapCardImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapCardImageFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#252540",
  },
  mapCardOverlay: {
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    gap: 2,
  },
  mapCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  mapCardSubtitle: {
    fontSize: 11,
    color: "#AAAACC",
  },
  mapCardEmpty: {
    width: CARD_WIDTH,
    height: 180,
    backgroundColor: "#1A1830",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mapCardEmptyText: {
    fontSize: 14,
    color: "#555577",
  },
});
