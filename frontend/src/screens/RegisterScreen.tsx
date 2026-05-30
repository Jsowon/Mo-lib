import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authAPI } from "../api/endpoints";
import { Colors } from "../constants/colors";

type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // 유효성 검사
    if (!email || !password || !passwordConfirm || !nickname) {
      Alert.alert("알림", "모든 항목을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("알림", "올바른 이메일 형식을 입력해주세요.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("알림", "비밀번호는 8자 이상 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert("알림", "비밀번호가 일치하지 않습니다.");
      return;
    }

    if (nickname.trim().length === 0) {
      Alert.alert("알림", "닉네임을 입력해주세요.");
      return;
    }

    if (nickname.length > 30) {
      Alert.alert("알림", "닉네임은 30자 이하로 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      const response = await authAPI.register({ email, password, nickname });

      Alert.alert("가입 완료", "회원가입이 완료되었습니다.", [
        { text: "확인", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err: any) {

      const status = err.response?.status;
      const errorDetail = err.response?.data?.detail;

      if (status === 400) {
        const errorMsg = typeof errorDetail === 'string'
          ? errorDetail
          : "이미 사용 중인 이메일입니다.";
        Alert.alert("가입 실패", errorMsg);
      } else if (status === 422) {
        // 유효성 검증 오류
        const errorMsg = typeof errorDetail === 'string'
          ? errorDetail
          : "입력 정보를 확인해주세요.";
        Alert.alert("입력 오류", errorMsg);
      } else if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        Alert.alert("네트워크 오류", `서버 연결에 실패했습니다.\n서버 URL: ${process.env.EXPO_PUBLIC_API_BASE_URL}`);
      } else {
        const errorMsg = errorDetail
          ? (typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail))
          : "알 수 없는 오류가 발생했습니다.";
        Alert.alert(
          "오류",
          `회원가입 중 오류가 발생했습니다.\n\n상태 코드: ${status || '없음'}\n에러: ${errorMsg}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/auth-bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.title}>회원가입</Text>
              <Text style={styles.subtitle}>
                Mo:lib에서 당신만의 취향을 시작하세요
              </Text>
            </View>

            {/* 입력 폼 */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>이메일</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.text.dusk}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.inputLine} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>닉네임</Text>
                <TextInput
                  style={styles.input}
                  placeholder="앱에서 사용할 닉네임을 입력하세요"
                  placeholderTextColor={Colors.text.dusk}
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={30}
                  autoCorrect={false}
                />
                <View style={styles.inputLine} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8자 이상 입력하세요"
                  placeholderTextColor={Colors.text.dusk}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <View style={styles.inputLine} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 다시 입력하세요"
                  placeholderTextColor={Colors.text.dusk}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  secureTextEntry
                />
                <View style={styles.inputLine} />
              </View>
            </View>

            {/* 회원가입 버튼 */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "가입 중..." : "회원가입 →"}
              </Text>
            </TouchableOpacity>

            {/* 로그인 링크 */}
            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>이미 계정이 있으신가요? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.link}>로그인</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.void,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.text.starlight,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.moonmist,
    textAlign: "center",
  },
  form: {
    gap: 28,
    marginBottom: 40,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    color: Colors.text.moonmist,
  },
  input: {
    fontSize: 16,
    color: Colors.text.starlight,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputLine: {
    height: 1,
    backgroundColor: Colors.accent.orbit,
  },
  button: {
    backgroundColor: Colors.accent.nebulaRose,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text.starlight,
    fontSize: 17,
    fontWeight: "700",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: {
    color: Colors.text.moonmist,
    fontSize: 14,
  },
  link: {
    color: Colors.accent.aurora,
    fontSize: 14,
    fontWeight: "600",
  },
});
