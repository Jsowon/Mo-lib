/**
 * TODO (파트 B): AI 추천 플로우 화면
 *
 * 이 파일은 파트 B 구현 시 통째로 교체하세요.
 * 네비게이션 진입점:  HomeStack  "Recommendation"  route
 * 받는 params:       { item: ContentItem }   — navigation/types.ts 참고
 */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HomeStackParamList } from "../navigation/types";

type RoutePropType = RouteProp<HomeStackParamList, "Recommendation">;
type NavPropType = NativeStackNavigationProp<HomeStackParamList, "Recommendation">;

export default function RecommendationScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavPropType>();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>파트 B 구현 예정</Text>
      <Text style={styles.title}>{route.params.item.title}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← 돌아가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0E1A", alignItems: "center", justifyContent: "center", gap: 12 },
  label:     { fontSize: 12, color: "#4A5568", letterSpacing: 1 },
  title:     { fontSize: 22, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingHorizontal: 32 },
  back:      { fontSize: 14, color: "#D97BA0", marginTop: 8 },
});
