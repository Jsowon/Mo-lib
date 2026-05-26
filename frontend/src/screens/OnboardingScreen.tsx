import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ViewToken,
  Image,
  ImageBackground,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const { width } = Dimensions.get("window");

type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  "Onboarding"
>;

function Slide1() {
  return (
    <View style={styles.slide}>
      <View style={styles.slide1Content}>
        <Image
          source={require("../../assets/rabbit.png")}
          style={styles.rabbitImage}
          resizeMode="contain"
        />
        <View style={styles.slide1TextContainer}>
          <Text style={[styles.slide1Text, { color: "#FFFFFF" }]}>
            당신만의
          </Text>
          <Text style={[styles.slide1Text, { color: "#7D71CD" }]}>취향을</Text>
          <Text style={[styles.slide1Text, { color: "#B97FAC" }]}>
            발견하세요
          </Text>
        </View>
      </View>
    </View>
  );
}

function Slide2() {
  const cards = [
    { title: "맞춤 추천", desc: "AI가 분석하는 당신만의 취향" },
    { title: "취향 아카이브", desc: "나만의 우주 라이브러리 생성" },
    { title: "트렌드 탐색", desc: "새로운 은하를 발견하는 공간" },
  ];

  return (
    <View style={styles.slide}>
      <View style={styles.slide2Header}>
        <Text style={styles.slide2SubTitle}>깊이</Text>
        <Text style={styles.slide2Title}>있는 큐레이션</Text>
      </View>
      <View style={styles.cardsContainer}>
        {cards.map((card, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Slide3({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.slide}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imagePlaceholderText}>Image</Text>
      </View>
      <View style={styles.slide3TextContainer}>
        <Text style={styles.slide3SubTitle}>과몰입의</Text>
        <Text style={styles.slide3Title}>순간들</Text>
        <Text style={styles.quote}>
          {'" '}당신의 관심사 하나하나가 모여, 오직 당신을 위한 우주가
          만들어집니다.{' "'}
        </Text>
        <Text style={styles.quoteAuthor}>— 당신의 취향을 아카이빙</Text>
      </View>
      <TouchableOpacity style={styles.startButton} onPress={onStart}>
        <Text style={styles.startButtonText}>시작하기</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const goToLogin = () => navigation.navigate("Login");

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    },
  ).current;

  const slides = [
    { id: "1", component: <Slide1 /> },
    { id: "2", component: <Slide2 /> },
    { id: "3", component: <Slide3 onStart={goToLogin} /> },
  ];

  return (
    <ImageBackground
      source={require("../../assets/bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      {/* 건너뛰기 */}
      <SafeAreaView style={styles.skipContainer}>
        <TouchableOpacity onPress={goToLogin}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* 슬라이드 */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={{ width }}>{item.component}</View>
        )}
      />

      {/* 페이지 인디케이터 */}
      <SafeAreaView style={styles.indicatorContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080714",
  },
  skipContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 60,
    paddingRight: 24,
  },
  skipText: {
    color: "#AAAACC",
    fontSize: 15,
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
  },

  // 슬라이드 1
  slide1Content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  slide1TextContainer: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: 8,
  },
  slide1Text: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 38,
    textAlign: "right",
  },
  rabbitImage: {
    width: 180,
    height: 180,
  },

  // 슬라이드 2
  slide2Header: {
    marginBottom: 32,
  },
  slide2SubTitle: {
    fontSize: 28,
    color: "#CCCCEE",
    fontWeight: "400",
  },
  slide2Title: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: "rgba(26, 24, 48, 0.85)",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2A2845",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#9B8FFF",
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: "#AAAACC",
  },

  // 슬라이드 3
  imagePlaceholder: {
    width: "100%",
    height: 240,
    backgroundColor: "rgba(200, 200, 216, 0.15)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  imagePlaceholderText: {
    color: "#888",
    fontSize: 18,
  },
  slide3TextContainer: {
    marginBottom: 40,
  },
  slide3SubTitle: {
    fontSize: 28,
    color: "#CCCCEE",
    fontWeight: "400",
  },
  slide3Title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  quote: {
    fontSize: 15,
    color: "#CCCCEE",
    lineHeight: 24,
    marginBottom: 12,
  },
  quoteAuthor: {
    fontSize: 14,
    color: "#9B8FFF",
    fontWeight: "600",
  },
  startButton: {
    backgroundColor: "#4B3FBF",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignSelf: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  // 인디케이터
  indicatorContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#9B8FFF",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#444466",
  },
});
