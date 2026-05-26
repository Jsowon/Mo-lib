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
      await authAPI.register({ email, password, nickname });
      Alert.alert("가입 완료", "회원가입이 완료되었습니다.", [
        { text: "확인", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 400) {
        Alert.alert("가입 실패", "이미 사용 중인 이메일입니다.");
      } else {
        Alert.alert("오류", "회원가입 중 오류가 발생했습니다.");
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
                  placeholderTextColor="#555577"
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
                  placeholderTextColor="#555577"
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
                  placeholderTextColor="#555577"
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
                  placeholderTextColor="#555577"
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
    backgroundColor: "#080714",
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
    color: "#FFFFFF",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#AAAACC",
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
    color: "#AAAACC",
  },
  input: {
    fontSize: 16,
    color: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputLine: {
    height: 1,
    backgroundColor: "#333355",
  },
  button: {
    backgroundColor: "#C084A0",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: {
    color: "#AAAACC",
    fontSize: 14,
  },
  link: {
    color: "#9B8FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
